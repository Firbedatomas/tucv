import { describe, expect, it } from "vitest";
import { renderEmailLayout, stripHtmlForText } from "@/lib/email/layout";

describe("renderEmailLayout", () => {
  it("includes the heading, body and CTA when provided", () => {
    const html = renderEmailLayout({
      heading: "Título de prueba",
      bodyHtml: "<p>Cuerpo de prueba</p>",
      ctaLabel: "Hacé click",
      ctaHref: "https://tucv.ar/algo",
    });
    expect(html).toContain("Título de prueba");
    expect(html).toContain("Cuerpo de prueba");
    expect(html).toContain("Hacé click");
    expect(html).toContain("https://tucv.ar/algo");
  });

  it("omits the CTA block entirely when no ctaHref is given", () => {
    const html = renderEmailLayout({ heading: "Sin CTA", bodyHtml: "<p>Hola</p>" });
    expect(html).not.toContain("<a href=");
  });

  it("renders the metric block when provided", () => {
    const html = renderEmailLayout({
      heading: "Con métrica",
      bodyHtml: "<p>Hola</p>",
      metric: { value: "12", label: "nuevos postulantes" },
    });
    expect(html).toContain("12");
    expect(html).toContain("nuevos postulantes");
  });

  it("escapes HTML special characters in the heading (never raw-injects untrusted text)", () => {
    const html = renderEmailLayout({ heading: '<script>alert("x")</script>', bodyHtml: "<p>Hola</p>" });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes both preferences and unsubscribe links when given", () => {
    const html = renderEmailLayout({
      heading: "Con links",
      bodyHtml: "<p>Hola</p>",
      preferencesHref: "https://tucv.ar/configuracion/notificaciones",
      unsubscribeHref: "https://tucv.ar/api/email/unsubscribe?token=abc",
    });
    expect(html).toContain("https://tucv.ar/configuracion/notificaciones");
    expect(html).toContain("https://tucv.ar/api/email/unsubscribe?token=abc");
  });
});

describe("stripHtmlForText", () => {
  it("strips tags and collapses common entities into a readable plain-text fallback", () => {
    const text = stripHtmlForText("<p>Hola <strong>Juan</strong></p><p>Otra línea &amp; algo &mdash; más</p>");
    expect(text).not.toContain("<");
    expect(text).toContain("Hola Juan");
    expect(text).toContain("Otra línea & algo - más");
  });

  it("never crashes on empty input", () => {
    expect(stripHtmlForText("")).toBe("");
  });
});
