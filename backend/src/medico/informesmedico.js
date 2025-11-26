import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

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

router.get("/reservasm", auth, async (req, res) => {
  try {
    const medicoId = req.user.id;

    const [rows] = await pool.query(`
      SELECT DATE(r.fecha_creacion) AS fecha, COUNT(*) AS total_reservas
      FROM reservas r
      JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
      JOIN servicios s ON hs.servicio_id = s.id
      WHERE r.estado = 'confirmada' AND s.user_id = ?
      GROUP BY DATE(r.fecha_creacion)
      ORDER BY fecha ASC
    `, [medicoId]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Error en servidor" });
  }
});




router.get("/cancelacionesm", auth, async (req, res) => {
  try {
    const medicoId = req.user.id;

    const [rows] = await pool.query(`
      SELECT DATE(r.fecha_creacion) AS fecha, COUNT(*) AS total_cancelaciones
      FROM reservas r
      JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
      JOIN servicios s ON hs.servicio_id = s.id
      WHERE r.estado = 'cancelada' AND s.user_id = ?
      GROUP BY DATE(r.fecha_creacion)
      ORDER BY fecha ASC
    `, [medicoId]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Error en servidor" });
  }
});


router.get("/serviciosm", auth, async (req, res) => {
  try {
    const medicoId = req.user.id;

    const [rows] = await pool.query(`
      SELECT s.nombre AS nombre_servicio, COUNT(r.id) AS total
      FROM reservas r
      JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
      JOIN servicios s ON hs.servicio_id = s.id
      WHERE r.estado='confirmada' AND s.user_id = ?
      GROUP BY s.servicio_id
      ORDER BY total DESC
    `, [medicoId]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: "Error en servidor" });
  }
});


export default router;
