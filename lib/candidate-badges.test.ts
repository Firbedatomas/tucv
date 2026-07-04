import { describe, expect, it } from "vitest";
import { computeCandidateBadges, type BadgeInput } from "@/lib/candidate-badges";

const COMPLETE: BadgeInput = {
  categories: ["atencion"],
  experience: "1_a_3_anos",
  availability: ["tarde"],
  bio: "Tengo experiencia en atención al público.",
  has_own_transport: "si",
  immediate_availability: true,
};

describe("computeCandidateBadges", () => {
  it("returns all applicable badges for a complete, available candidate with transport", () => {
    const labels = computeCandidateBadges(COMPLETE).map((b) => b.label);
    expect(labels).toContain("Puede empezar ya");
    expect(labels).toContain("Perfil completo");
    expect(labels).toContain("Con experiencia");
    expect(labels).toContain("Movilidad propia");
  });

  it("puts the highlight badge (Puede empezar ya) first for employer hierarchy", () => {
    expect(computeCandidateBadges(COMPLETE)[0].label).toBe("Puede empezar ya");
  });

  it("omits 'Con experiencia' when the candidate has no experience", () => {
    const labels = computeCandidateBadges({ ...COMPLETE, experience: "sin_experiencia" }).map((b) => b.label);
    expect(labels).not.toContain("Con experiencia");
  });

  it("omits 'Perfil completo' when the bio is empty", () => {
    const labels = computeCandidateBadges({ ...COMPLETE, bio: "" }).map((b) => b.label);
    expect(labels).not.toContain("Perfil completo");
  });

  it("omits 'Movilidad propia' unless transport is exactly 'si'", () => {
    const labels = computeCandidateBadges({ ...COMPLETE, has_own_transport: "no" }).map((b) => b.label);
    expect(labels).not.toContain("Movilidad propia");
  });

  it("returns an empty list for a bare-minimum profile", () => {
    expect(
      computeCandidateBadges({
        categories: [],
        experience: "sin_experiencia",
        availability: [],
        bio: "",
        has_own_transport: "",
        immediate_availability: false,
      }),
    ).toHaveLength(0);
  });
});
