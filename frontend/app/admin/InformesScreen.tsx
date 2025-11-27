import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { api } from "../../lib/api";
import { useRouter } from "expo-router";

interface ReservaData {
  fecha: string;
  total_reservas: number;
}

interface CancelacionData {
  fecha: string;
  total_cancelaciones: number;
}

interface MedicoData {
  nombre_medico: string;
  total_reservas: number;
}

export default function InformesScreen() {
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaData[]>([]);
  const [cancelaciones, setCancelaciones] = useState<CancelacionData[]>([]);
  const [porMedico, setPorMedico] = useState<MedicoData[]>([]);
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
      const resReservas = await api<{ ok: boolean; data: ReservaData[] }>("/api/informes/reservas");
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
            maxDia: new Date(max.maxDia).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
            maxCantidad: max.maxCantidad,
            promedio,
          });
        }
      }

      const resCancel = await api<{ ok: boolean; data: CancelacionData[] }>("/api/informes/cancelaciones");
      if (resCancel.ok) setCancelaciones(resCancel.data);

      const resMedico = await api<{ ok: boolean; data: MedicoData[] }>("/api/informes/medicos");
      if (resMedico.ok) setPorMedico(resMedico.data);
    } catch (err) {
      console.log("[API] Error cargando informes:", err);
    }
  };

  const chartDataReservas = {
    labels: reservas.map((r) => new Date(r.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })),
    datasets: [{ data: reservas.map((r) => r.total_reservas) }],
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Informes</Text>
        <Text style={s.h2}>Estadísticas del negocio</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 120 }}>
        {/* Reservas por día */}
        <View style={s.card}>
          <Text style={s.title}>Reservas Confirmadas por Día</Text>
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
            <Text style={s.text}>No hay datos de reservas recientes</Text>
          )}
        </View>

        {/* Cancelaciones */}
        <View style={s.card}>
          <Text style={s.title}>Cancelaciones</Text>
          {cancelaciones.length > 0 ? (
            <BarChart
              data={{
                labels: cancelaciones.map((c) => new Date(c.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })),
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
          ) : (
            <Text style={s.text}>No hay datos de cancelaciones</Text>
          )}
        </View>

        {/* Reservas por médico */}
        <View style={s.card}>
          <Text style={s.title}>Reservas por Médico</Text>
          {porMedico.length > 0 ? (
            <PieChart
              data={porMedico.map((m, i) => ({
                name: m.nombre_medico,
                population: m.total_reservas,
                color: ["#0088FE","#00C49F","#FFBB28","#FF8042","#845EC2"][i % 5],
                legendFontColor: "#333",
                legendFontSize: 12,
              }))}
              width={Dimensions.get("window").width - 60}
              height={220}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={s.text}>No hay datos de reservas por médico</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
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
  h1: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", letterSpacing: 0.3 },
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
  bottomLeft: { position: "absolute", bottom: 0, left: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopRightRadius: 80 },
  bottomRight: { position: "absolute", bottom: 0, right: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopLeftRadius: 80 },
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
    zIndex: 10,
  },
  bottomBtn: { flex: 1, alignItems: "center" },
  bottomIcon: { fontSize: 24, color: "#fff" },
});
