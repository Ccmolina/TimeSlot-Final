import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface Medico {
  id: number;
  name: string;
  last: string;
  email: string;
  phone: string;
}

export default function GestionMedicosScreen() {
  const router = useRouter(); 
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  useEffect(() => {
    obtenerMedicos();
  }, []);

  const obtenerMedicos = async () => {
    try {
      const data = await api("/api/usuarios", { method: "GET" });

      setMedicos(
        data.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          last: m.last,
          email: m.email,
          phone: m.phone,
        }))
      );
    } catch (error) {
      console.log("[API] Error obteniendo médicos:", error);
    }
  };

  const guardarMedico = async () => {
    if (!name || !last || !email || (!editandoId && !password) || !phone) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const body = {
        name,
        last,
        email,
        phone,
        role: "medico",
        ...(editandoId ? {} : { password }),
      };

      if (editandoId) {
        await api(`/api/usuarios/${editandoId}`, {
          method: "PUT",
          body,
        });
      } else {
        await api("/api/usuarios", {
          method: "POST",
          body,
        });
      }

      Alert.alert("Éxito", editandoId ? "Médico actualizado" : "Médico creado");
      limpiarFormulario();
      obtenerMedicos();
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setName("");
    setLast("");
    setEmail("");
    setPassword("");
    setPhone("");
    setEditandoId(null);
  };

  const editarMedico = (m: Medico) => {
    setEditandoId(m.id);
    setName(m.name);
    setLast(m.last);
    setEmail(m.email);
    setPhone(m.phone);
    setPassword("");
  };

  const eliminarMedico = async (id: number) => {
    const confirmar = Platform.OS === "web"
      ? window.confirm("¿Eliminar este médico?")
      : await new Promise(resolve => {
          Alert.alert("Confirmar", "¿Eliminar este médico?", [
            { text: "Cancelar", onPress: () => resolve(false) },
            { text: "Eliminar", onPress: () => resolve(true) },
          ]);
        });

    if (!confirmar) return;

    try {
      await api(`/api/usuarios/${id}`, { method: "DELETE" });

      setMedicos(prev => prev.filter(m => m.id !== id));
      Alert.alert("Eliminado", "Médico eliminado");
    } catch {
      Alert.alert("Error", "No se pudo conectar con el servidor");
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png" }}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.h1}>Gestión de Médicos</Text>
        <Text style={s.h2}>{editandoId ? "Editar médico" : "Agregar nuevo profesional"}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 100 }}>
          <View style={s.card}>
            <Text style={s.title}>{editandoId ? "Editar Médico" : "Crear Médico"}</Text>

            <TextInput style={s.input} placeholder="Nombre" value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Apellido" value={last} onChangeText={setLast} />
            <TextInput
              style={s.input}
              placeholder="Correo"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            {!editandoId && (
              <TextInput
                style={s.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            )}

            <TextInput
              style={s.input}
              placeholder="Teléfono"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TouchableOpacity style={s.primaryBtn} onPress={guardarMedico} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {editandoId ? "Actualizar" : "Crear Médico"}
                </Text>
              )}
            </TouchableOpacity>

            {editandoId && (
              <TouchableOpacity onPress={limpiarFormulario} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancelar edición</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginTop: 30, width: 340 }}>
            <Text style={s.title}>Lista de Médicos</Text>
            {medicos.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#777" }}>No hay médicos registrados</Text>
            ) : (
              medicos.map((m) => (
                <View key={m.id} style={s.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{m.name} {m.last}</Text>
                    <Text style={s.itemEmail}>{m.email}</Text>
                    <Text style={s.itemPhone}>{m.phone}</Text>
                  </View>

                  <TouchableOpacity onPress={() => editarMedico(m)} style={s.editBtn}>
                    <Text style={s.editText}>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => eliminarMedico(m.id)} style={s.deleteBtn}>
                    <Text style={s.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

export const s = StyleSheet.create({
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
  h1: { color: "#fff", fontSize: 30, fontWeight: "800" },
  h2: { color: "#E6F1F4", fontSize: 15, fontWeight: "600", marginTop: 4 },
  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#0E3A46",
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#0E3A46",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  cancelBtn: { marginTop: 8, alignItems: "center", paddingVertical: 6 },
  cancelBtnText: { color: "#0E3A46", fontWeight: "600" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemName: { fontWeight: "700", color: "#111" },
  itemEmail: { color: "#555" },
  itemPhone: { color: "#777" },
  editBtn: { marginHorizontal: 8 },
  deleteBtn: {},
  editText: { fontSize: 18 },
  deleteText: { fontSize: 18 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#0E3A46",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomBtn: { flex: 1, alignItems: "center" },
  bottomIcon: { fontSize: 24, color: "#fff" },
  bottomLeft: {
    position: "absolute",
    bottom: 0,
    left: -10,
    width: 90,
    height: 80,
    backgroundColor: "#0E3A46",
    borderTopRightRadius: 80,
  },
  bottomRight: {
    position: "absolute",
    bottom: 0,
    right: -10,
    width: 90,
    height: 80,
    backgroundColor: "#0E3A46",
    borderTopLeftRadius: 80,
  },
});
