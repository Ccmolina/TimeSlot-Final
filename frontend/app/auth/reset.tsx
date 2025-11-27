
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../lib/api";

export default function Reset() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  const onReset = async () => {
    if (!token) {
      return alert("Falta el token de recuperación.");
    }
    if (!password || !password2) {
      return alert("Completa ambos campos de contraseña.");
    }
    if (password !== password2) {
      return alert("Las contraseñas no coinciden.");
    }

    try {
      setLoading(true);
      await api("/api/auth/reset", {
        method: "POST",
        body: { token, password },
        withAuth: false,
      });
      alert("Contraseña actualizada. Ahora puedes iniciar sesión.");
      router.replace("/auth/login");
    } catch (e: any) {
      alert(e?.message || "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Bienvenido</Text>
        <Text style={s.h2}>a TimeSlot</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView
          contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            <Text style={s.title}>Restablecer contraseña</Text>
            <Text style={s.msg}>
              Ingresa tu nueva contraseña para continuar.
            </Text>

            <Text style={[s.label, { marginTop: 12 }]}>Nueva contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={s.input}
              placeholder="********"
              placeholderTextColor="#9AA3AF"
            />

            <Text style={[s.label, { marginTop: 12 }]}>
              Repite la contraseña
            </Text>
            <TextInput
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
              style={s.input}
              placeholder="********"
              placeholderTextColor="#9AA3AF"
            />

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={onReset}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>
                {loading ? "Guardando..." : "Confirmar"}
              </Text>
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
  h1: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.3,
    fontFamily: Platform.select({
      ios: "Times New Roman",
      android: "serif",
      default: "serif",
    }),
  },
  h2: { color: "#E6F1F4", fontSize: 16, fontWeight: "700", marginTop: 2 },
  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 50,
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
  title: {
    color: "#0E3A46",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  msg: {
    color: "#374151",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  label: { color: "#0E3A46", fontWeight: "700", marginBottom: 6 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#111827",
  },
  primaryBtn: {
    backgroundColor: "#0E3A46",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
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
