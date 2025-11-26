// routes/medico/horariosmedico.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js"; // ajusta path si tu estructura es distinta

const router = Router();

/**
 * Middleware auth: pone req.user = { id, role, ... }
 */
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * Helper: obtener negocio_id asociado al médico
 * - se asume que los servicios del médico están ligados a un negocio (negocio_id).
 * - si tiene varios -> tomamos el primero (si tu lógica es otra, la adaptás).
 */
async function getNegocioIdForMedico(medicoId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT negocio_id FROM servicios WHERE user_id = ? LIMIT 1`,
    [medicoId]
  );
  if (rows.length === 0) return null;
  return rows[0].negocio_id;
}

/* ===========================================================
   GET /horarioo
   Devuelve la semana completa con:
     - horario_medico (id, hora_inicio, hora_fin, abierto) o null si no existe
     - negocio_abierto: true/false según horarios (tabla horarios)
   Ruta montada en tu app como /api/horariosm/horarioo
=========================================================== */
router.get("/horarioo", auth, async (req, res) => {
  try {
    const medicoId = req.user.id;

    // 1) obtener negocio asociado
    const negocioId = await getNegocioIdForMedico(medicoId);

    // días en orden lógico
    const DIAS = [
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
      "domingo",
    ];

    // 2) Traer horarios_medico existentes
    const [medRows] = await pool.query(
      `SELECT id, dia_semana, hora_inicio, hora_fin, abierto
       FROM horarios_medico
       WHERE medico_id = ?`,
      [medicoId]
    );

    // 3) Traer horarios del negocio (si tenemos negocioId)
    let negocioRows = [];
    if (negocioId) {
      const [brows] = await pool.query(
        `SELECT dia_semana, abierto AS negocio_abierto, hora_inicio AS negocio_hora_inicio, hora_fin AS negocio_hora_fin
         FROM horarios
         WHERE negocio_id = ?`,
        [negocioId]
      );
      negocioRows = brows;
    }

    // 4) construir respuesta: por cada día, devolver estado combinado
    const data = DIAS.map((dia) => {
      const med = medRows.find((m) => m.dia_semana === dia) || null;
      const neg = negocioRows.find((n) => n.dia_semana === dia) || null;

      return {
        dia_semana: dia,
        medico: med
          ? {
              id: med.id,
              hora_inicio: med.hora_inicio,
              hora_fin: med.hora_fin,
              abierto: !!med.abierto,
            }
          : null,
        negocio_abierto: !!(neg && Number(neg.negocio_abierto) === 1),
        negocio_hora_inicio: neg ? neg.negocio_hora_inicio : null,
        negocio_hora_fin: neg ? neg.negocio_hora_fin : null,
      };
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error("Error GET /horarioo:", err);
    res.status(500).json({ ok: false, msg: "Error en servidor" });
  }
});

/* ===========================================================
   POST /guardar
   Guarda/actualiza el horario de UN día para el médico.
   Verifica que el negocio esté abierto ese día antes de permitir abierto=true.
   Ruta: /api/horariosm/guardar
=========================================================== */
router.post("/guardar", auth, async (req, res) => {
  try {
    const medicoId = req.user.id;
    const { dia_semana, hora_inicio, hora_fin, abierto } = req.body;

    if (!dia_semana) return res.status(400).json({ error: "Falta el día" });

    // validaciones básicas
    if (abierto && (!hora_inicio || !hora_fin))
      return res.status(400).json({ error: "Horas requeridas" });

    if (abierto && hora_inicio >= hora_fin)
      return res
        .status(400)
        .json({ error: "hora_inicio debe ser menor a hora_fin" });

    // obtener negocio del medico
    const negocioId = await getNegocioIdForMedico(medicoId);

    if (!negocioId) {
      // Si no existe negocio asociado, asumimos que no puede abrir.
      if (abierto) {
        return res.status(400).json({
          error:
            "No se encontró un negocio asociado al médico. No puede marcar abierto.",
        });
      }
    } else {
      // obtener horario del negocio para ese día
      const [neg] = await pool.query(
        `SELECT abierto FROM horarios WHERE negocio_id = ? AND dia_semana = ? LIMIT 1`,
        [negocioId, dia_semana]
      );

      if (neg.length === 0) {
        // no hay horario del negocio para ese día -> lo tratamos como cerrado
        if (abierto) {
          return res.status(400).json({
            error:
              "El negocio no tiene horario configurado para ese día. No puede abrir.",
          });
        }
      } else {
        const negocioAbierto = Number(neg[0].abierto) === 1;
        if (!negocioAbierto && abierto) {
          return res.status(400).json({
            error:
              "El negocio está cerrado este día. El médico no puede abrir.",
          });
        }
      }
    }

    // revisar si ya existe (por medico + dia)
    const [existe] = await pool.query(
      `SELECT id FROM horarios_medico WHERE medico_id = ? AND dia_semana = ?`,
      [medicoId, dia_semana]
    );

    if (existe.length > 0) {
      await pool.query(
        `UPDATE horarios_medico
         SET hora_inicio = ?, hora_fin = ?, abierto = ?
         WHERE medico_id = ? AND dia_semana = ?`,
        [hora_inicio || null, hora_fin || null, abierto ? 1 : 0, medicoId, dia_semana]
      );
    } else {
      await pool.query(
        `INSERT INTO horarios_medico (medico_id, dia_semana, hora_inicio, hora_fin, abierto)
         VALUES (?, ?, ?, ?, ?)`,
        [medicoId, dia_semana, hora_inicio || null, hora_fin || null, abierto ? 1 : 0]
      );
    }

    res.json({ ok: true, msg: "Horario actualizado" });
  } catch (err) {
    console.error("Error POST /guardar:", err);
    res.status(500).json({ ok: false, msg: "Error en servidor" });
  }
});

export default router;
