import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { useRouter } from "expo-router";

interface Servicio {
  servicio_id: number;
  nombre_servicio: string;
  descripcion: string;
  duracion_min: number;
}

export default function GestionServiciosScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState("");
  const [loading, setLoading] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [negocioId] = useState<number>(1);

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    try {
      const res = await api<{ ok: boolean; data: Servicio[] }>("/api/servicios");
      if (res.ok) setServicios(res.data);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "No se pudieron cargar los servicios");
    }
  }

  const guardarServicio = async () => {
    if (!nombre || !descripcion || !duracion) {
      Alert.alert("Error", "Complete todos los campos");
      return;
    }

    try {
      setLoading(true);

      const body = editandoId
        ? { nombre_servicio: nombre, descripcion, duracion_min: Number(duracion) }
        : { negocio_id: negocioId, nombre_servicio: nombre, descripcion, duracion_min: Number(duracion) };

      const url = editandoId ? `/api/servicios/${editandoId}` : "/api/servicios";
      const method = editandoId ? "PUT" : "POST";

      const res = await api<{ ok: boolean; data: Servicio }>(url, { method, body });

      if (res.ok) {
        Alert.alert("Éxito", editandoId ? "Servicio actualizado" : "Servicio creado");
        limpiarFormulario();
        cargarServicios();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo guardar el servicio");
    } finally {
      setLoading(false);
    }
  };

  const eliminarServicio = async (id: number) => {
    let confirmacion = false;
    if (typeof window !== "undefined") {
      confirmacion = window.confirm("¿Eliminar este servicio?");
    } else {
      confirmacion = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Confirmar",
          "¿Eliminar este servicio?",
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });
    }
    if (!confirmacion) return;

    try {
      const res = await api<{ ok: boolean; msg?: string; message?: string; error?: string }>(`/api/servicios/${id}`, { method: "DELETE" });
      if (res.ok) {
        Alert.alert("Eliminado", res.message ?? res.msg ?? "Servicio eliminado correctamente");
        setServicios((prev) => prev.filter((s) => s.servicio_id !== id));
      } else {
        Alert.alert("Error", res.error ?? "No se pudo eliminar el servicio");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo conectar con el servidor");
    }
  };

  const editarServicio = (s: Servicio) => {
    setEditandoId(s.servicio_id);
    setNombre(s.nombre_servicio);
    setDescripcion(s.descripcion);
    setDuracion(String(s.duracion_min));
  };

  const limpiarFormulario = () => {
    setNombre("");
    setDescripcion("");
    setDuracion("");
    setEditandoId(null);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Gestión de Servicios</Text>
        <Text style={s.h2}>{editandoId ? "Editar servicio" : "Crear nuevo servicio"}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.label}>Nombre:</Text>
            <TextInput style={s.input} placeholder="Ej: Odontología" value={nombre} onChangeText={setNombre} />

            <Text style={s.label}>Descripción:</Text>
            <TextInput style={[s.input, { height: 80 }]} placeholder="Detalle del servicio" value={descripcion} onChangeText={setDescripcion} multiline />

            <Text style={s.label}>Duración (min):</Text>
            <TextInput style={s.input} placeholder="Ej: 30" value={duracion} onChangeText={setDuracion} keyboardType="numeric" />

            <TouchableOpacity style={s.primaryBtn} onPress={guardarServicio} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>{editandoId ? "Actualizar" : "Crear Servicio"}</Text>}
            </TouchableOpacity>

            {editandoId && (
              <TouchableOpacity onPress={limpiarFormulario} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancelar edición</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginTop: 30, width: 340 }}>
            <Text style={s.title}>Lista de Servicios</Text>
            {servicios.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#777" }}>No hay servicios registrados</Text>
            ) : (
              servicios.map((servicio) => (
                <View key={servicio.servicio_id} style={s.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{servicio.nombre_servicio}</Text>
                    <Text style={s.itemDesc}>{servicio.descripcion}</Text>
                    <Text style={s.itemDesc}>Duración: {servicio.duracion_min} min</Text>
                  </View>

                  <TouchableOpacity onPress={() => editarServicio(servicio)} style={s.editBtn}>
                    <Text style={s.editText}>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => eliminarServicio(servicio.servicio_id)} style={s.deleteBtn}>
                    <Text style={s.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar */}
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
  logo: { width: 64, height: 64, marginBottom: 6 },
  h1: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  h2: { color: "#E6F1F4", fontSize: 16, fontWeight: "700", marginTop: 4 },
  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: { color: "#0E3A46", fontWeight: "700", marginBottom: 6 },
  input: { height: 42, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 12, color: "#111827", backgroundColor: "#F9FAFB", marginBottom: 12 },
  primaryBtn: { backgroundColor: "#0E3A46", paddingVertical: 12, borderRadius: 10, marginTop: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  cancelBtn: { marginTop: 8, alignItems: "center", paddingVertical: 6 },
  cancelBtnText: { color: "#0E3A46", fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center", color: "#0E3A46" },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", padding: 12, borderRadius: 10, marginBottom: 10 },
  itemName: { fontWeight: "700", color: "#111" },
  itemDesc: { color: "#555" },
  editBtn: { marginHorizontal: 8 },
  deleteBtn: {},
  editText: { fontSize: 18 },
  deleteText: { fontSize: 18 },
  bottomLeft: { position: "absolute", bottom: 0, left: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopRightRadius: 80 },
  bottomRight: { position: "absolute", bottom: 0, right: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopLeftRadius: 80 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "#0E3A46",
    paddingVertical: 10,
  },
  bottomBtn: { alignItems: "center", justifyContent: "center" },
  bottomIcon: { fontSize: 24, color: "#fff" },
});
