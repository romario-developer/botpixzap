const ADMIN_TOKEN_KEY = "botpixzap-admin-token";

export const authStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};
