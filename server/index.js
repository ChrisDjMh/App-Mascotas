import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { validateRegister } from "./validation.js";

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("Falta JWT_SECRET (mínimo 16 caracteres) en server/.env");
  process.exit(1);
}

// ---------- "Base de datos" en archivo JSON ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
let users = [];

async function saveUsers() {
  const tmp = `${USERS_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2));
  await fs.rename(tmp, USERS_FILE);
}

async function loadUsers() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    users = JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    users = [];
    await saveUsers();
  }
}

// ---------- Helpers ----------
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10); // para igualar tiempos en login

const publicUser = (u) => ({ name: u.name, email: u.email, pet: u.pet });

function signToken(user, remember) {
  return jwt.sign({ email: user.email }, JWT_SECRET, {
    subject: user.id,
    expiresIn: remember ? "7d" : "8h",
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "Sesión inválida" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Sesión expirada o inválida" });
  }
}

// ---------- App ----------
const app = express();
const allowedOrigins = CLIENT_ORIGIN.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("Origen no permitido")),
  })
);
app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos, espera unos minutos" },
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const result = validateRegister(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    const { name, email, password, pet, remember } = result.data;

    const hash = await bcrypt.hash(password, 10);

    // Revisión y alta en el mismo tramo síncrono para evitar duplicados por concurrencia
    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    }
    const user = { id: randomUUID(), name, email, pet, passwordHash: hash, createdAt: new Date().toISOString() };
    users.push(user);
    await saveUsers();

    res.status(201).json({ token: signToken(user, remember), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password, remember = false } = req.body ?? {};
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = users.find((u) => u.email === cleanEmail);

    const valid = await bcrypt.compare(typeof password === "string" ? password : "", user ? user.passwordHash : DUMMY_HASH);
    if (!user || !valid) return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    res.json({ token: signToken(user, Boolean(remember)), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : "Error interno del servidor" });
});

await loadUsers();
app.listen(PORT, () => console.log(`PetVerse API en http://localhost:${PORT}`));