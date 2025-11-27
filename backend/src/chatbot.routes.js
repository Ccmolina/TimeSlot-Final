import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { responderIA } from "./ia.js";

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

r.post("/", auth, async (req, res) => {
  const { message = "", context = {} } = req.body || {};
  const texto = message.toLowerCase().trim();

  let ctx = { ...context };
  let reply = "";
  let readyToCreate = false;

  // 🔹 helpers para obtener opciones desde BD
  async function obtenerAreas() {
    const [rows] = await pool.query(
      `SELECT DISTINCT nombre AS area
       FROM servicios
       ORDER BY area`
    );
    return rows.map((r) => r.area);
  }

  async function obtenerProfesionalesPorArea(area) {
    const [rows] = await pool.query(
      `SELECT DISTINCT CONCAT(u.name, ' ', u.last) AS profesional
       FROM servicios s
       JOIN users u ON s.user_id = u.id
       WHERE s.nombre = ?
       ORDER BY profesional`,
      [area]
    );
    return rows.map((r) => r.profesional);
  }

  async function hayDisponibilidadEnFecha(area, profesional, fechaISO) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM horario_servicio hs
      JOIN servicios s ON hs.servicio_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 
        s.nombre = ?
        AND CONCAT(u.name, ' ', u.last) = ?
        AND hs.fecha = ?
        AND NOT EXISTS (
          SELECT 1 FROM reservas r
          WHERE r.horario_servicio_id = hs.id
            AND r.estado IN ('pendiente','confirmada')
        )
      LIMIT 1
      `,
      [area, profesional, fechaISO]
    );
    return rows.length > 0;
  }

  async function horasDisponibles(area, profesional, fechaISO) {
    const [rows] = await pool.query(
      `
      SELECT DATE_FORMAT(hs.hora_inicio, '%H:%i') AS hora
      FROM horario_servicio hs
      JOIN servicios s ON hs.servicio_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 
        s.nombre = ?
        AND CONCAT(u.name, ' ', u.last) = ?
        AND hs.fecha = ?
        AND NOT EXISTS (
          SELECT 1 FROM reservas r
          WHERE r.horario_servicio_id = hs.id
            AND r.estado IN ('pendiente','confirmada')
        )
      ORDER BY hs.hora_inicio ASC
      `,
      [area, profesional, fechaISO]
    );
    return rows.map((r) => r.hora);
  }


  if (!ctx.intent) {
    const quiereReserva =
      texto.includes("reserva") ||
      texto.includes("turno") ||
      texto.includes("cita");

    if (quiereReserva) {
      ctx.intent = "crear_reserva";

      try {
        const areas = await obtenerAreas();
        const listaAreas =
          areas.length > 0
            ? "\n\nÁreas disponibles:\n- " + areas.join("\n- ")
            : "";

        reply =
          "Perfecto, te ayudo a crear una reserva 🩺\n\n" +
          "¿Para qué área es? Escribí el nombre exacto de una de las áreas." +
          listaAreas;

        return res.json({ reply, context: ctx, readyToCreate });
      } catch (err) {
        console.error("Error obteniendo áreas:", err);
        reply =
          "Quiero ayudarte con tu reserva, pero no pude cargar las áreas desde el sistema 😓. Probá más tarde.";
        return res.json({ reply, context: ctx, readyToCreate: false });
      }
    }

   
    try {
      const iaReply = await responderIA(message, ctx);
      return res.json({
        reply: iaReply,
        context: ctx,
        readyToCreate: false,
      });
    } catch (err) {
      console.error("Error en responderIA:", err);
      return res.status(500).json({
        reply:
          "Hubo un problema al usar la IA 😓. Intentá de nuevo más tarde.",
        context: ctx,
        readyToCreate: false,
      });
    }
  }

  if (ctx.intent === "crear_reserva") {
    if (!ctx.area) {
      const areaIngresada = message.trim();

      try {
        const areas = await obtenerAreas();
        const existe = areas.includes(areaIngresada);

        if (!existe) {
          const listaAreas =
            areas.length > 0
              ? "\n\nAlgunas áreas disponibles son:\n- " + areas.join("\n- ")
              : "";
          reply =
            "Esa área no la encontré en el sistema ❌.\n" +
            "Por favor escribí exactamente el nombre de un área válida." +
            listaAreas;
          return res.json({ reply, context: ctx, readyToCreate });
        }

        ctx.area = areaIngresada;

        const profesionales = await obtenerProfesionalesPorArea(ctx.area);
        const listaProfes =
          profesionales.length > 0
            ? "\n\nProfesionales disponibles en esa área:\n- " +
              profesionales.join("\n- ")
            : "\n\n(No encontré profesionales para esa área)";

        reply =
          `Genial, área: *${ctx.area}* ✅\n\n` +
          "Ahora decime con qué profesional querés el turno.\n" +
          "Escribí el nombre exactamente como aparece:" +
          listaProfes;

        return res.json({ reply, context: ctx, readyToCreate });
      } catch (err) {
        console.error("Error validando área:", err);
        reply =
          "No pude validar el área en la base de datos 😓. Probá de nuevo dentro de unos minutos.";
        return res.json({ reply, context: ctx, readyToCreate: false });
      }
    }


    if (!ctx.profesional) {
      const profesionalIngresado = message.trim();

      try {
        const profesionales = await obtenerProfesionalesPorArea(ctx.area);
        const existe = profesionales.includes(profesionalIngresado);

        if (!existe) {
          const listaProfes =
            profesionales.length > 0
              ? "\n\nProfesionales válidos en esa área:\n- " +
                profesionales.join("\n- ")
              : "\n\n(No encontré profesionales para esa área)";
          reply =
            "Ese profesional no coincide con los que tengo en el sistema ❌.\n" +
            "Por favor escribí uno de la lista:" +
            listaProfes;
          return res.json({ reply, context: ctx, readyToCreate });
        }

        ctx.profesional = profesionalIngresado;
        reply =
          `Perfecto, profesional: *${ctx.profesional}* ✅\n\n` +
          "¿Para qué fecha lo querés? Usá el formato *AAAA-MM-DD* (Ej: 2025-11-20).";
        return res.json({ reply, context: ctx, readyToCreate });
      } catch (err) {
        console.error("Error validando profesional:", err);
        reply =
          "No pude validar el profesional en la base de datos 😓. Probá de nuevo dentro de unos minutos.";
        return res.json({ reply, context: ctx, readyToCreate: false });
      }
    }

   
    if (!ctx.fechaISO) {
      const fecha = message.trim();
      const esValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
      if (!esValida) {
        reply =
          "Formato de fecha inválido ❌. Por favor usá el formato *AAAA-MM-DD* (Ej: 2025-11-20).";
        return res.json({ reply, context: ctx, readyToCreate });
      }

      try {
        const hayDisp = await hayDisponibilidadEnFecha(
          ctx.area,
          ctx.profesional,
          fecha
        );
        if (!hayDisp) {
          reply =
            `Para *${ctx.area}* con *${ctx.profesional}* no encontré horarios libres el *${fecha}* ❌.\n` +
            "Probá con otra fecha (mismo formato AAAA-MM-DD).";
          return res.json({ reply, context: ctx, readyToCreate });
        }

        ctx.fechaISO = fecha;
        const horas = await horasDisponibles(ctx.area, ctx.profesional, fecha);
        const listaHoras =
          horas.length > 0
            ? "\n\nHoras disponibles para ese día:\n- " + horas.join("\n- ")
            : "";

        reply =
          `Fecha: *${ctx.fechaISO}* ✅\n\n` +
          "¿A qué hora? Usá el formato *HH:MM* en 24 horas (Ej: 14:30)." +
          listaHoras;

        return res.json({ reply, context: ctx, readyToCreate });
      } catch (err) {
        console.error("Error validando fecha:", err);
        reply =
          "No pude verificar la disponibilidad en esa fecha 😓. Probá de nuevo dentro de unos minutos.";
        return res.json({ reply, context: ctx, readyToCreate: false });
      }
    }

  
    if (!ctx.hora) {
      const hora = message.trim();
      const esValida = /^\d{2}:\d{2}$/.test(hora);
      if (!esValida) {
        reply =
          "Formato de hora inválido ❌. Usá el formato *HH:MM* en 24 horas (Ej: 09:00 o 14:30).";
        return res.json({ reply, context: ctx, readyToCreate });
      }

      try {
        const horas = await horasDisponibles(
          ctx.area,
          ctx.profesional,
          ctx.fechaISO
        );
        const existe = horas.includes(hora);

        if (!existe) {
          const listaHoras =
            horas.length > 0
              ? "\n\nHoras disponibles para ese día:\n- " + horas.join("\n- ")
              : "\n\n(No hay más horarios libres para ese día)";
          reply =
            "Esa hora no está disponible para ese día ❌." + listaHoras;
          return res.json({ reply, context: ctx, readyToCreate });
        }

        ctx.hora = hora;
        reply =
          `Hora: *${ctx.hora}* ✅\n\n` +
          "Por último, ¿la consulta es *presencial* o *virtual*?";
        return res.json({ reply, context: ctx, readyToCreate });
      } catch (err) {
        console.error("Error validando hora:", err);
        reply =
          "No pude validar la hora en la base de datos 😓. Probá de nuevo más tarde.";
        return res.json({ reply, context: ctx, readyToCreate: false });
      }
    }

    if (!ctx.modalidad) {
      let modalidad = message.toLowerCase().trim();
      if (modalidad.includes("pres")) modalidad = "presencial";
      if (modalidad.includes("vir")) modalidad = "virtual";

      if (modalidad !== "presencial" && modalidad !== "virtual") {
        reply =
          "No entendí la modalidad ❌. Decime si la consulta es *presencial* o *virtual*.";
        return res.json({ reply, context: ctx, readyToCreate });
      }

      ctx.modalidad = modalidad;

      readyToCreate = true;
      reply =
        "Perfecto, ya tengo todos los datos ✅\n\n" +
        `• Área: *${ctx.area}*\n` +
        `• Profesional: *${ctx.profesional}*\n` +
        `• Fecha: *${ctx.fechaISO}*\n` +
        `• Hora: *${ctx.hora}*\n` +
        `• Modalidad: *${ctx.modalidad}*\n\n` +
        "¿Querés que confirme esta reserva? Escribí *sí* para confirmar o *no* para cancelar.";
      return res.json({ reply, context: ctx, readyToCreate });
    }


    if (ctx.modalidad && !ctx.confirmado) {
      if (texto === "si" || texto === "sí" || texto.includes("confirm")) {
        ctx.confirmado = true;

        try {
          const [result] = await pool.query(
            "INSERT INTO reservas_chatbot(user_id, area, profesional, fechaISO, hora, modalidad) VALUES (?,?,?,?,?,?)",
            [
              req.user.id,
              ctx.area,
              ctx.profesional,
              ctx.fechaISO,
              ctx.hora,
              ctx.modalidad,
            ]
          );

          const reservaId = result.insertId;

          reply =
            "Listo 🙌 tu reserva fue creada correctamente.\n\n" +
            `🆔 Código de reserva: *#${reservaId}*\n` +
            `• Área: *${ctx.area}*\n` +
            `• Profesional: *${ctx.profesional}*\n` +
            `• Fecha: *${ctx.fechaISO}*\n` +
            `• Hora: *${ctx.hora}*\n` +
            `• Modalidad: *${ctx.modalidad}*\n\n` +
            "Gracias por usar el asistente de TimeSlot 💙";

          ctx = {};
          return res.json({ reply, context: ctx, readyToCreate: false });
        } catch (err) {
          console.error("Error creando reserva_chatbot:", err);
          reply =
            "Ups, hubo un error al crear la reserva 😢. Intentá de nuevo más tarde o hacela desde la pantalla de reservas.";
          return res.json({ reply, context: ctx, readyToCreate: false });
        }
      } else if (texto === "no" || texto.includes("cancel")) {
        ctx.confirmado = false;
        reply =
          "Ok, cancelé la creación de la reserva ❌.\n" +
          'Si querés, podés empezar otra diciendo: *"quiero hacer una reserva"*.';
        ctx = {};
        return res.json({ reply, context: ctx, readyToCreate: false });
      } else {
        reply =
          "No entendí 🤔. ¿Confirmás la reserva? Respondé *sí* o *no*.";
        return res.json({ reply, context: ctx, readyToCreate });
      }
    }
  }


  reply =
    "Mmm, creo que nos perdimos un poco 🤯. Podés decirme de nuevo: *quiero hacer una reserva* y empezamos otra vez.";
  return res.json({ reply, context: {}, readyToCreate: false });
});

export default r;
