import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const r = express.Router();


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

//reservas del paciente
r.get("/", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.estado, 
              hs.fecha, hs.hora_inicio, hs.hora_fin,
              s.nombre AS servicio, u.name AS medico_name, u.last AS medico_last
       FROM reservas r
       JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
       JOIN servicios s ON hs.servicio_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE r.user_id = ?
       ORDER BY hs.fecha ASC, hs.hora_inicio ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (e) {
    console.error("Error cargando reservas paciente:", e);
    res.status(500).json({ error: "Error al cargar reservas" });
  }
});

r.get("/medico/:medicoId", async (req, res) => {
  const { medicoId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.estado, r.fecha_creacion,
              hs.fecha, hs.hora_inicio, hs.hora_fin,
              s.nombre AS servicio,
              u.id AS paciente_id, u.name AS paciente_name, u.last AS paciente_last
       FROM reservas r
       JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
       JOIN servicios s ON hs.servicio_id = s.id
       JOIN users u ON r.user_id = u.id
       WHERE s.user_id = ?
       ORDER BY hs.fecha ASC, hs.hora_inicio ASC`,
      [medicoId]
    );

    res.json(rows);
  } catch (e) {
    console.error("Error cargando reservas médico:", e);
    res.status(500).json({ error: "Error al obtener reservas del médico" });
  }
});

export default r;