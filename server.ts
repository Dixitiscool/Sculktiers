import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import yaml from "js-yaml";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "config.yml");
const COOKIE_NAME = "sculk_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SAVE_KEY_WHITELIST = new Set(["players", "config"]);

interface AdminRecord {
  username: string;
  passkey: string; // bcrypt hash
  role: "owner" | "admin";
  createdAt: string;
}

interface LogRecord {
  id: string;
  filename: string;
  timestamp: string;
  adminName: string;
  role: string;
  ipAddress: string;
  action: string;
  content: string;
}

interface DbShape {
  players: any[];
  config: { serverName: string; serverIp: string; discordUrl: string };
  admins: AdminRecord[];
  logs: LogRecord[];
  _meta?: { sessionSecret: string };
}

app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// ---------- DB helpers ----------

function readDb(): DbShape {
  const text = fs.readFileSync(DB_PATH, "utf8");
  return (yaml.load(text) || {}) as DbShape;
}

function writeDb(db: DbShape): void {
  const yamlString = yaml.dump(db, { indent: 2, lineWidth: -1 });
  fs.writeFileSync(DB_PATH, yamlString, "utf8");
}

function isBcryptHash(value: string): boolean {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

function ensureSessionSecret(db: DbShape): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!db._meta?.sessionSecret) {
    db._meta = { sessionSecret: crypto.randomBytes(48).toString("hex") };
    writeDb(db);
  }
  return db._meta.sessionSecret;
}

function initDb(): void {
  if (!fs.existsSync(DB_PATH)) {
    const seed: DbShape = {
      players: [],
      config: {
        serverName: "Sculk Tiers",
        serverIp: "play.sculktiers.xyz",
        discordUrl: "https://discord.gg/nt25PqJCG2",
      },
      admins: [
        {
          username: "Owner",
          passkey: bcrypt.hashSync("SculkQawsqwas1", 10),
          role: "owner",
          createdAt: new Date().toISOString(),
        },
        {
          username: "sculk",
          passkey: bcrypt.hashSync("sculk", 10),
          role: "admin",
          createdAt: new Date().toISOString(),
        },
      ],
      logs: [],
    };
    writeDb(seed);
  }

  // Migrate any plaintext passkeys to bcrypt on boot
  const db = readDb();
  let migrated = false;
  for (const admin of db.admins || []) {
    if (!isBcryptHash(admin.passkey)) {
      admin.passkey = bcrypt.hashSync(admin.passkey, 10);
      migrated = true;
    }
  }
  if (migrated) writeDb(db);
  ensureSessionSecret(readDb());
}

initDb();

// ---------- Session (HMAC-signed cookie) ----------

interface SessionPayload {
  username: string;
  role: "owner" | "admin";
  exp: number;
}

function sign(payload: SessionPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string | undefined, secret: string): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

interface AuthedRequest extends Request {
  admin?: SessionPayload;
}

