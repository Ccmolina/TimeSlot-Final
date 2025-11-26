import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api } from "../../lib/api";
import { router } from "expo-router";

interface DiaAPI {
  dia_semana: string;
  medico: {
    id: number | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    abierto: boolean;
  } | null;
  negocio_abierto: boolean;
  negocio_hora_inicio: string | null;
  negocio_hora_fin: string | null;
}

const DIAS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export default function HorarioMedicoScreen() {
  const [dias, setDias] = useState<DiaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api<{ ok: boolean; data: DiaAPI[] }>(
          "/api/horariosm/horarioo"
        );

        if (!res || !res.ok) {
          throw new Error("Error al cargar horarios");
        }

        setDias(res.data);
      } catch (err: any) {
        Alert.alert("Error", err.message || "No se pudieron cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleAbierto = (dia: string, value: boolean) => {
    setDias((prev) =>
      prev.map((d) =>
        d.dia_semana === dia
          ? {
              ...d,
              medico: {
                id: d.medico?.id ?? null,
                hora_inicio: d.medico?.hora_inicio ?? "08:00:00",
                hora_fin: d.medico?.hora_fin ?? "17:00:00",
                abierto: value,
              },
            }
          : d
      )
    );
  };

  const setHora = (
    dia: string,
    campo: "hora_inicio" | "hora_fin",
    valor: string
  ) => {
    setDias((prev) =>
      prev.map((d) =>
        d.dia_semana === dia
          ? {
              ...d,
              medico: {
                id: d.medico?.id ?? null,
                hora_inicio:
                  campo === "hora_inicio" ? valor : d.medico?.hora_inicio ?? "08:00:00",
                hora_fin:
                  campo === "hora_fin" ? valor : d.medico?.hora_fin ?? "17:00:00",
                abierto: d.medico?.abierto ?? false,
              },
            }
          : d
      )
    );
  };

  const guardarTodo = async () => {
    setGuardando(true);
    try {
      for (const d of dias) {
        const medico = d.medico;
        await api("/api/horariosm/guardar", {
          method: "POST",
          body: {
            dia_semana: d.dia_semana,
            hora_inicio: medico?.hora_inicio ?? null,
            hora_fin: medico?.hora_fin ?? null,
            abierto: medico?.abierto ?? false,
          },
        });
      }
      Alert.alert("Éxito", "Horarios actualizados correctamente 🎉");
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.h1}>Horario</Text>
        <Text style={s.h2}>del Médico</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>🕓 Configura tus horarios</Text>

            {dias.map((d) => {
              const medico = d.medico ?? { id: null, hora_inicio: "08:00:00", hora_fin: "17:00:00", abierto: false };
              const negocioAbierto = !!d.negocio_abierto;

              return (
                <View key={d.dia_semana} style={s.dayCard}>
                  <Text style={s.dayTitle}>{d.dia_semana.toUpperCase()}</Text>

                  <View style={s.row}>
                    <Text style={s.label}>
                      {medico.abierto ? "Abierto" : "Cerrado"}:
                    </Text>

                    <Switch
                      value={medico.abierto}
                      onValueChange={(v) => toggleAbierto(d.dia_semana, v)}
                      disabled={!negocioAbierto}
                    />
                  </View>

                  {!negocioAbierto && (
                    <Text style={{ color: "#B91C1C", marginTop: 6 }}>
                      El negocio está cerrado este día (no podés abrir).
                    </Text>
                  )}

                  {medico.abierto && (
                    <>
                      <View style={s.row}>
                        <Text style={s.label}>Inicio:</Text>
                        <TextInput
                          style={s.input}
                          value={medico.hora_inicio ?? ""}
                          onChangeText={(v) => setHora(d.dia_semana, "hora_inicio", v)}
                        />
                      </View>

                      <View style={s.row}>
                        <Text style={s.label}>Fin:</Text>
                        <TextInput
                          style={s.input}
                          value={medico.hora_fin ?? ""}
                          onChangeText={(v) => setHora(d.dia_semana, "hora_fin", v)}
                        />
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={s.primaryBtn} onPress={guardarTodo} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Guardar Horarios</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barra inferior */}
      <View style={s.bottomBar}>
        <TouchableOpacity onPress={() => router.replace("/medico/HomeScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/medico/Horario_medicoScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>🕒</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/medico/InformesScreen")} style={s.bottomBtn}>
          <Text style={s.bottomIcon}>📅</Text>
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
  h1: { color: "#fff", fontSize: 36, fontWeight: "800" },
  h2: { color: "#E6F1F4", fontSize: 16, fontWeight: "700" },
  card: {
    width: 340,
    backgroundColor: "#fff",
    marginTop: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0E3A46", marginBottom: 12, textAlign: "center" },
  dayCard: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  dayTitle: { fontWeight: "700", color: "#0E3A46", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 4 },
  label: { color: "#0E3A46", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", padding: 6, width: 100, textAlign: "center", borderRadius: 8 },
  primaryBtn: { backgroundColor: "#0E3A46", paddingVertical: 12, borderRadius: 10, marginTop: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  bottomBar: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "#0E3A46", flexDirection: "row", justifyContent: "space-around", paddingVertical: 14 },
  bottomBtn: { alignItems: "center", justifyContent: "center" },
  bottomIcon: { fontSize: 26, color: "#fff" },
  bottomLeft: { position: "absolute", bottom: 0, left: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopRightRadius: 80 },
  bottomRight: { position: "absolute", bottom: 0, right: -10, width: 90, height: 80, backgroundColor: "#0E3A46", borderTopLeftRadius: 80 },
});
