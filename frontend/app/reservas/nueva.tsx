import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

type MonthDay = {
  key: string;
  day: number;
  iso?: string;
};

const BASE = "http://192.168.12.197:4000/api"; // 👈 IMPORTANTE: /api

function getMonthKey(iso: string) {
  return iso.slice(0, 7); // "2025-12-03" -> "2025-12"
}

export default function NuevaReserva() {
  const [areas, setAreas] = useState<string[]>([]);
  const [profesionales, setProfesionales] = useState<string[]>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);

  const [area, setArea] = useState<string>("");
  const [profesional, setProfesional] = useState<string>("");
  const [fechaISO, setFechaISO] = useState<string>(toISO(new Date()));
  const [hora, setHora] = useState<string>("");

  const [openArea, setOpenArea] = useState(false);
  const [openPro, setOpenPro] = useState(false);
  const [openHora, setOpenHora] = useState(false);

  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingProfes, setLoadingProfes] = useState(false);
  const [loadingHoras, setLoadingHoras] = useState(false);

  const [diasDisponibles, setDiasDisponibles] = useState<string[]>([]);

  // --------- CARGAR ÁREAS ---------
  useEffect(() => {
    const cargarAreas = async () => {
      try {
        setLoadingAreas(true);
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          alert("No hay sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const res = await fetch(`${BASE}/opciones/areas`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("Error cargando áreas:", await res.text());
          alert("No se pudieron cargar las áreas.");
          return;
        }

        const lista: string[] = await res.json();
        setAreas(lista);
      } catch (e) {
        console.log("Error conexión áreas:", e);
        alert("Error de conexión al cargar áreas.");
      } finally {
        setLoadingAreas(false);
      }
    };

    cargarAreas();
  }, []);

  // --------- CARGAR PROFESIONALES ---------
  useEffect(() => {
    const cargarProfesionales = async () => {
      setProfesionales([]);
      setProfesional("");
      setHorasDisponibles([]);
      setHora("");
      setDiasDisponibles([]);

      if (!area) return;

      try {
        setLoadingProfes(true);
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          alert("No hay sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const url = `${BASE}/opciones/profesionales?area=${encodeURIComponent(
          area
        )}`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("Error cargando profesionales:", await res.text());
          alert("No se pudieron cargar los profesionales.");
          return;
        }

        const lista: string[] = await res.json();
        setProfesionales(lista);
      } catch (e) {
        console.log("Error conexión profesionales:", e);
        alert("Error de conexión al cargar profesionales.");
      } finally {
        setLoadingProfes(false);
      }
    };

    cargarProfesionales();
  }, [area]);

  // --------- CARGAR HORAS DISPONIBLES ---------
  useEffect(() => {
    const cargarHoras = async () => {
      setHorasDisponibles([]);
      setHora("");

      if (!area || !profesional || !fechaISO) return;

      try {
        setLoadingHoras(true);
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          alert("No hay sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const url =
          `${BASE}/opciones/horas` +
          `?area=${encodeURIComponent(area)}` +
          `&profesional=${encodeURIComponent(profesional)}` +
          `&fecha=${encodeURIComponent(fechaISO)}`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("Error cargando horas:", await res.text());
          alert("No se pudieron cargar los horarios disponibles.");
          return;
        }

        const data = await res.json();
        const horas: string[] = data.horas || [];
        setHorasDisponibles(horas);
        setHora(horas[0] || "");
      } catch (e) {
        console.log("Error conexión horas:", e);
        alert("Error de conexión al cargar horarios.");
      } finally {
        setLoadingHoras(false);
      }
    };

    cargarHoras();
  }, [area, profesional, fechaISO]);

  // --------- CARGAR DÍAS DISPONIBLES ---------
  useEffect(() => {
    const cargarDias = async () => {
      setDiasDisponibles([]);

      if (!area || !profesional) return;

      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          alert("No hay sesión activa. Inicia sesión nuevamente.");
          return;
        }

        const mes = getMonthKey(fechaISO);

        const url =
          `${BASE}/opciones/dias-disponibles` +
          `?area=${encodeURIComponent(area)}` +
          `&profesional=${encodeURIComponent(profesional)}` +
          `&mes=${encodeURIComponent(mes)}`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("Error cargando días disponibles:", await res.text());
          return;
        }

        const data = await res.json();
        const dias: string[] = data.dias || [];
        setDiasDisponibles(dias);
      } catch (e) {
        console.log("Error conexión días disponibles:", e);
      }
    };

    cargarDias();
  }, [area, profesional, fechaISO]);

  const diasMes = useMemo(
    () => buildMonthDays(new Date(fechaISO)),
    [fechaISO]
  );

  // --------- CREAR RESERVA ---------
  const crear = async () => {
    if (!area || !profesional || !fechaISO || !hora) {
      return alert("Completa todos los campos");
    }

    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        alert("No hay sesión activa. Inicia sesión nuevamente.");
        return;
      }

      const res = await fetch(`${BASE}/reservas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          area,
          profesional,
          fechaISO,
          hora,
          modalidad: "Presencial",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log("Error backend:", err);
        alert("No se pudo crear la reserva");
        return;
      }

      await res.json();
      router.replace("/home");
    } catch (e) {
      console.log(e);
      alert("Error de conexión con el servidor");
    }
  };

  const abrirHora = () => {
    if (!area) {
      alert("Primero selecciona un área");
      return;
    }
    if (!profesional) {
      alert("Primero selecciona un profesional");
      return;
    }
    if (loadingHoras) {
      alert("Cargando horarios, espera un momento…");
      return;
    }
    if (horasDisponibles.length === 0) {
      alert(
        "Este día no tiene horarios disponibles para ese profesional. Elige otra fecha."
      );
      return;
    }
    setOpenHora(true);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.container}>
          <TouchableOpacity
            onPress={() => router.replace("/home")}
            style={s.backBtn}
          >
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.cornerTopLeft} />
            <View style={s.cornerTopRight} />
            <Text style={s.hSmall}>Crea Tu</Text>
            <Text style={s.hBig}>RESERVA</Text>
          </View>

          <View style={s.form}>
            {/* Área */}
            <Text style={s.label}>Área</Text>
            <Pressable
              style={s.select}
              onPress={() => {
                if (loadingAreas) {
                  alert("Cargando áreas desde el servidor…");
                  return;
                }
                setOpenArea(true);
              }}
            >
              <Text style={s.selectText}>
                {area ||
                  (loadingAreas ? "Cargando..." : "Selecciona un servicio")}
              </Text>
              <Text style={s.caret}>▾</Text>
            </Pressable>

            {/* Profesional */}
            <Text style={[s.label, { marginTop: 18 }]}>Profesional</Text>
            <Pressable
              style={s.select}
              onPress={() => {
                if (!area) {
                  alert("Primero selecciona un servicio");
                  return;
                }
                if (loadingProfes) {
                  alert("Cargando profesionales…");
                  return;
                }
                if (profesionales.length === 0) {
                  alert("No hay profesionales para esa área.");
                  return;
                }
                setOpenPro(true);
              }}
            >
              <Text style={s.selectText}>
                {profesional || "Selecciona un profesional"}
              </Text>
              <Text style={s.caret}>▾</Text>
            </Pressable>

            {/* Fecha */}
            <Text style={[s.label, { marginTop: 18 }]}>Fecha</Text>
            <View style={s.calendar}>
              <View style={s.calHead}>
                <TouchableOpacity
                  onPress={() =>
                    setFechaISO(toISO(addMonths(new Date(fechaISO), -1)))
                }>
                  <Text style={s.arrow}>‹</Text>
                </TouchableOpacity>
                <Text style={s.monthLabel}>
                  {formatMonthYear(new Date(fechaISO))}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFechaISO(toISO(addMonths(new Date(fechaISO), 1)))
                }>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={s.weekRow}>
                {["D", "L", "M", "MI", "J", "V", "S"].map((d) => (
                  <Text key={d} style={s.weekDay}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={s.daysGrid}>
                {diasMes.map((d) => {
                  const esDiaReal = !!d.day;

                  // ⚠️ Si no hay diasDisponibles, NO bloqueamos todo el mes
                  let estaDisponible = true;
                  if (
                    area &&
                    profesional &&
                    d.iso &&
                    diasDisponibles.length > 0
                  ) {
                    estaDisponible = diasDisponibles.includes(d.iso);
                  }

                  const disabled = !esDiaReal || !estaDisponible;

                  return (
                    <TouchableOpacity
                      key={d.key}
                      disabled={disabled}
                      style={[
                        s.dayCell,
                        esDiaReal &&
                        !disabled &&
                        d.iso === fechaISO
                          ? s.daySelected
                          : null,
                        !esDiaReal ? { opacity: 0 } : null,
                        disabled && esDiaReal ? { opacity: 0.3 } : null,
                      ]}
                      onPress={() => d.iso && !disabled && setFechaISO(d.iso)}
                    >
                      <Text
                        style={[
                          s.dayText,
                          esDiaReal &&
                          !disabled &&
                          d.iso === fechaISO
                            ? { color: "#fff", fontWeight: "800" }
                            : null,
                        ]}
                      >
                        {d.day || ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hora */}
            <Text style={[s.label, { marginTop: 18 }]}>
              Hora {loadingHoras ? "(cargando...)" : ""}
            </Text>
            <Pressable style={s.select} onPress={abrirHora}>
              <Text style={s.selectText}>
                {hora || "Selecciona una hora disponible"}
              </Text>
              <Text style={s.caret}>▾</Text>
            </Pressable>

            <TouchableOpacity style={s.primaryBtn} onPress={crear}>
              <Text style={s.primaryBtnText}>Crear</Text>
            </TouchableOpacity>
          </View>

          <View style={s.cornerBottomLeft} />
          <View style={s.cornerBottomRight} />
        </View>
      </ScrollView>

      {/* Pickers */}
      <SimplePicker
        visible={openArea}
        title="Selecciona un servicio"
        items={areas}
        onClose={() => setOpenArea(false)}
        onPick={(v) => setArea(v)}
      />
      <SimplePicker
        visible={openPro}
        title="Selecciona un profesional"
        items={profesionales}
        onClose={() => setOpenPro(false)}
        onPick={(v) => setProfesional(v)}
      />
      <SimplePicker
        visible={openHora}
        title="Selecciona la hora"
        items={horasDisponibles}
        onClose={() => setOpenHora(false)}
        onPick={(v) => setHora(v)}
      />
    </SafeAreaView>
  );
}

function SimplePicker({
  visible,
  title,
  items,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  items: string[];
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>{title}</Text>
          <FlatList
            data={items}
            keyExtractor={(x) => x}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.item}
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
              >
                <Text style={modalStyles.itemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

// --------- Helpers fechas ---------
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMonthYear(d: Date) {
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function buildMonthDays(base: Date): MonthDay[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const offset = first.getDay();
  const total = last.getDate();

  const cells: MonthDay[] = [];

  for (let i = 0; i < offset; i++) {
    cells.push({ key: `e${i}`, day: 0, iso: undefined });
  }

  for (let d = 1; d <= total; d++) {
    const iso = toISO(new Date(base.getFullYear(), base.getMonth(), d));
    cells.push({ key: `d${d}`, day: d, iso });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `z${cells.length}`, day: 0, iso: undefined });
  }

  return cells;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 40,
  },
  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0E3A46",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cornerTopLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 80,
    height: 60,
    backgroundColor: "#0E3A46",
    borderBottomRightRadius: 80,
  },
  cornerTopRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 80,
    height: 60,
    backgroundColor: "#0E3A46",
    borderBottomLeftRadius: 80,
  },
  hSmall: {
    fontSize: 20,
    color: "#0E3A46",
    fontFamily: Platform.select({
      ios: "Times New Roman",
      android: "serif",
      default: "serif",
    }),
  },
  hBig: {
    fontSize: 28,
    marginTop: 4,
    color: "#0E3A46",
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: Platform.select({
      ios: "Times New Roman",
      android: "serif",
      default: "serif",
    }),
  },
  form: {
    width: "80%",
    maxWidth: 320,
  },
  label: {
    color: "#0E3A46",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
  },
  select: {
    height: 42,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: "#111827", fontSize: 14 },
  caret: { color: "#4B5563", fontSize: 16 },
  calendar: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
    width: 230,
  },
  calHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  monthLabel: {
    color: "#0E3A46",
    fontWeight: "700",
    fontSize: 12,
  },
  arrow: { color: "#0E3A46", fontSize: 18, paddingHorizontal: 4 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#4B5563",
    fontSize: 10,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    marginVertical: 1,
  },
  daySelected: { backgroundColor: "#0E3A46" },
  dayText: { color: "#0E3A46", fontSize: 11 },
  primaryBtn: {
    backgroundColor: "#0E3A46",
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 24,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  cornerBottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 80,
    height: 60,
    backgroundColor: "#0E3A46",
    borderTopRightRadius: 80,
  },
  cornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 80,
    height: 60,
    backgroundColor: "#0E3A46",
    borderTopLeftRadius: 80,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: "86%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  title: {
    color: "#0E3A46",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemText: { color: "#111827" },
});
