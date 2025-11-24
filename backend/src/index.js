import express from "express";
import cors from "cors";
import dotenv from "dotenv";


dotenv.config({ override: true });

import chatbotRoutes from "./chatbot.routes.js";
import authRoutes from "./auth.routes.js";
import reservasRoutes from "./reservasroutes.js";
import notificacionesRoutes from "./notificaciones.routes.js";
import { pool } from "./db.js";

console.log(
  "🔑 GROQ_API_KEY cargada (primeros 5 chars):",
  process.env.GROQ_API_KEY?.slice(0, 5)
);

const app = express();

const ORIGIN = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());


app.use("/api/chatbot", chatbotRoutes);


pool
  .query("SELECT 1")
  .then(() => console.log("✅ MySQL disponible"))
  .catch((e) => console.log("⚠️ MySQL NO disponible:", e.message));

app.use((req, _res, next) => {
  console.log("➡️", req.method, req.url);
  next();
});


app.get("/api/health", (_req, res) => res.json({ ok: true }));


app.use("/api/auth", authRoutes);
app.use("/api/reservas", reservasRoutes); 



app.use((req, res) => res.status(404).json({ error: "Not found" }));


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API escuchando en http://0.0.0.0:${PORT}`);
});
