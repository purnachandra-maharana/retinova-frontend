const crypto = require("node:crypto");
const pool = require("../config/db");

const SESSION_COOKIE = "retinova_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator === -1) return cookies;
    const key = part.slice(0, separator).trim();
    cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    return cookies;
  }, {});
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return expected.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

async function requireAuth(req, res, next) {
  try {
    const sessionId = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!sessionId || !/^[a-f0-9]{64}$/.test(sessionId)) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.role
       FROM auth_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [sessionId]
    );

    if (result.rowCount !== 1) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  };
}

function sessionCookie(sessionId) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createPasswordHash,
  verifyPassword,
  requireAuth,
  requireRole,
  sessionCookie,
};
