/**
 * Backend API origin — MUST match your deployed API on Vercel.
 * Set in Vercel (client project): VITE_API_BASE_URL=https://your-api.vercel.app
 * No trailing slash.
 */
const raw = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
export const API_BASE = String(raw).replace(/\/$/, "");

/** Product/upload image URL (path is filename or uploads/... segment). */
export function uploadsUrl(path) {
  if (!path) return "";
  const p = String(path).trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const clean = p.replace(/^\/?uploads\/?/, "");
  return `${API_BASE}/uploads/${clean}`;
}
