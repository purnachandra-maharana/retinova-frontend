const crypto = require("node:crypto");
const express = require("express");
const pool = require("../config/db");
const {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createPasswordHash,
  verifyPassword,
  requireAuth,
  sessionCookie,
} = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!/^[a-z0-9._-]{4,80}$/.test(username) || password.length < 8 || password.length > 256) {
      return res.status(400).json({ success: false, message: "Invalid credentials format" });
    }

    const result = await pool.query(
      "SELECT id, username, full_name, role, password_hash FROM app_users WHERE username = $1 AND is_active = TRUE",
      [username]
    );
    if (result.rowCount !== 1 || !verifyPassword(password, result.rows[0].password_hash)) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const user = result.rows[0];
    const sessionId = crypto.randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO auth_sessions (id, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '8 hours')",
      [sessionId, user.id]
    );

    res.setHeader("Set-Cookie", sessionCookie(sessionId));
    return res.json({
      success: true,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const sessionId = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);
    if (sessionId) await pool.query("DELETE FROM auth_sessions WHERE id = $1", [sessionId]);
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { router, createPasswordHash };
