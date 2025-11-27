import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const r = Router();

const MIN_HOURS_BEFORE_CANCEL = 12;

// ---------- Middleware de auth ----------
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

// ---------- Helpers ----------
function toDateTime(fechaISO, hora) {
  const h = hora && hora.trim() !== "" ? hora : "00:00";
  return new Date(`${fechaISO}T${h}:00`);
}

// Une reservas de la APP (tabla normalizada) + reservas del chatbot
async function traerTodasPorUsuario(userId) {
  const [appRows] = await pool.query(
    `
    SELECT
      r.id,
      s.nombre                              AS area,
      CONCAT(u.name, ' ', u.last)           AS profesional,
      DATE_FORMAT(hs.fecha, '%Y-%m-%d')     AS fechaISO,
      TIME_FORMAT(hs.hora_inicio, '%H:%i')  AS hora,
      'Presencial'                          AS modalidad
    FROM reservas r
    JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
    JOIN servicios s        ON hs.servicio_id = s.id
    JOIN users u            ON s.user_id = u.id
    WHERE r.user_id = ?
    `,
    [userId]
  );

  const desdeApp = appRows.map((r) => ({
    id: String(r.id),
    userId,
    area: r.area,
    profesional: r.profesional,
    fechaISO: r.fechaISO,
    hora: r.hora,
    modalidad: r.modalidad,
    origen: "app",
  }));

  const [chatbotRows] = await pool.query(
    `
    SELECT id, area, profesional, fechaISO, hora, modalidad
    FROM reservas_chatbot
    WHERE user_id = ?
    `,
    [userId]
  );

  const desdeChatbot = chatbotRows.map((r) => ({
    id: String(r.id),
    userId,
    area: r.area,
    profesional: r.profesional,
    fechaISO: r.fechaISO,
    hora: r.hora,
    modalidad: r.modalidad,
    origen: "chatbot",
  }));

  const todas = [...desdeApp, ...desdeChatbot].sort((a, b) =>
    (a.fechaISO + a.hora).localeCompare(b.fechaISO + b.hora)
  );

  return todas;
}

// -------- LISTAR --------
r.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const todas = await traerTodasPorUsuario(userId);
    return res.json(todas);
  } catch (err) {
    console.error("[RESERVAS] error al listar /:", err);
    return res.status(500).json({ error: "Error al obtener reservas" });
  }
});

r.get("/upcoming", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const todas = await traerTodasPorUsuario(userId);
    const ahora = new Date();

    const futuras = todas.filter((r) => {
      const fechaHora = toDateTime(r.fechaISO, r.hora);
      return fechaHora >= ahora;
    });

    return res.json(futuras);
  } catch (err) {
    console.error("[RESERVAS] error en /upcoming:", err);
    return res.status(500).json({ error: "Error al obtener reservas próximas" });
  }
});

r.get("/historial", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const todas = await traerTodasPorUsuario(userId);
    const ahora = new Date();

    const pasadas = todas.filter((r) => {
      const fechaHora = toDateTime(r.fechaISO, r.hora);
      return fechaHora < ahora;
    });

    return res.json(pasadas);
  } catch (err) {
    console.error("[RESERVAS] error en /historial:", err);
    return res.status(500).json({ error: "Error al obtener historial" });
  }
});

// -------- CREAR RESERVA DESDE LA APP --------
r.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { area, profesional, fechaISO, hora, modalidad } = req.body;

    if (!area || !profesional || !fechaISO || !hora) {
      return res.status(400).json({ error: "Faltan datos de la reserva" });
    }

    const partes = String(profesional).trim().split(" ");
    const last = partes.pop();
    const name = partes.join(" ") || last;

    const [rows] = await pool.query(
      `
      SELECT
        hs.id,
        hs.fecha,
        TIME_FORMAT(hs.hora_inicio, '%H:%i') AS hora_inicio,
        TIME_FORMAT(hs.hora_fin, '%H:%i')    AS hora_fin
      FROM horario_servicio hs
      JOIN servicios s ON hs.servicio_id = s.id
      JOIN users u     ON s.user_id = u.id
      WHERE
        s.nombre = ?
        AND hs.fecha = ?
        AND TIME_FORMAT(hs.hora_inicio, '%H:%i') = ?
        AND u.name = ?
        AND u.last = ?
      `,
      [area, fechaISO, hora, name, last]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        error:
          "No se encontró un horario válido para esa combinación de área, profesional, fecha y hora.",
      });
    }

    const hs = rows[0];

    const [result] = await pool.query(
      `
      INSERT INTO reservas (
        user_id,
        horario_servicio_id,
        estado,
        fecha,
        hora_inicio,
        hora_fin
      )
      VALUES (?, ?, 'pendiente', ?, ?, ?)
      `,
      [userId, hs.id, fechaISO, hs.hora_inicio, hs.hora_fin]
    );

    const nuevaId = result.insertId;

    return res.json({
      id: String(nuevaId),
      userId,
      area,
      profesional,
      fechaISO,
      hora,
      modalidad: modalidad || "Presencial",
      origen: "app",
    });
  } catch (err) {
    console.error("[RESERVAS] error al crear reserva:", err);
    return res.status(500).json({ error: "Error al crear la reserva" });
  }
});

// -------- CANCELAR --------
r.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    let origen = null;
    let reserva = null;

    const [rowsApp] = await pool.query(
      `
      SELECT
        r.id,
        r.user_id,
        DATE_FORMAT(hs.fecha, '%Y-%m-%d')   AS fechaISO,
        TIME_FORMAT(hs.hora_inicio, '%H:%i') AS hora
      FROM reservas r
      JOIN horario_servicio hs ON r.horario_servicio_id = hs.id
      WHERE r.id = ?
      `,
      [id]
    );

    if (rowsApp.length > 0) {
      const rApp = rowsApp[0];

      if (rApp.user_id !== userId) {
        return res.status(403).json({ error: "No puedes cancelar esta reserva" });
      }

      origen = "app";
      reserva = {
        id: rApp.id,
        fechaISO: rApp.fechaISO,
        hora: rApp.hora,
      };
    }

    if (!reserva) {
      const [rowsChatbot] = await pool.query(
        `
        SELECT id, user_id, fechaISO, hora
        FROM reservas_chatbot
        WHERE id = ?
        `,
        [id]
      );

      if (rowsChatbot.length === 0) {
        return res.status(404).json({ error: "Reserva no encontrada" });
      }

      const rCb = rowsChatbot[0];

      if (rCb.user_id !== userId) {
        return res.status(403).json({ error: "No puedes cancelar esta reserva" });
      }

      origen = "chatbot";
      reserva = {
        id: rCb.id,
        fechaISO: rCb.fechaISO,
        hora: rCb.hora,
      };
    }

    const fechaReserva = toDateTime(reserva.fechaISO, reserva.hora);
    const ahora = new Date();
    const diffMs = fechaReserva.getTime() - ahora.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (diffHoras < MIN_HOURS_BEFORE_CANCEL) {
      return res.status(400).json({
        error: `Solo se puede cancelar con al menos ${MIN_HOURS_BEFORE_CANCEL} horas de anticipación`,
      });
    }

    if (origen === "app") {
      await pool.query(`DELETE FROM reservas WHERE id = ?`, [id]);
    } else if (origen === "chatbot") {
      await pool.query(`DELETE FROM reservas_chatbot WHERE id = ?`, [id]);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[RESERVAS] error al cancelar:", err);
    return res.status(500).json({ error: "Error al cancelar reserva" });
  }
});

export default r;
