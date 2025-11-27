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
import { router } from "expo-router";
import { api } from "../../lib/api";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onForgot = async () => {
    if (!email.trim()) return alert("Ingresa tu correo");

    try {
      setLoading(true);

      await api("/api/auth/forgot", {
        method: "POST",
        withAuth: false,
        body: { email: email.trim() },
      });

      router.replace("/auth/forgot-success");
    } catch (e: any) {
      alert(e?.message || "Error enviando el correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Recuperar contraseña</Text>
        <Text style={s.h2}>Ingresa tu correo</Text>
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
            <Text style={s.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={s.msg}>
              Te enviaremos un <Text style={{ fontWeight: "bold" }}>código de recuperación</Text> a tu correo.
            </Text>

            <Text style={s.label}>Correo:</Text>
            <TextInput
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={s.input}
              placeholderTextColor="#9AA3AF"
            />

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={onForgot}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>
                {loading ? "Enviando..." : "Enviar código"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  h1: { color: "#fff", fontSize: 26, fontWeight: "800" },
  h2: { color: "#E6F1F4", fontSize: 14, fontWeight: "600" },

  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    elevation: 4,
  },

  title: { color: "#0E3A46", fontSize: 18, fontWeight: "700", textAlign: "center" },
  msg: { color: "#374151", textAlign: "center", marginBottom: 12 },

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
});
