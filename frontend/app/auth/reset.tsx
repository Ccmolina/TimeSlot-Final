import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../lib/api";

export default function Reset() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const tokenFromUrl = Array.isArray(params.token) ? params.token[0] : params.token;

  const [code, setCode] = useState(""); // código del mail (4 dígitos ahora)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (tokenFromUrl) {
      setCode(String(tokenFromUrl));
    }
  }, [tokenFromUrl]);

  const onReset = async () => {
    const finalToken = tokenFromUrl || code.trim();

    if (!finalToken) {
      return alert("Pegá el código que te llegó por correo.");
    }
    if (!password || !confirm) {
      return alert("Completá ambos campos");
    }
    if (password.length < 6) {
      return alert("La contraseña debe tener al menos 6 caracteres");
    }
    if (password !== confirm) {
      return alert("Las contraseñas no coinciden");
    }

    try {
      setLoading(true);

      await api("/api/auth/reset", {
        method: "POST",
        withAuth: false,
        body: {
          token: finalToken,
          password,
        },
      });

      alert("Contraseña actualizada correctamente");
      router.replace("/auth/login");
    } catch (e: any) {
      console.log("Reset error:", e);
      alert(e?.message || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.header}>
            <Text style={s.h1}>Nueva contraseña</Text>
            <Text style={s.h2}>para tu cuenta TimeSlot</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>Restablecer contraseña</Text>
            <Text style={s.msg}>
              Pegá el código de 4 dígitos que te llegó por correo y elegí tu nueva
              contraseña.
            </Text>

            <Text style={[s.label, { marginTop: 16 }]}>
              Código de recuperación:
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={4}
              autoCapitalize="none"
              style={s.input}
              placeholder="Ej: 4831"
              placeholderTextColor="#9AA3AF"
              returnKeyType="next"
            />

            <Text style={[s.label, { marginTop: 16 }]}>Nueva contraseña:</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={s.input}
              placeholder="********"
              placeholderTextColor="#9AA3AF"
              returnKeyType="next"
            />

            <Text style={[s.label, { marginTop: 16 }]}>
              Confirmar contraseña:
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              style={s.input}
              placeholder="********"
              placeholderTextColor="#9AA3AF"
              returnKeyType="done"
              onSubmitEditing={onReset}
            />

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={onReset}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>
                {loading ? "Guardando..." : "Guardar contraseña"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* decoraciones inferiores, siguen igual */}
        <View style={s.bottomLeft} />
        <View style={s.bottomRight} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 24,
  },

  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },

  header: {
    backgroundColor: "#0E3A46",
    width: "130%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },

  h1: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
    fontFamily: Platform.select({
      ios: "Times New Roman",
      android: "serif",
      default: "serif",
    }),
  },
  h2: { color: "#E6F1F4", fontSize: 14, fontWeight: "600", marginTop: 2 },

  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 32,
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
    marginBottom: 4,
  },

  label: {
    color: "#0E3A46",
    fontWeight: "700",
    marginBottom: 6,
  },

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
    marginTop: 22,
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
