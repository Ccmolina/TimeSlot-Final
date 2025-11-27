import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  useEffect(() => {
    (async () => {
      try {
        let token: string | null = null;

        try {
          token = await SecureStore.getItemAsync("token");
        } catch {

        }

        if (!token) {
          try {
            token = (await AsyncStorage.getItem("token")) || null;
          } catch {

          }
        }


        let remember = "1";
        try {
          remember =
            (await SecureStore.getItemAsync("rememberMe")) ||
            (await AsyncStorage.getItem("rememberMe")) ||
            "1";
        } catch {

        }


        if (!token || remember !== "1") {
          router.replace("/auth/login");
          return;
        }


        let rawUser: string | null = null;
        try {
          rawUser = await SecureStore.getItemAsync("user");
        } catch {
        }

        if (!rawUser) {
          try {
            rawUser = (await AsyncStorage.getItem("user")) || null;
          } catch {
          }
        }

        if (!rawUser) {
          router.replace("/auth/login");
          return;
        }

        let user: any = null;
        try {
          user = JSON.parse(rawUser);
        } catch {
          router.replace("/auth/login");
          return;
        }

        const role = (user?.role || "").toLowerCase();

        if (role === "admin") {
          router.replace("/admin/InformesScreen");
        } else if (role === "medico" || role === "médico") {
          router.replace("/medico/HomeScreen");
        } else {
          router.replace("/home");
        }
      } catch (err) {
        console.log("Error en index:", err);
        router.replace("/auth/login");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#0E3A46" />
    </View>
  );
}
