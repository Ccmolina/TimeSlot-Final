import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { api } from "../../lib/api";
import { router } from "expo-router";

interface ReservaData {
  fecha: string;
  total_reservas: number;
}

interface CancelacionData {
  fecha: string;
  total_cancelaciones: number;
}

export default function InformesScreen() {
  const [reservas, setReservas] = useState<ReservaData[]>([]);
  const [cancelaciones, setCancelaciones] = useState<CancelacionData[]>([]);
  const [resumen, setResumen] = useState({
    total: 0,
    maxDia: "",
    maxCantidad: 0,
    promedio: 0,
  });

  useEffect(() => {
    cargarInformes();
  }, []);

  const cargarInformes = async () => {
    try {
      const resReservas = await api<{ ok: boolean; data: ReservaData[] }>(
        "/api/informesm/reservasm"
      );

      if (resReservas.ok) {
        const ordenadas = [...resReservas.data].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        setReservas(ordenadas);

        if (ordenadas.length > 0) {
          const total = ordenadas.reduce((sum, r) => sum + r.total_reservas, 0);

          const max = ordenadas.reduce(
            (acc, r) =>
              r.total_reservas > acc.maxCantidad
                ? { maxDia: r.fecha, maxCantidad: r.total_reservas }
                : acc,
            { maxDia: "", maxCantidad: 0 }
          );

          const promedio = Number((total / ordenadas.length).toFixed(1));

          setResumen({
            total,
            maxDia: new Date(max.maxDia).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
            }),
            maxCantidad: max.maxCantidad,
            promedio,
          });
        }
      }

      const resCancel = await api<{ ok: boolean; data: CancelacionData[] }>(
        "/api/informesm/cancelacionesm"
      );

      if (resCancel.ok) setCancelaciones(resCancel.data);

    } catch (err) {
      console.log("[API] Error cargando informes:", err);
    }
  };

  const chartDataReservas = {
    labels: reservas.map((r) =>
      new Date(r.fecha).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
      })
    ),
    datasets: [{ data: reservas.map((r) => r.total_reservas) }],
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Mis Informes</Text>
        <Text style={s.h2}>Estadísticas de mis turnos</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 100 }}>
        {/* Reservas por día */}
        <View style={s.card}>
          <Text style={s.title}>Mis Reservas Confirmadas</Text>
          {reservas.length > 0 ? (
            <>
              <BarChart
                data={chartDataReservas}
                width={Dimensions.get("window").width - 60}
                height={220}
                fromZero
                showValuesOnTopOfBars
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(14, 58, 70, ${opacity})`,
                  labelColor: () => "#333",
                  barPercentage: 0.6,
                }}
                style={{ borderRadius: 10 }}
              />

              <View style={s.resumen}>
                <Text>Total de reservas confirmadas: <Text style={s.bold}>{resumen.total}</Text></Text>
                <Text>Día con más reservas: <Text style={s.bold}>{resumen.maxDia}</Text></Text>
                <Text>Promedio diario: <Text style={s.bold}>{resumen.promedio}</Text></Text>
              </View>
            </>
          ) : (
            <Text style={s.text}>No hay datos de reservas confirmadas</Text>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.title}>Cancelaciones</Text>
          {cancelaciones.length > 0 ? (
            <>
              <BarChart
                data={{
                  labels: cancelaciones.map((c) =>
                    new Date(c.fecha).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                    })
                  ),
                  datasets: [{ data: cancelaciones.map((c) => c.total_cancelaciones) }],
                }}
                width={Dimensions.get("window").width - 60}
                height={220}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 99, 71, ${opacity})`,
                  labelColor: () => "#333",
                  barPercentage: 0.6,
                }}
                style={{ borderRadius: 10 }}
              />
            </>
          ) : (
            <Text style={s.text}>No hay datos de cancelaciones</Text>
          )}
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity
          onPress={() => router.replace("/medico/HomeScreen")}
          style={s.bottomBtn}
        >
          <Text style={s.bottomIcon}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/medico/Horario_servicioScreen")}
          style={s.bottomBtn}
        >
          <Text style={s.bottomIcon}>🕒</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/medico/InformesScreen")}
          style={s.bottomBtn}
        >
          <Text style={s.bottomIcon}>📅</Text>
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
  h1: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  h2: { color: "#E6F1F4", fontSize: 15, fontWeight: "600", marginTop: 4 },
  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 30,
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
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center", color: "#0E3A46" },
  text: { textAlign: "center", color: "#666", marginTop: 10 },
  resumen: { marginTop: 16, gap: 6 },
  bold: { fontWeight: "600", color: "#0E3A46" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "#0E3A46",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomBtn: {
    flex: 1,
    alignItems: "center",
  },
  bottomIcon: {
    fontSize: 26,
    color: "#fff",
  },
});
