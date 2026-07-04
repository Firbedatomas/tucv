import { describe, it, expect } from "vitest";
import { checkRateLimit, checkRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  it("permite hasta el límite y bloquea el que se pasa, dentro de la ventana", () => {
    const key = `t1:${Math.random()}`;
    const opts = { key, limit: 3, windowMs: 1000, now: 1000 };
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(true);
    expect(checkRateLimit(opts).allowed).toBe(true);
    const blocked = checkRateLimit(opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("se resetea al pasar la ventana", () => {
    const key = `t2:${Math.random()}`;
    expect(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 1000 }).allowed).toBe(true);
    expect(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 1500 }).allowed).toBe(false);
    // Pasada la ventana (resetAt = 2000), vuelve a permitir.
    expect(checkRateLimit({ key, limit: 1, windowMs: 1000, now: 2001 }).allowed).toBe(true);
  });
});

describe("checkRateLimits", () => {
  it("devuelve el primer límite que se pasa (ej. por IP o por token)", () => {
    const ipKey = `ip:${Math.random()}`;
    const tokenKey = `tok:${Math.random()}`;
    const checks = [
      { key: ipKey, limit: 5, windowMs: 1000 },
      { key: tokenKey, limit: 1, windowMs: 1000 },
    ];
    expect(checkRateLimits(checks, 1000).allowed).toBe(true);
    // El token ya llegó a 1 -> el segundo intento se bloquea aunque la IP tenga margen.
    expect(checkRateLimits(checks, 1000).allowed).toBe(false);
  });
});
