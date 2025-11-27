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


r.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows1] = await pool.query(
      `
      SELECT
        r.id,
        s.nombre AS area,
        CONCAT(u.name, ' ', u.last) AS profesional,
        DATE_FORMAT(r.fecha, '%Y-%m-%d') AS fechaISO,
        DATE_FORMAT(r.hora_inicio, '%H:%i') AS hora,
        'Presencial' AS modalidad
      FROM reservas r
      JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
      JOIN servicios s ON hs.servicio_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE r.user_id = ?
      ORDER BY r.fecha, r.hora_inicio
      `,
      [userId]
    );

    const [rows2] = await pool.query(
      `
      SELECT
        id,
        area,
        profesional,
        fechaISO,
        hora,
        modalidad
      FROM reservas_chatbot
      WHERE user_id = ?
      ORDER BY fechaISO, hora
      `,
      [userId]
    );

    const mapa1 = rows1.map((r) => ({
      id: `db-${r.id}`,        
      area: r.area,
      profesional: r.profesional || "Profesional",
      fechaISO: r.fechaISO,
      hora: r.hora,
      modalidad: r.modalidad,
    }));

    const mapa2 = rows2.map((r) => ({
      id: `cb-${r.id}`,       
      area: r.area,
      profesional: r.profesional,
      fechaISO: r.fechaISO,
      hora: r.hora,
      modalidad: r.modalidad,
    }));

    const todas = [...mapa1, ...mapa2].sort((a, b) =>
      (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)
    );

    return res.json(todas);
  } catch (err) {
    console.error("Error GET /reservas:", err);
    return res.status(500).json({ error: "Error obteniendo reservas" });
  }
});


r.post("/", auth, async (req, res) => {
  const userId = req.user.id;
  const { area, profesional, fechaISO, hora, modalidad = "presencial" } =
    req.body || {};

  if (!area || !profesional || !fechaISO || !hora) {
    return res.status(400).json({ error: "Faltan datos de la reserva" });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO reservas_chatbot (user_id, area, profesional, fechaISO, hora, modalidad)
      VALUES (?,?,?,?,?,?)
      `,
      [userId, area, profesional, fechaISO, hora, modalidad]
    );

    const id = result.insertId;

    return res.status(201).json({
      id: `cb-${id}`,
      area,
      profesional,
      fechaISO,
      hora,
      modalidad,
    });
  } catch (err) {
    console.error("Error POST /reservas:", err);
    return res.status(500).json({ error: "Error al crear la reserva" });
  }
});

export default r;
