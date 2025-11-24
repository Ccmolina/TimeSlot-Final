import Groq from "groq-sdk";

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("❌ Falta GROQ_API_KEY en el .env");
      throw new Error("Falta GROQ_API_KEY");
    }

    console.log("🔑 Groq inicializado");
    client = new Groq({ apiKey });
  }

  return client;
}

export async function responderIA(mensaje) {
  try {
    const groq = getClient();

    const respuesta = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // ✅ Modelo nuevo GRATIS y funcionando
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente virtual llamado TimeSlotBot. Contestás siempre en español, breve y claro. Ayudás a reservar turnos médicos.",
        },
        { role: "user", content: mensaje },
      ],
    });

    return (
      respuesta.choices[0]?.message?.content ??
      "No pude generar una respuesta ahora."
    );
  } catch (err) {
    console.error("❌ Error con Groq:", err);
    return "Ahora mismo no puedo responder como asistente inteligente 😓. Probá de nuevo en un ratito.";
  }
}
