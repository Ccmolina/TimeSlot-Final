import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../lib/api';
import { useRouter } from "expo-router";

type Servicio = {
  servicio_id: number;
  negocio_id: number;
  user_id: number | null;
  nombre: string;
  descripcion: string;
  duracion_min: number;
};

type Medico = {
  usuario_id: number;
  nombre_usuario: string;
  apellido: string;
};

export default function AsignacionesScreen() {
  const router = useRouter(); 
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedMedicos, setSelectedMedicos] = useState<{ [key: number]: number }>({});

  const fetchServicios = async () => {
    try {
      const res = await api<{ ok: boolean; data: Servicio[] }>('/api/servicios');
      if (res.ok) {
        setServicios(res.data);
        const initial: { [key: number]: number } = {};
        res.data.forEach((s) => { initial[s.servicio_id] = s.user_id || 0; });
        setSelectedMedicos(initial);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    }
  };

  const fetchMedicos = async () => {
    try {
      const res = await api<{ ok: boolean; data: Medico[] }>('/api/servicios/medicos');
      if (res.ok) setMedicos(res.data);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar los médicos');
    }
  };

  useEffect(() => {
    fetchServicios();
    fetchMedicos();
  }, []);

  const asignarMedico = async (servicio_id: number) => {
    const usuario_id = selectedMedicos[servicio_id];
    if (!usuario_id || usuario_id === 0) { Alert.alert('Error', 'Seleccione un médico'); return; }
    try {
      const res = await api<{ ok: boolean; msg: string }>('/api/servicios/asignar', {
        method: 'PUT',
        body: { servicio_id, usuario_id },
      });
      if (res.ok) { Alert.alert('Éxito', res.msg || 'Médico asignado correctamente'); fetchServicios(); }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo asignar el médico');
    }
  };

  const renderItem = ({ item }: { item: Servicio }) => {
    const medicoAsignado = medicos.find((m) => m.usuario_id === item.user_id);
    return (
      <View style={s.card}>
        <Text style={s.title}>{item.nombre}</Text>
        <Text style={s.text}>{item.descripcion}</Text>
        <Text style={s.text}>Duración: {item.duracion_min} min</Text>

        <Text style={s.text}>
          Médico actual: <Text style={s.highlight}>{medicoAsignado ? `${medicoAsignado.nombre_usuario} ${medicoAsignado.apellido}` : "Sin asignar"}</Text>
        </Text>

        <Picker
          selectedValue={selectedMedicos[item.servicio_id]}
          onValueChange={(value) => setSelectedMedicos((prev) => ({ ...prev, [item.servicio_id]: value }))}
          style={s.picker}
        >
          <Picker.Item label="No asignado" value={0} />
          {medicos.map((m) => (
            <Picker.Item key={m.usuario_id} value={m.usuario_id} label={`${m.nombre_usuario} ${m.apellido}`} />
          ))}
        </Picker>

        <View style={s.btnContainer}>
          <Button title="Asignar Médico" color="#0E3A46" onPress={() => asignarMedico(item.servicio_id)} />
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Image source={{ uri: '' }} style={s.logo} resizeMode="contain" />
        <Text style={s.h1}>Asignaciones</Text>
        <Text style={s.h2}>de Servicios</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingBottom: 120 }}>
        <FlatList
          data={servicios}
          keyExtractor={(item) => item.servicio_id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={s.text}>No hay servicios disponibles</Text>}
        />
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity onPress={() => router.replace("/admin/InformesScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>📊</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/CrearMedicoScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>👨‍⚕️</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/CrearServiciosScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>🏥</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/admin/AsignacionScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>🗂️</Text>
        </TouchableOpacity>
      </View>

      <View style={s.bottomLeft} />
      <View style={s.bottomRight} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },

  header: { backgroundColor: '#0E3A46', width: '130%', height: 200, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 300, borderBottomRightRadius: 300 },

  logo: { width: 64, height: 64, marginBottom: 6 },
  h1: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  h2: { color: '#E6F1F4', fontSize: 16, fontWeight: '700' },

  card: { width: 340, backgroundColor: '#fff', marginVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, alignSelf: 'center' },

  title: { color: '#0E3A46', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  text: { color: '#111827', fontSize: 14, marginBottom: 2 },
  highlight: { fontWeight: '700', color: '#0E3A46' },

  picker: { backgroundColor: '#F9FAFB', borderRadius: 8, marginVertical: 8 },
  btnContainer: { marginTop: 8 },

  bottomLeft: { position: 'absolute', bottom: 0, left: -10, width: 90, height: 80, backgroundColor: '#0E3A46', borderTopRightRadius: 80 },
  bottomRight: { position: 'absolute', bottom: 0, right: -10, width: 90, height: 80, backgroundColor: '#0E3A46', borderTopLeftRadius: 80 },

  bottomBar: { position: 'absolute', bottom: 0, flexDirection: 'row', justifyContent: 'space-around', width: '100%', backgroundColor: '#0E3A46', paddingVertical: 10 },
  bottomBtn: { alignItems: 'center', justifyContent: 'center' },
  bottomIcon: { fontSize: 24, color: '#fff' },
});
