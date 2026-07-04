import { describe, it, expect } from "vitest";
import { computeCandidateBreakdown, isCandidateComplete, type CandidateBreakdownInput } from "./candidate-stats";

function candidate(overrides: Partial<CandidateBreakdownInput> = {}): CandidateBreakdownInput {
  return {
    consent_zone_visible: false,
    consent_public_profile: false,
    profile_slug: "",
    bio: "",
    categories: [],
    availability: [],
    experience: "",
    ...overrides,
  };
}

const complete = {
  bio: "Tengo experiencia en atención al público.",
  categories: ["atencion"],
  availability: ["full_time"],
  experience: "1_2",
};

describe("isCandidateComplete", () => {
  it("requiere bio, al menos un rubro, disponibilidad y experiencia", () => {
    expect(isCandidateComplete(candidate(complete))).toBe(true);
    expect(isCandidateComplete(candidate({ ...complete, bio: "" }))).toBe(false);
    expect(isCandidateComplete(candidate({ ...complete, bio: "   " }))).toBe(false);
    expect(isCandidateComplete(candidate({ ...complete, categories: [] }))).toBe(false);
    expect(isCandidateComplete(candidate({ ...complete, availability: [] }))).toBe(false);
    expect(isCandidateComplete(candidate({ ...complete, experience: "" }))).toBe(false);
  });
});

describe("computeCandidateBreakdown", () => {
  it("reproduce el caso reportado: 4 registrados, 2 visibles para empresas", () => {
    // Mismo escenario real: 2 con consent_zone_visible, ninguno público,
    // 1 incompleto, 2 ocultos (sin ningún flag de visibilidad).
    const records: CandidateBreakdownInput[] = [
      candidate({ ...complete, consent_zone_visible: true, profile_slug: "tomas" }),
      candidate({ ...complete, consent_zone_visible: true, profile_slug: "nicole" }),
      candidate({ ...complete, profile_slug: "magali" }),
      candidate({ profile_slug: "agustin" }), // incompleto y oculto
    ];
    expect(computeCandidateBreakdown(records)).toEqual({
      total: 4,
      visiblesEmpresas: 2,
      perfilPublico: 0,
      incompletos: 1,
      ocultos: 2,
    });
  });

  it("perfil público exige consent_public_profile Y slug (no alcanza el slug solo)", () => {
    const soloSlug = computeCandidateBreakdown([candidate({ ...complete, profile_slug: "x" })]);
    expect(soloSlug.perfilPublico).toBe(0);

    const sinSlug = computeCandidateBreakdown([candidate({ ...complete, consent_public_profile: true })]);
    expect(sinSlug.perfilPublico).toBe(0);

    const publicoOk = computeCandidateBreakdown([
      candidate({ ...complete, consent_public_profile: true, profile_slug: "x" }),
    ]);
    expect(publicoOk.perfilPublico).toBe(1);
  });

  it("las dimensiones son ejes independientes, no una partición: oculto puede ser también incompleto", () => {
    const b = computeCandidateBreakdown([candidate({ profile_slug: "" })]);
    expect(b.ocultos).toBe(1);
    expect(b.incompletos).toBe(1);
    expect(b.total).toBe(1);
  });

  it("un perfil visible para empresas no cuenta como oculto", () => {
    const b = computeCandidateBreakdown([candidate({ ...complete, consent_zone_visible: true })]);
    expect(b.visiblesEmpresas).toBe(1);
    expect(b.ocultos).toBe(0);
    expect(b.incompletos).toBe(0);
  });
});
