// Admin authentication utilities
// Hardcoded credentials for now

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const AUTH_COOKIE_NAME = "admin-auth";

export function login(username: string, password: string): boolean {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    if (typeof document !== "undefined") {
      document.cookie = `${AUTH_COOKIE_NAME}=true; path=/; max-age=86400`; // 24 hours
    }
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
  }
}

export function isAuthenticated(): boolean {
  if (typeof document === "undefined") return false;
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) =>
    cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=true`)
  );
}

export function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  const authCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=`)
  );
  return authCookie ? authCookie.split("=")[1] : null;
}
