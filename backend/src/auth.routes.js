console.log("JWT_SECRET:", process.env.JWT_SECRET);

import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";

const r = Router();

// 🔐 Configurar SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ Falta SENDGRID_API_KEY en .env");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Firma de token
function signToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// ================= REGISTER =================
r.post("/register", async (req, res) => {
  const { name, last, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const [existe] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existe.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    const finalRole = "paciente";

    const [result] = await pool.query(
      "INSERT INTO users (name, last, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [name, last || null, email, hash, finalRole]
    );

    const user = {
      id: result.insertId,
      name,
      last: last || null,
      email,
      role: finalRole,
    };

    return res.json({ ok: true, user });
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// ================= LOGIN =================
r.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT id, name, last, email, password_hash, role FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const token = signToken(user.id, user.role);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        last: user.last,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// ============= FORGOT PASSWORD =============
r.post("/forgot", async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Falta el email" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM users WHERE email = ?",
      [email]
    );

    // Respuesta genérica aunque no exista el user
    if (rows.length === 0) {
      console.log("Intento reset email NO existe:", email);
      return res.json({
        ok: true,
        message:
          "Si el correo está registrado, se enviarán instrucciones.",
      });
    }

    const user = rows[0];

    // Token y vencimiento
    const token = crypto.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    // Guardar en tabla users
    await pool.query(
      "UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?",
      [token, expires, user.id]
    );

    const baseFront = process.env.FRONTEND_URL || "http://localhost:19006";
    const resetLink = `timeslot://reset?token=${token}`;

    console.log("Reset solicitado:", email, token, "link:", resetLink);

    // Enviar correo con SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("⚠️ No se envía mail: falta SENDGRID_API_KEY");
    } else {
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_FROM || "no-reply@timeslot.dev",
        subject: "Restablecer contraseña - TimeSlot",
        html: `
          <p>Hola ${user.name || ""},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña en <b>TimeSlot</b>.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña (es válido por 30 minutos):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Si no fuiste vos, podés ignorar este mensaje.</p>
        `,
      });
    }

    return res.json({
      ok: true,
      message:
        "Si el correo está registrado, se enviarán instrucciones para restablecer la contraseña.",
    });
  } catch (err) {
    console.log("FORGOT ERROR:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

// ============= RESET PASSWORD =============
r.post("/reset", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ error: "Token y contraseña son obligatorios" });
  }

  try {
    const now = new Date();

    const [rows] = await pool.query(
      "SELECT id FROM users WHERE reset_token = ? AND reset_expires > ?",
      [token, now]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const userId = rows[0].id;
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?",
      [hash, userId]
    );

    return res.json({ ok: true, message: "Contraseña actualizada" });
  } catch (err) {
    console.log("RESET ERROR:", err);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

export default r;