function authenticate(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const db = readDb();
  const secret = ensureSessionSecret(db);
  const session = verify(req.cookies?.[COOKIE_NAME], secret);
  if (session) {
    // Confirm the admin still exists in the registry (real-time revocation)
    const stillExists = (db.admins || []).some(
      (a) => a.username === session.username && a.role === session.role,
    );
    if (stillExists) req.admin = session;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.admin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function requireOwner(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.admin?.role !== "owner") {
    res.status(403).json({ error: "Owner-only operation" });
    return;
  }
  next();
}

app.use(authenticate);

// ---------- Logging helper ----------

function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function appendLog(entry: Omit<LogRecord, "id" | "filename" | "timestamp">): LogRecord {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  const safeName = entry.adminName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const filename = `${entry.action.toLowerCase()}_${safeName}_${yyyy}${mm}${dd}_${hh}${mi}${ss}.log`;
  const log: LogRecord = {
    id: `${yyyy}${mm}${dd}-${hh}${mi}${ss}-${crypto.randomBytes(3).toString("hex")}`,
    filename,
    timestamp,
    ...entry,
    content:
      `[LOG FILE] /logs/${filename}\n` +
      `[TIMESTAMP] ${timestamp}\n` +
      `[OPERATOR] ${entry.adminName} (${entry.role.toUpperCase()})\n` +
      `[IP] ${entry.ipAddress}\n` +
      `[ACTION] ${entry.action}\n` +
      `=========================================================\n` +
      `${entry.content}`,
  };
  const db = readDb();
  db.logs = [log, ...(db.logs || [])].slice(0, 500); // cap log volume
  writeDb(db);
  return log;
}

// ---------- API ROUTES ----------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public database snapshot, with admin/session secret data redacted
app.get("/api/database", (req: AuthedRequest, res) => {
  try {
    const db = readDb();
    // Strip passkey hashes and meta from the public response
    const safeAdmins = (db.admins || []).map(({ passkey: _passkey, ...rest }) => rest);
    res.json({
      players: db.players || [],
      config: db.config,
      admins: req.admin ? safeAdmins : [], // admin list only visible to authenticated admins
      logs: req.admin ? db.logs || [] : [], // logs are admin-only
    });
  } catch (err) {
    console.error("Failed to read database:", err);
    res.status(500).json({ error: "Failed to read database" });
  }
});

// Save a whitelisted top-level key. Admin-only.
app.post("/api/save", requireAdmin, (req: AuthedRequest, res) => {
  try {
    const { key, data } = req.body || {};
    if (!key || !SAVE_KEY_WHITELIST.has(key)) {
      res.status(400).json({ error: "Invalid or disallowed key" });
      return;
    }
    const db = readDb();
    (db as any)[key] = data;
    writeDb(db);
    res.json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Login via passkey only (matches existing UX)
app.post("/api/login", async (req, res) => {
  const { passkey } = req.body || {};
  if (typeof passkey !== "string" || !passkey.trim()) {
    res.status(400).json({ error: "Passkey is required" });
    return;
  }
  const db = readDb();
  const secret = ensureSessionSecret(db);
  // Scan all admins for a bcrypt match
  let match: AdminRecord | null = null;
  for (const admin of db.admins || []) {
    if (isBcryptHash(admin.passkey) && (await bcrypt.compare(passkey.trim(), admin.passkey))) {
      match = admin;
      break;
    }
  }
  if (!match) {
    res.status(401).json({ error: "Invalid passkey" });
    return;
  }
  const token = sign(
    { username: match.username, role: match.role, exp: Date.now() + SESSION_TTL_MS },
    secret,
  );
  setSessionCookie(res, token);
  appendLog({
    adminName: match.username,
    role: match.role,
    ipAddress: getClientIp(req),
    action: "ADMIN_LOGIN",
    content: `Operator "${match.username}" authenticated successfully.`,
  });
  res.json({ username: match.username, role: match.role });
});

app.post("/api/logout", (req: AuthedRequest, res) => {
  if (req.admin) {
    appendLog({
      adminName: req.admin.username,
      role: req.admin.role,
      ipAddress: getClientIp(req),
      action: "ADMIN_LOGOUT",
      content: `Operator "${req.admin.username}" ended their session.`,
    });
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

app.get("/api/me", (req: AuthedRequest, res) => {
  if (!req.admin) {
    res.json({ admin: null });
    return;
  }
  res.json({ admin: { username: req.admin.username, role: req.admin.role } });
});

// Log an admin action. Server stamps real IP and identity from the session.
app.post("/api/log", requireAdmin, (req: AuthedRequest, res) => {
  const { action, message } = req.body || {};
  if (typeof action !== "string" || typeof message !== "string") {
    res.status(400).json({ error: "action and message are required" });
    return;
  }
  if (action.length > 64 || message.length > 8000) {
    res.status(400).json({ error: "Payload too large" });
    return;
  }
  const log = appendLog({
    adminName: req.admin!.username,
    role: req.admin!.role,
    ipAddress: getClientIp(req),
    action: action.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 64),
    content: message,
  });
  res.json({ log });
});

// Admin registry: owner-only
app.post("/api/admins", requireOwner, async (req: AuthedRequest, res) => {
  const { username, passkey } = req.body || {};
  if (typeof username !== "string" || typeof passkey !== "string") {
    res.status(400).json({ error: "username and passkey are required" });
    return;
  }
  const cleanName = username.trim();
  const cleanPass = passkey.trim();
  if (!cleanName || !cleanPass) {
    res.status(400).json({ error: "Both fields must contain text" });
    return;
  }
  if (cleanPass.length < 4) {
    res.status(400).json({ error: "Passkey must be at least 4 characters" });
    return;
  }
  const db = readDb();
  if ((db.admins || []).some((a) => a.username.toLowerCase() === cleanName.toLowerCase())) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  // Reject if the new passkey collides with any existing one
  for (const admin of db.admins || []) {
    if (isBcryptHash(admin.passkey) && (await bcrypt.compare(cleanPass, admin.passkey))) {
      res.status(409).json({ error: "Passkey already in use" });
      return;
    }
  }
  const newAdmin: AdminRecord = {
    username: cleanName,
    passkey: await bcrypt.hash(cleanPass, 10),
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  db.admins = [...(db.admins || []), newAdmin];
  writeDb(db);
  appendLog({
    adminName: req.admin!.username,
    role: req.admin!.role,
    ipAddress: getClientIp(req),
    action: "CREATE_ADMIN",
    content: `Owner registered new administrator "${cleanName}".`,
  });
  res.json({ admin: { username: newAdmin.username, role: newAdmin.role, createdAt: newAdmin.createdAt } });
});

app.delete("/api/admins/:username", requireOwner, (req: AuthedRequest, res) => {
  const target = req.params.username;
  if (target === req.admin!.username) {
    res.status(400).json({ error: "Owners cannot delete their own account" });
    return;
  }
  const db = readDb();
  const before = db.admins?.length || 0;
  const targetRecord = (db.admins || []).find((a) => a.username === target);
  if (!targetRecord) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  if (targetRecord.role === "owner") {
    res.status(400).json({ error: "Cannot delete an owner account" });
    return;
  }
  db.admins = (db.admins || []).filter((a) => a.username !== target);
  if (db.admins.length === before) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  writeDb(db);
  appendLog({
    adminName: req.admin!.username,
    role: req.admin!.role,
    ipAddress: getClientIp(req),
    action: "DELETE_ADMIN",
    content: `Owner revoked admin "${target}".`,
  });
  res.json({ success: true });
});

// ---------- Bootstrap ----------

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 4 SPA fallback — regex matches every unhandled GET
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`,
    );
  });
}

bootstrap();
