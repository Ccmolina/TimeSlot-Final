import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const r = Router();

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// 🔹 ÁREAS
r.get("/areas", auth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT nombre AS area
       FROM servicios
       ORDER BY nombre`
    );

    const lista = rows.map((x) => x.area);
    console.log("🔎 /opciones/areas →", lista);
    return res.json(lista);
  } catch (e) {
    console.error("Error cargando áreas:", e.message);
    return res
      .status(500)
      .json({ error: "Error al cargar áreas desde la base de datos" });
  }
});

// 🔹 PROFESIONALES POR ÁREA
r.get("/profesionales", auth, async (req, res) => {
  const { area } = req.query;
  if (!area) {
    return res.status(400).json({ error: "Falta parámetro area" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.last
       FROM servicios s
       JOIN users u ON s.user_id = u.id
       WHERE s.nombre = ?
       ORDER BY u.name, u.last`,
      [area]
    );

    const lista = rows.map((r) => `${r.name} ${r.last}`);
    console.log("🔎 /opciones/profesionales →", area, "=>", lista);
    return res.json(lista);
  } catch (e) {
    console.error("Error cargando profesionales:", e.message);
    return res
      .status(500)
      .json({ error: "Error al cargar profesionales desde la base de datos" });
  }
});

// 🔹 HORAS DISPONIBLES (tiene en cuenta reservas + reservas_chatbot)
r.get("/horas", auth, async (req, res) => {
  const { area, profesional, fecha } = req.query;

  if (!area || !profesional || !fecha) {
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  try {
    const partes = String(profesional).trim().split(" ");
    const last = partes.pop();
    const name = partes.join(" ") || last;

    const [rows] = await pool.query(
      `
      SELECT
        hs.id,
        TIME_FORMAT(hs.hora_inicio, '%H:%i') AS hora_inicio,
        TIME_FORMAT(hs.hora_fin, '%H:%i')   AS hora_fin
      FROM horario_servicio hs
      JOIN servicios s ON hs.servicio_id = s.id
      JOIN users u     ON s.user_id = u.id
      WHERE
        s.nombre = ? AND
        hs.fecha = ? AND
        u.name = ? AND
        u.last = ?
        AND hs.id NOT IN (
          SELECT horario_servicio_id
          FROM reservas
          WHERE estado IN ('pendiente','confirmada')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM reservas_chatbot rc
          WHERE
            rc.area = s.nombre
            AND rc.profesional = CONCAT(u.name, ' ', u.last)
            AND rc.fechaISO = DATE_FORMAT(hs.fecha, '%Y-%m-%d')
            AND rc.hora = TIME_FORMAT(hs.hora_inicio, '%H:%i')
        )
      ORDER BY hs.hora_inicio
      `,
      [area, fecha, name, last]
    );

    const horas = rows.map((r) => r.hora_inicio);
    console.log("🔎 /opciones/horas →", { area, profesional, fecha }, "=>", horas);
    return res.json({ horas });
  } catch (e) {
    console.error("Error cargando horas:", e.message);
    return res
      .status(500)
      .json({ error: "Error al cargar horas desde la base de datos" });
  }
});

// 🔹 DÍAS DISPONIBLES (también respeta reservas_chatbot)
r.get("/dias-disponibles", auth, async (req, res) => {
  const { area, profesional, mes } = req.query;

  if (!area || !profesional || !mes) {
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  try {
    const partes = String(profesional).trim().split(" ");
    const last = partes.pop();
    const name = partes.join(" ") || last;

    const [rows] = await pool.query(
      `
      SELECT DISTINCT
        DATE_FORMAT(hs.fecha, '%Y-%m-%d') AS fechaISO
      FROM horario_servicio hs
      JOIN servicios s ON hs.servicio_id = s.id
      JOIN users u     ON s.user_id = u.id
      WHERE
        s.nombre = ? AND
        DATE_FORMAT(hs.fecha, '%Y-%m') = ? AND
        u.name = ? AND
        u.last = ?
        AND hs.id NOT IN (
          SELECT horario_servicio_id
          FROM reservas
          WHERE estado IN ('pendiente','confirmada')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM reservas_chatbot rc
          WHERE
            rc.area = s.nombre
            AND rc.profesional = CONCAT(u.name, ' ', u.last)
            AND rc.fechaISO = DATE_FORMAT(hs.fecha, '%Y-%m-%d')
            AND rc.hora = TIME_FORMAT(hs.hora_inicio, '%H:%i')
        )
      ORDER BY fechaISO
      `,
      [area, mes, name, last]
    );

    const dias = rows.map((r) => r.fechaISO);
    console.log(
      "🔎 /opciones/dias-disponibles →",
      { area, profesional, mes },
      "=>",
      dias
    );
    return res.json({ dias });
  } catch (e) {
    console.error("Error cargando días disponibles:", e.message);
    return res
      .status(500)
      .json({ error: "Error al cargar días disponibles" });
  }
});

export default r;
