export const PETS = ["Perro", "Gato", "Ambos", "Otro"] as const;

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?: [\p{L}\p{M}][\p{L}\p{M}'’.-]*)+$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateName(value: string): string | null {
  const name = normalizeName(value);
  if (!name) return "Escribe tu nombre completo";
  if (name.length > 60) return "Máximo 60 caracteres";
  if (!name.includes(" ")) return "Escribe tu nombre y apellido";
  if (name.length < 3 || !NAME_RE.test(name)) return "Solo letras, espacios, guiones y apóstrofes";
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Escribe tu correo electrónico";
  if (email.length > 254 || email.includes("..") || !EMAIL_RE.test(email)) return "Correo no válido";
  return null;
}

export function passwordChecks(password: string) {
  return [
    { id: "len", label: "Mínimo 8 caracteres", message: "Usa al menos 8 caracteres", ok: password.length >= 8 },
    { id: "lower", label: "Una letra minúscula", message: "Incluye una letra minúscula", ok: /[a-z]/.test(password) },
    { id: "upper", label: "Una letra mayúscula", message: "Incluye una letra mayúscula", ok: /[A-Z]/.test(password) },
    { id: "digit", label: "Un número", message: "Incluye un número", ok: /\d/.test(password) },
    { id: "space", label: "Sin espacios", message: "No uses espacios", ok: !/\s/.test(password) },
  ];
}

export function validatePassword(password: string): string | null {
  if (!password) return "Escribe una contraseña";
  if (password.length > 72) return "Máximo 72 caracteres";
  const failed = passwordChecks(password).find((check) => !check.ok);
  return failed ? failed.message : null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Confirma tu contraseña";
  if (password !== confirm) return "Las contraseñas no coinciden";
  return null;
}