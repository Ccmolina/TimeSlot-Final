import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { api } from "../../lib/api";

interface Horario {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  abierto: boolean;
}

interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
}

export default function HorarioServicioScreen() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [h, s] = await Promise.all([
          api<Horario[]>("/api/horarios?user_id=1"),
          api<Servicio[]>("/api/servicios?user_id=1")
        ]);
        setHorarios(Array.isArray(h) ? h : []);
        setServicios(Array.isArray(s) ? s : []);
      } catch (err: any) {
        Alert.alert("Error", err.message || "No se pudieron cargar los datos");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleAbierto = (id: number, value: boolean) => {
    setHorarios(prev => prev.map(h => h.id === id ? { ...h, abierto: value } : h));
  };

  const handleChangeHora = (id: number, campo: "hora_inicio" | "hora_fin", valor: string) => {
    setHorarios(prev => prev.map(h => h.id === id ? { ...h, [campo]: valor } : h));
  };

  const sumarMinutos = (hora: string, minutos: number) => {
    const [h, m, s] = hora.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m + minutos, s);
    return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
  };

  const generarFranjas = async () => {
    try {
      const franjas: any[] = [];
      const hoy = new Date();

      for (let i = 0; i < 7; i++) {
        const dia = new Date();
        dia.setDate(hoy.getDate() + i);
        const diaNum = dia.getDay();

        const horariosDelDia = horarios.filter(h => {
          const map: Record<string, number> = {
            domingo: 0, lunes: 1, martes: 2, miércoles: 3,
            jueves: 4, viernes: 5, sábado: 6
          };
          return h.abierto && map[h.dia_semana] === diaNum;
        });

        for (const h of horariosDelDia) {
          for (const s of servicios) {
            let horaActual = h.hora_inicio;
            while (horaActual < h.hora_fin) {
              const horaFin = sumarMinutos(horaActual, s.duracion_min);
              if (horaFin > h.hora_fin) break;
              franjas.push({
                servicio_id: s.id,
                horario_id: h.id,
                fecha: dia.toISOString().slice(0,10),
                hora_inicio: horaActual,
                hora_fin: horaFin
              });
              horaActual = horaFin;
            }
          }
        }
      }

      await api("/api/horario_servicio/generar-franjas", { method: "POST", body: franjas });
      Alert.alert("Éxito", "Franjas generadas correctamente");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudieron generar franjas");
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await api("/api/horarios", { method: "PUT", body: horarios });
      Alert.alert("Éxito", "Horarios guardados correctamente");
      await generarFranjas();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Horario</Text>
        <Text style={s.h2}>de tu Servicio</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>🕓 Configura tus horarios y genera franjas</Text>

            {horarios.map(h => (
              <View key={h.id} style={s.dayCard}>
                <Text style={s.dayTitle}>{h.dia_semana.toUpperCase()}</Text>

                <View style={s.row}>
                  <Text style={s.label}>{h.abierto ? "Abierto" : "Cerrado"}:</Text>
                  <Switch value={h.abierto} onValueChange={v => handleToggleAbierto(h.id,v)} />
                </View>

                {h.abierto && (
                  <>
                    <View style={s.row}>
                      <Text style={s.label}>Inicio:</Text>
                      <TextInput style={s.input} value={h.hora_inicio} onChangeText={v => handleChangeHora(h.id,"hora_inicio",v)} />
                    </View>
                    <View style={s.row}>
                      <Text style={s.label}>Fin:</Text>
                      <TextInput style={s.input} value={h.hora_fin} onChangeText={v => handleChangeHora(h.id,"hora_fin",v)} />
                    </View>
                  </>
                )}
              </View>
            ))}

            <TouchableOpacity style={s.primaryBtn} onPress={handleGuardar} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Guardar y Generar Franjas</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.bottomLeft} />
      <View style={s.bottomRight} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  header: {
    backgroundColor: "#0E3A46",
    width: "130%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  h1: { color: "#fff", fontSize: 36, fontWeight: "800", letterSpacing: 0.3 },
  h2: { color: "#E6F1F4", fontSize: 16, fontWeight: "700", marginTop: 2 },
  card: { width: 340, backgroundColor: "#fff", marginTop: 50, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0E3A46", marginBottom: 12, textAlign: "center" },
  dayCard: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  dayTitle: { fontWeight: "700", color: "#0E3A46", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 4 },
  label: { color: "#0E3A46", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", padding: 6, width: 100, textAlign: "center", borderRadius: 8 },
  primaryBtn: { backgroundColor: "#0E3A46", paddingVertical: 12, borderRadius: 10, marginTop: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  bottomLeft: { position: "absolute", bottom: 0, left: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopRightRadius: 80 },
  bottomRight: { position: "absolute", bottom: 0, right: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopLeftRadius: 80 },
});
