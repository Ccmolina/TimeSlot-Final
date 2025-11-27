import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Reserva } from "./store/reservas";

function toDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
}

function daysDiffFromToday(iso: string): number {
  const today = new Date();
  const target = new Date(iso + "T00:00:00");
  const ms =
    target.getTime() -
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function Historial() {
  const [reservasHistorial, setReservasHistorial] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        let jwtToken = await SecureStore.getItemAsync("token");
        if (!jwtToken) {
          try {
            jwtToken = (await AsyncStorage.getItem("token")) || null;
          } catch (e) {
            console.log("Error leyendo token desde AsyncStorage:", e);
          }
        }

        if (!jwtToken) {
          console.log("No hay token, no se carga historial");
          setLoading(false);
          return;
        }

        const resp = await fetch(
          "http://192.168.12.197:4000/api/reservas/historial",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );

        console.log("STATUS /reservas/historial:", resp.status);

        if (!resp.ok) {
          console.log("Error al cargar historial");
          setLoading(false);
          return;
        }

        const data = await resp.json();
        setReservasHistorial(data);
      } catch (e) {
        console.log("Error cargando historial:", e);
      } finally {
        setLoading(false);
      }
    };

    cargarHistorial();
  }, []);

  // Ordenamos de más reciente a más antigua (o al revés si preferís)
  const reservasPasadas = useMemo(
    () =>
      reservasHistorial
        .slice()
        .sort((a, b) =>
          (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)
        ),
    [reservasHistorial]
  );

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Historial de reservas</Text>
      </View>

      <View style={s.cardListWrapper}>
        <View style={s.cardList}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: "35%" }]}>Fecha</Text>
            <Text style={[s.th, { width: "65%" }]}>Medico</Text>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={
              reservasPasadas.length === 0 ? { paddingVertical: 18 } : undefined
            }
          >
            {loading ? (
              <Text style={s.emptyText}>Cargando historial...</Text>
            ) : reservasPasadas.length === 0 ? (
              <Text style={s.emptyText}>
                Todavía no tienes reservas anteriores.
              </Text>
            ) : (
              reservasPasadas.map((r: Reserva) => (
                <View key={r.id} style={s.row}>
                  <View style={s.colFecha}>
                    <Text style={s.date}>{toDDMMYYYY(r.fechaISO)}</Text>
                    <Text style={s.hour}>{r.hora}</Text>
                  </View>
                  <View style={s.colMedico}>
                    <Text style={s.doctor}>{r.profesional}</Text>
                    <Text style={s.meta}>Especialidad: {r.area}</Text>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>
                        {r.modalidad ?? "Presencial"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F6" },
  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#0E3A46",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  back: { color: "#FFFFFF", fontSize: 22, marginRight: 12 },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  cardListWrapper: { marginTop: 20, alignItems: "center" },
  cardList: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#0E3A46",
    overflow: "hidden",
    paddingBottom: 8,
  },
  tableHeader: {
    backgroundColor: "#E6EDF2",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  th: { color: "#374151", fontWeight: "700", fontSize: 13 },
  scroll: { maxHeight: 500 },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  colFecha: { width: "35%" },
  colMedico: { width: "65%", paddingLeft: 4 },
  date: { color: "#111827", fontWeight: "600", fontSize: 12 },
  hour: { color: "#4B5563", fontSize: 12, marginTop: 2 },
  doctor: { color: "#111827", fontWeight: "700", fontSize: 12 },
  meta: { color: "#4B5563", fontSize: 11, marginTop: 2 },
  badge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#D0E9E6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { color: "#0E3A46", fontSize: 10, fontWeight: "600" },
  emptyText: { color: "#6B7280", fontSize: 13, textAlign: "center" },
});
