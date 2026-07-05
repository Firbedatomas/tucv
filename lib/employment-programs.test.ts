import { describe, it, expect } from "vitest";
import {
  suggestProgramsForZone,
  candidateProgramCompatibility,
  programBadges,
  EMPLOYMENT_PROGRAMS,
} from "@/lib/employment-programs";

// Usamos age_manual (no birth_date) para que los tests sean deterministas y
// no dependan de la fecha actual -- calculateAge cae a age_manual si no hay
// birth_date.

describe("suggestProgramsForZone", () => {
  it("en Córdoba (con acento) sugiere provinciales + nacionales", () => {
    const ids = suggestProgramsForZone("Córdoba");
    expect(ids).toContain("ppp");
    expect(ids).toContain("empleo_26");
    expect(ids).toContain("pil_ept");
    expect(ids).toContain("progresar");
  });

  it("en otra provincia solo sugiere los nacionales", () => {
    const ids = suggestProgramsForZone("Buenos Aires");
    expect(ids).toEqual(expect.arrayContaining(["pil_ept", "progresar"]));
    expect(ids).not.toContain("ppp");
    expect(ids).not.toContain("empleo_26");
  });

  it("sin provincia conocida degrada a nacionales (nunca vacío)", () => {
    const ids = suggestProgramsForZone("");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("ppp");
  });
});

describe("candidateProgramCompatibility - inferencia por edad", () => {
  it("joven en Córdoba infiere PPP (16-24), no Empleo +26", () => {
    const r = candidateProgramCompatibility(
      { age_manual: 20, province: "Córdoba" },
      { province: "Córdoba" },
    );
    const ppp = r.programs.find((p) => p.id === "ppp");
    expect(ppp).toEqual({ id: "ppp", basis: "inferred" });
    expect(r.programs.find((p) => p.id === "empleo_26")).toBeUndefined();
    expect(r.compatible).toBe(true);
  });

  it("mayor de 26 en Córdoba infiere Empleo +26, no PPP", () => {
    const r = candidateProgramCompatibility(
      { age_manual: 30, province: "Córdoba" },
      { province: "Córdoba" },
    );
    expect(r.programs.find((p) => p.id === "empleo_26")).toEqual({ id: "empleo_26", basis: "inferred" });
    expect(r.programs.find((p) => p.id === "ppp")).toBeUndefined();
  });

  it("no infiere un programa provincial si el candidato es de otra provincia", () => {
    // Búsqueda en Córdoba, candidato joven pero en Buenos Aires: PPP es de
    // Córdoba -> no se infiere. Nacionales sí.
    const r = candidateProgramCompatibility(
      { age_manual: 20, province: "Buenos Aires" },
      { province: "Córdoba" },
    );
    expect(r.programs.find((p) => p.id === "ppp")).toBeUndefined();
    expect(r.programs.find((p) => p.id === "progresar")).toEqual({ id: "progresar", basis: "inferred" });
  });
});

describe("candidateProgramCompatibility - declarado pisa inferido", () => {
  it("si el candidato declaró PPP, gana como 'declared' aunque la edad no encaje", () => {
    const r = candidateProgramCompatibility(
      { age_manual: 40, province: "Córdoba", programs_enrolled: ["ppp"] },
      { province: "Córdoba" },
    );
    expect(r.programs.find((p) => p.id === "ppp")).toEqual({ id: "ppp", basis: "declared" });
  });

  it("declarado no duplica el mismo programa como inferido", () => {
    const r = candidateProgramCompatibility(
      { age_manual: 20, province: "Córdoba", programs_enrolled: ["ppp"] },
      { province: "Córdoba" },
    );
    const ppps = r.programs.filter((p) => p.id === "ppp");
    expect(ppps).toHaveLength(1);
    expect(ppps[0].basis).toBe("declared");
  });
});

describe("candidateProgramCompatibility - nunca excluye", () => {
  it("sin edad y sin declaración simplemente no hay match (no error, no exclusión)", () => {
    const r = candidateProgramCompatibility({ province: "Córdoba" }, { province: "Córdoba" });
    expect(r.compatible).toBe(false);
    expect(r.programs).toEqual([]);
  });

  it("el resultado nunca contiene una señal de excluir: solo ids + basis", () => {
    const r = candidateProgramCompatibility(
      { age_manual: 20, province: "Córdoba" },
      { province: "Córdoba" },
    );
    for (const m of r.programs) {
      expect(["declared", "inferred"]).toContain(m.basis);
      expect(EMPLOYMENT_PROGRAMS.map((p) => p.id)).toContain(m.id);
    }
  });
});

describe("programBadges", () => {
  it("declarado -> highlight 'Inscripto en'; inferido -> neutral 'Posiblemente compatible'", () => {
    const declared = programBadges({ compatible: true, programs: [{ id: "ppp", basis: "declared" }] });
    expect(declared[0]).toEqual({ label: "Inscripto en PPP", tone: "highlight" });

    const inferred = programBadges({ compatible: true, programs: [{ id: "empleo_26", basis: "inferred" }] });
    expect(inferred[0]).toEqual({ label: "Posiblemente compatible con Empleo +26", tone: "neutral" });
  });
});
