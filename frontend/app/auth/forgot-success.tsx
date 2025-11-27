import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";

export default function ForgotSuccess() {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Código enviado</Text>
        <Text style={s.h2}>Revisa tu correo</Text>
      </View>

      <View style={[s.card, { alignItems: "center" }]}>
        <Text style={s.title}>¡Listo!</Text>
        <Text style={s.msg}>
          Te enviamos un código para restablecer tu contraseña.
        </Text>
        <Text style={[s.msg, { marginTop: 8 }]}>
          Ingresa el código en la siguiente pantalla.
        </Text>

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.replace("/auth/reset")}
        >
          <Text style={s.primaryBtnText}>Ingresar código</Text>
        </TouchableOpacity>
      </View>
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

  title: { fontSize: 20, fontWeight: "800", color: "#0E3A46", textAlign: "center" },
  msg: { color: "#374151", textAlign: "center" },

  primaryBtn: {
    backgroundColor: "#0E3A46",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
    alignItems: "center",
    alignSelf: "stretch",
  },

  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
