import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useReservas, type Reserva } from "../store/reservas";
import { api } from "../../lib/api";

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Home() {
  const { reservas, syncFromBackend } = useReservas();
  const [nombre, setNombre] = useState<string>("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [openAvisos, setOpenAvisos] = useState(false);

  useEffect(() => {
    const cargarDatosYToken = async () => {
      try {
        const storedName = await SecureStore.getItemAsync("userName");
        if (storedName) {
          setNombre(storedName);
        } else {
          const raw = await SecureStore.getItemAsync("user");
          if (raw) {
            const user = JSON.parse(raw);
            const posibleNombre =
              user.name ||
              user.nombre ||
              user.fullName ||
              `${user.name || ""} ${user.last || user.apellido || ""}`.trim();
            const finalName = posibleNombre || "Usuario";
            setNombre(finalName);
            await SecureStore.setItemAsync("userName", finalName);
          } else {
            setNombre("Usuario");
          }
        }

        const storedAvatar = await SecureStore.getItemAsync("avatarUri");
        if (storedAvatar) setAvatarUri(storedAvatar);

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const expoToken = await Notifications.getExpoPushTokenAsync();
        const pushToken =
          (expoToken as any).data ?? (expoToken as any).pushToken ?? expoToken;

        console.log("📱 Expo pushToken:", pushToken);

        await api("/notificaciones/token", {
          method: "POST",
          body: { pushToken },
        });
      } catch (e) {
        console.log("Error en cargarDatosYToken:", e);
      }
    };

    cargarDatosYToken();
  }, []);

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const data = await api("/reservas");
        syncFromBackend(data);
      } catch (e) {
        console.log("Error cargando reservas:", e);
      }
    };

    cargarReservas();
  }, [syncFromBackend]);

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("userName");
      await SecureStore.deleteItemAsync("avatarUri");
      router.replace("/auth/login");
    } catch (e) {
      console.log("Error al cerrar sesión:", e);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      let status = perm.status;

      if (status !== "granted") {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = req.status;

        if (status !== "granted") {
          if (!req.canAskAgain) {
            Alert.alert(
              "Permiso requerido",
              "Necesitamos acceso a tu galería para cambiar la foto de perfil. Podés habilitarlo desde la configuración de la app.",
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Abrir configuración", onPress: () => Linking.openSettings() },
              ]
            );
          } else {
            Alert.alert(
              "Permiso requerido",
              "Necesitamos acceso a tu galería para elegir una foto 🙏"
            );
          }
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await SecureStore.setItemAsync("avatarUri", uri);
    } catch (e) {
      console.log("Error eligiendo avatar:", e);
      Alert.alert(
        "Error",
        "Ocurrió un problema al seleccionar la foto. Intentá nuevamente."
      );
    }
  };

  const reservasVigentes = useMemo(
    () => reservas.filter((r) => daysDiffFromToday(r.fechaISO) >= 0),
    [reservas]
  );

  const tieneReservas = reservasVigentes.length > 0;

  const avisos = useMemo(
    () =>
      reservas
        .map((r) => ({ ...r, diff: daysDiffFromToday(r.fechaISO) }))
        .filter((r) => r.diff >= 0 && r.diff <= 2)
        .sort((a, b) => a.diff - b.diff),
    [reservas]
  );

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <View style={s.bgCircleTop} />
        <View style={s.bgCircleMid} />

        <View style={s.header}>
          <TouchableOpacity onPress={handlePickAvatar} style={s.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{nombre?.charAt(0).toUpperCase() ?? "?"}</Text>
              </View>
            )}
            <Text style={s.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>

          <View>
            <Text style={s.hello}>Hello,</Text>
            <Text style={s.username}>{nombre}</Text>
          </View>

          <View style={s.headerRight}>
            <TouchableOpacity
              style={s.bellWrapper}
              onPress={() => setOpenAvisos(true)}
            >
              <Text style={s.bell}>🛎️</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={logout} style={s.logoutBtn}>
              <Text style={s.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.titleWrapper}>
          <View style={s.titleRow}>
            <View style={s.titleLine} />
            <Text style={s.titleText}>Mis reservas</Text>
            <View style={s.titleLine} />
          </View>

          <View style={s.statsChip}>
            <Text style={s.statsText}>
              {tieneReservas
                ? `Tienes ${reservasVigentes.length} reserva${reservasVigentes.length > 1 ? "s" : ""}`
                : "Cuando crees una reserva aparecerá aquí"}
            </Text>
          </View>
        </View>

        <View style={s.cardListWrapper}>
          <View style={s.cardList}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "35%" }]}>Fecha</Text>
              <Text style={[s.th, { width: "65%" }]}>Medico</Text>
            </View>

            <ScrollView
              style={s.scroll}
              contentContainerStyle={reservasVigentes.length === 0 ? { paddingVertical: 18 } : undefined}
            >
              {reservasVigentes.length === 0 ? (
                <Text style={s.emptyText}>Aún no tienes reservas próximas.</Text>
              ) : (
                reservasVigentes.map((r: Reserva) => (
                  <View key={r.id} style={s.row}>
                    <View style={s.colFecha}>
                      <Text style={s.date}>{toDDMMYYYY(r.fechaISO)}</Text>
                      <Text style={s.hour}>{r.hora}</Text>
                    </View>

                    <View style={s.colMedico}>
                      <Text style={s.doctor}>{r.profesional}</Text>
                      <Text style={s.meta}>Especialidad: {r.area}</Text>
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{r.modalidad ?? "Presencial"}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        <View style={s.bottomBar}>
          <TouchableOpacity onPress={() => router.replace("/medico/HomeScreen")} style={s.bottomBtn}>
            <Text style={s.bottomIcon}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/medico/Horario_servicioScreen")} style={s.bottomBtn}>
            <Text style={s.bottomIcon}>🕒</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/medico/InformesScreen")} style={s.bottomBtn}>
            <Text style={s.bottomIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={openAvisos} transparent animationType="fade" onRequestClose={() => setOpenAvisos(false)}>
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Reservas próximas</Text>

              {avisos.length === 0 ? (
                <Text style={s.modalEmpty}>No tienes reservas en los próximos días.</Text>
              ) : (
                avisos.map((r) => (
                  <View key={r.id} style={s.modalRow}>
                    <Text style={s.modalDate}>{toDDMMYYYY(r.fechaISO)} • {r.hora}</Text>
                    <Text style={s.modalText}>{r.profesional}</Text>
                    <Text style={s.modalSub}>
                      Área: {r.area} • {r.diff === 0 ? "Es hoy" : r.diff === 1 ? "Mañana" : `En ${r.diff} días`}
                    </Text>
                  </View>
                ))
              )}

              <TouchableOpacity style={s.modalBtn} onPress={() => setOpenAvisos(false)}>
                <Text style={s.modalBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF3F6",
  },
  container: {
    flex: 1,
    backgroundColor: "#EEF3F6",
    paddingBottom: 110,
  },

  bgCircleTop: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#D8E9EE",
    opacity: 0.5,
  },
  bgCircleMid: {
    position: "absolute",
    top: 260,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E1EBF3",
    opacity: 0.6,
  },

  header: {
    backgroundColor: "#0E3A46",
    width: "100%",
    height: 130,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 5,
    zIndex: 2,
  },
  avatarWrapper: {
    marginRight: 14,
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 2,
  },

  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 2,
    backgroundColor: "#D8E9EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#0E3A46",
    fontWeight: "700",
    fontSize: 18,
  },

  changePhotoText: {
    fontSize: 10,
    color: "#D8E9EE",
  },
  hello: {
    color: "#D8E9EE",
    fontSize: 13,
  },
  username: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 2,
  },

  headerRight: {
    marginLeft: "auto",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  bellWrapper: {
    backgroundColor: "#ffffff33",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  bell: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  logoutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.9,
  },

  titleWrapper: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#CAD3DC",
  },
  titleText: {
    marginHorizontal: 12,
    fontSize: 22,
    color: "#0E3A46",
    fontWeight: "600",
  },
  statsChip: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#D0E9E6",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statsText: {
    fontSize: 11,
    color: "#0E3A46",
    fontWeight: "600",
  },

  cardListWrapper: {
    marginTop: 14,
    alignItems: "center",
  },
  cardList: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#0E3A46",
    overflow: "hidden",
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  tableHeader: {
    backgroundColor: "#E6EDF2",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  th: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 13,
  },
  scroll: {
    maxHeight: 430,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
  },
  colFecha: {
    width: "35%",
  },
  colMedico: {
    width: "65%",
    paddingLeft: 4,
  },
  date: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12,
  },
  hour: {
    color: "#4B5563",
    fontSize: 12,
    marginTop: 2,
  },
  doctor: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },
  meta: {
    color: "#4B5563",
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#D0E9E6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: "#0E3A46",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
    textAlign: "center",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 82,
    backgroundColor: "#0E3A46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 42,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomIcon: {
    color: "#FFFFFF",
    fontSize: 22,
  },

  chatBotBtn: {
    position: "absolute",
    left: 26,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0E3A46",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 8,
  },
  chatIcon: {
    fontSize: 30,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "86%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E3A46",
    marginBottom: 8,
    textAlign: "center",
  },
  modalEmpty: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 12,
  },
  modalRow: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 6,
  },
  modalDate: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 13,
  },
  modalText: {
    color: "#111827",
    fontSize: 13,
  },
  modalSub: {
    color: "#6B7280",
    fontSize: 12,
  },
  modalBtn: {
    marginTop: 10,
    backgroundColor: "#0E3A46",
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
