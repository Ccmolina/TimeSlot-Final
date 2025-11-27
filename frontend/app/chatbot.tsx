import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useReservas } from "./store/reservas";

const API_URL = "http://192.168.12.197:4000/api";

export default function ChatbotScreen() {
  const addReserva = useReservas((s) => s.add);

  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { id: string; from: "user" | "bot"; text: string }[]
  >([]);
  const [context, setContext] = useState<any>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // 👉 Cargar token desde SecureStore o AsyncStorage
  useEffect(() => {
    (async () => {
      let t: string | null = null;

      try {
        t = await SecureStore.getItemAsync("token");
      } catch (e) {
        console.log("Error leyendo token desde SecureStore en Chatbot:", e);
      }

      if (!t) {
        try {
          t = (await AsyncStorage.getItem("token")) || null;
        } catch (e) {
          console.log("Error leyendo token desde AsyncStorage en Chatbot:", e);
        }
      }

      console.log("🔑 Token en Chatbot:", t ? "EXISTE" : "NO HAY");
      setToken(t);
    })();
  }, []);

  // Mensaje inicial del bot
  useEffect(() => {
    setMessages([
      {
        id: "bot-0",
        from: "bot",
        text:
          "Hola 👋 Soy el asistente de TimeSlot.\n" +
          'Podés preguntarme cosas o decirme: *"quiero hacer una reserva"*.',
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !token || sending) {
      console.log(
        "No se envía mensaje. token:",
        token,
        "sending:",
        sending
      );
      return;
    }

    const userText = input.trim();
    const normalized = userText.toLowerCase().trim();
    const ctxBefore = context;

    setInput("");

    const userMsg = {
      id: `user-${Date.now()}`,
      from: "user" as const,
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);

    setSending(true);

    try {
      const resp = await fetch(`${API_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          context,
        }),
      });

      console.log("STATUS CHATBOT:", resp.status);

      let data: any;
      try {
        data = await resp.json();
      } catch (e) {
        console.log("No se pudo parsear JSON del chatbot", e);
        data = {};
      }
      console.log("DATA CHATBOT:", data);

      if (!resp.ok) {
        const msgError =
          data.error ||
          `Error del servidor (${resp.status}). Intentá de nuevo más tarde.`;
        const botError = {
          id: `bot-error-${Date.now()}`,
          from: "bot" as const,
          text: msgError,
        };
        setMessages((prev) => [...prev, botError]);
        return;
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        from: "bot" as const,
        text: data.reply || "No entendí, probá de nuevo 😅",
      };

      setMessages((prev) => [...prev, botMsg]);
      setContext(data.context || {});

      // --------- Lógica para guardar reserva local si el backend confirma ---------
      const c = ctxBefore || {};
      const normalizedReply = (data.reply || "").toLowerCase();

      const isConfirmMessage =
        normalized === "si" ||
        normalized === "sí" ||
        normalized.includes("confirm");

      const hasDataForReserva =
        c.intent === "crear_reserva" &&
        c.area &&
        c.profesional &&
        c.fechaISO &&
        c.hora &&
        c.modalidad;

      const looksLikeSuccess =
        normalizedReply.includes("tu reserva fue creada correctamente") ||
        normalizedReply.includes("reserva fue creada correctamente");

      if (isConfirmMessage && hasDataForReserva && looksLikeSuccess) {
        addReserva({
          id: String(Date.now()),
          area: c.area,
          profesional: c.profesional,
          fechaISO: c.fechaISO,
          hora: c.hora,
          modalidad:
            c.modalidad.toLowerCase() === "virtual" ? "Virtual" : "Presencial",
        });
      }
    } catch (err) {
      console.error("Error llamando al chatbot:", err);
      const botError = {
        id: `bot-error-${Date.now()}`,
        from: "bot" as const,
        text:
          "Ups, hubo un error al hablar con el asistente 😓. Probá de nuevo más tarde.",
      };
      setMessages((prev) => [...prev, botError]);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUser = item.from === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.rowUser : styles.rowBot,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarBot}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.userText : styles.botText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      {/* HEADER */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Asistente TimeSlot</Text>
            <Text style={styles.headerSubtitle}>IA para reservas rápidas</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En línea</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesContainer}
        keyboardShouldPersistTaps="handled"
      />

      {/* INPUT */}
      <View style={styles.inputBar}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && { opacity: 0.7 }]}
            onPress={sendMessage}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF3F6" },

  headerWrapper: {
    backgroundColor: "#0E3A46",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    height: 86,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
  },
  back: { fontSize: 22, color: "#FFFFFF", fontWeight: "bold" },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#D8E9EE",
    marginTop: 2,
  },
  headerRight: {
    marginLeft: "auto",
    alignItems: "flex-end",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D0E9E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0E3A46",
  },

  messagesContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 90,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },

  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D0E9E6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginTop: 4,
  },
  avatarText: {
    fontSize: 18,
  },

  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#0E3A46",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#D0E9E6",
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  userText: { color: "#FFFFFF" },
  botText: { color: "#111827" },

  inputBar: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#D0E9E6",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#111827",
  },
  sendButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0E3A46",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  sendText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
