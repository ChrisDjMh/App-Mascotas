export type User = { name: string; email: string; pet: string };
type Session = { token: string; user: User };

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:4000").replace(/\/$/, "");
const SESSION_KEY = "petverse_session";

async function post(path: string, body: unknown): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error, intenta de nuevo");
  return data as Session;
}

function saveSession(session: Session, remember: boolean) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  // "Recordarme" -> localStorage (sobrevive al cerrar el navegador); si no, sessionStorage
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export async function registerUser(name: string, email: string, password: string, pet: string, remember = true): Promise<User> {
  const session = await post("/api/auth/register", { name, email, password, pet, remember });
  saveSession(session, remember);
  return session.user;
}

export async function loginUser(email: string, password: string, remember: boolean): Promise<User> {
  const session = await post("/api/auth/login", { email, password, remember });
  saveSession(session, remember);
  return session.user;
}

export function getSessionUser(): User | null {
  const session = readSession();
  if (!session) return null;
  if (tokenExpired(session.token)) {
    logoutUser();
    return null;
  }
  return session.user;
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}