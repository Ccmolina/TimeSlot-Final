import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true); 

  const saveToken = async (token: string, user: any, rememberFlag: boolean) => {
  
    const posibleNombre =
      user?.name ||
      user?.nombre ||
      user?.fullName ||
      `${user?.name || ""} ${user?.last || user?.apellido || ""}`.trim();

    const finalName = posibleNombre || "Usuario";

    if (Platform.OS === "web") {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userName", finalName);
      localStorage.setItem("rememberMe", rememberFlag ? "1" : "0");
    } else {
      try {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
        await AsyncStorage.setItem("userName", finalName);
        await AsyncStorage.setItem("rememberMe", rememberFlag ? "1" : "0");
      } catch (e) {
        console.log("Error guardando en AsyncStorage:", e);
      }

      try {
        await SecureStore.setItemAsync("token", token);
        await SecureStore.setItemAsync("user", JSON.stringify(user));
        await SecureStore.setItemAsync("userName", finalName);
        await SecureStore.setItemAsync(
          "rememberMe",
          rememberFlag ? "1" : "0"
        );
      } catch (e) {
        console.log("Error guardando en SecureStore:", e);
      }
    }
  };

  const redirectByUser = (user: any) => {
    const role = (user?.role || "").toLowerCase();

    console.log("🔎 rol recibido en login:", role);

    if (role === "admin") {
      router.replace("/admin/InformesScreen");
    } else if (role === "medico" || role === "médico") {
      router.replace("/medico/HomeScreen");
    } else {
      router.replace("/home");
    }
  };

  const onLogin = async () => {
    if (!email.trim() || !pass.trim()) {
      return alert("Ingresa tu correo y contraseña");
    }

    try {
      setLoading(true);

      const data = await api<{ token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password: pass.trim() },
        withAuth: false,
      });

      console.log("🔐 Login response:", data);

     
      await saveToken(data.token, data.user, remember);

     
      redirectByUser(data.user);
    } catch (e: any) {
      console.log("Login error:", e);
      alert(e?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <View style={s.header}>
          <Image
            source={require("../../assets/logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.h1}>Bienvenido</Text>
          <Text style={s.h2}>a TimeSlot</Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.kav}
        >
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.card}>
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

              <Text style={[s.label, { marginTop: 12 }]}>Contraseña:</Text>
              <TextInput
                placeholder="••••••••"
                value={pass}
                onChangeText={setPass}
                secureTextEntry
                style={s.input}
                placeholderTextColor="#9AA3AF"
              />

             
              <TouchableOpacity
                style={s.rememberRow}
                onPress={() => setRemember((prev) => !prev)}
              >
                <View style={[s.checkbox, remember && s.checkboxOn]}>
                  {remember && <Text style={s.checkboxMark}>✓</Text>}
                </View>
                <Text style={s.rememberText}>Mantener sesión iniciada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/auth/forgot")}
                style={{ alignSelf: "center", marginTop: 4 }}
              >
                <Text style={s.helperLink}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={onLogin}
                disabled={loading}
              >
                <Text style={s.primaryBtnText}>
                  {loading ? "Ingresando..." : "Iniciar Sesión"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              style={{ marginTop: 8 }}
            >
              <Text style={s.registerText}>
                ¿No tienes una cuenta?{" "}
                <Text style={s.registerLink}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={s.bottomLeft} />
        <View style={s.bottomRight} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  kav: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 24,
  },
  header: {
    backgroundColor: "#0E3A46",
    width: "120%",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },
  logo: { width: 64, height: 64, marginBottom: 6 },
  h1: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  h2: {
    color: "#E6F1F4",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  card: {
    width: "88%",
    maxWidth: 380,
    backgroundColor: "#fff",
    marginTop: 24,
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
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#111827",
  },
  helperLink: { color: "#6B7280", fontSize: 12 },


  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  checkboxOn: {
    backgroundColor: "#0E3A46",
    borderColor: "#0E3A46",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  rememberText: {
    fontSize: 12,
    color: "#4B5563",
  },

  primaryBtn: {
    backgroundColor: "#0E3A46",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  registerText: { color: "#121314fc" },
  registerLink: { color: "#125496ff", fontWeight: "700" },
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
