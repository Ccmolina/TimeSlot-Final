import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";

export default function ForgotSuccess() {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Bienvenido</Text>
        <Text style={s.h2}>a TimeSlot</Text>
      </View>

      <View style={[s.card, { alignItems: "center" }]}>
        <Text style={s.title}>¡Listo!</Text>
        <Text style={s.msg}>
          Te enviamos un correo con las instrucciones para restablecer tu
          contraseña.
        </Text>
        <Text style={[s.msg, { marginTop: 8 }]}>
          Revísalo para continuar.
        </Text>

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.replace("/auth/login")}
        >
          <Text style={s.primaryBtnText}>Volver al inicio</Text>
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
    fontSize: 20,
    fontWeight: "800",
    color: "#0E3A46",
    marginBottom: 8,
    textAlign: "center",
  },

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
