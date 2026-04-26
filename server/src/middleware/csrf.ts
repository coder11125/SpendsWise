import { doubleCsrf } from "csrf-csrf";
import { config } from "../config";

export const { invalidCsrfTokenError, generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.csrfSecret,
  // Using empty string so the CSRF token is not tied to a specific session.
  // This is safe because the CSRF cookie is HttpOnly+SameSite=Strict and the
  // CORS allow-list blocks cross-origin reads of the token response.
  getSessionIdentifier: () => "",
  cookieName: "sw_csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    secure: process.env.NODE_ENV !== "development",
  },
  size: 64,
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
});
