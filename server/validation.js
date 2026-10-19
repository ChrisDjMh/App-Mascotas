export const PETS = ["Perro", "Gato", "Ambos", "Otro"];

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?: [\p{L}\p{M}][\p{L}\p{M}'’.-]*)+$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function normalizeName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function validateName(value) {
  const name = normalizeName(value);
  if (!name) return "Escribe tu nombre completo";
  if (name.length > 60) return "El nombre admite máximo 60 caracteres";
  if (!name.includes(" ")) return "Escribe tu nombre y apellido";
  if (name.length < 3 || !NAME_RE.test(name)) return "El nombre solo admite letras, espacios, guiones y apóstrofes";
  return null;
}

export function validateEmail(value) {
  const email = typeof value === "string" ? value.trim() : "";
  if (!email) return "Escribe tu correo electrónico";
  if (email.length > 254 || email.includes("..") || !EMAIL_RE.test(email)) return "Correo no válido";
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || !password) return "Escribe una contraseña";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (password.length > 72) return "La contraseña admite máximo 72 caracteres";
  if (/\s/.test(password)) return "La contraseña no puede tener espacios";
  if (!/[a-z]/.test(password)) return "La contraseña debe incluir una letra minúscula";
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir una letra mayúscula";
  if (!/\d/.test(password)) return "La contraseña debe incluir un número";
  return null;
}

export function validateRegister(body) {
  const { name, email, password, pet, remember = true } = body ?? {};
  const error =
    validateName(name) ||
    validateEmail(email) ||
    validatePassword(password) ||
    (PETS.includes(pet) ? null : "Tipo de mascota no válido");
  if (error) return { error };
  return {
    data: {
      name: normalizeName(name),
      email: email.trim().toLowerCase(),
      password,
      pet,
      remember: Boolean(remember),
    },
  };
}