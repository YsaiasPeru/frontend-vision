// En desarrollo usa el proxy de Vite (mismo origen -> /api).
// En produccion pon la URL publica de tu backend de Rust aqui:
export const API_BASE = import.meta.env.DEV ? '' : 'https://tu-backend-rust.fly.dev';

// Identificador anonimo del dispositivo (se crea una vez y se guarda).
export function getUserId() {
  let id = localStorage.getItem('ecosort_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('ecosort_user_id', id);
  }
  return id;
}

/** Secreto del dispositivo: demuestra la identidad sin contrasena.
 *  Se guarda SOLO en el navegador; el backend guarda un hash (SHA-256).
 *  Sin este secreto nadie puede leer el historial ni sumarte puntos (IDOR). */
export function getUserSecret() {
  let s = localStorage.getItem('ecosort_user_secret');
  if (!s) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('ecosort_user_secret', s);
  }
  return s;
}

/** Garantiza que la identidad del dispositivo (user_id + secreto) exista.
 *  Se llama al montar la app para que la identidad sea estable y no
 *  dependa de que el usuario dispare una peticion concreta. */
export function ensureIdentity() {
  return { userId: getUserId(), secret: getUserSecret() };
}

/** Envia varias fotos (base64) al backend de Rust para clasificacion real.
 *  El backend promedia las confianzas de todas para ser mas robusto. */
export async function scanImages(base64Images, nickname) {
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: getUserId(),
      secret: getUserSecret(),
      nickname: nickname || undefined,
      images: base64Images,
    }),
  });
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}

/** Historial de escaneos del usuario (refuerzo educativo).
 *  Enviamos el secreto en la cabecera X-User-Secret para que el backend
 *  verifique la identidad antes de devolver datos (proteccion IDOR). */
export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/history/${getUserId()}`, {
    headers: { 'X-User-Secret': getUserSecret() },
  });
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}

/** Apodo elegido por el usuario (se guarda en el dispositivo). */
export function getNickname() {
  return localStorage.getItem('ecosort_nickname') || '';
}
export function setNickname(name) {
  localStorage.setItem('ecosort_nickname', name);
}

/** Guia educativa completa de los 9 tipos de residuo. */
export async function fetchMaterials() {
  const res = await fetch(`${API_BASE}/api/materials`);
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}

/** Ranking de eco-puntos. */
export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/api/leaderboard`);
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
}
