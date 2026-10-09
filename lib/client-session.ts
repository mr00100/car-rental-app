// Admin/staff-only client session helpers.
//
// The public customer website has NO login or registration and does not use
// these utilities. They exist solely to keep the /admin console session
// working inside the preview iframe (where the HttpOnly SameSite cookie can
// be dropped) by mirroring the JWT into an in-memory / localStorage / cookie
// fallback and sending it as a Bearer token.

const TOKEN_KEY = "rac_admin_token";

let memoryToken: string | null = null;

function setCookieToken(token: string) {
  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie =
      `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=604800; ` +
      `SameSite=${secure ? "None" : "Lax"}${secure ? "; Secure" : ""}`;
  } catch {
    /* ignore */
  }
}

function clearCookieToken() {
  try {
    document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function readCookieToken(): string | null {
  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TOKEN_KEY}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string) {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* blocked storage */
  }
  setCookieToken(token);
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const fromLs = localStorage.getItem(TOKEN_KEY);
    if (fromLs) {
      memoryToken = fromLs;
      return fromLs;
    }
  } catch {
    /* ignore */
  }
  const fromCookie = readCookieToken();
  if (fromCookie) memoryToken = fromCookie;
  return fromCookie;
}

export function clearAuthToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  clearCookieToken();
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
