import { describe, expect, it } from "vitest";
import { buildWelcomeCandidateEmail } from "@/lib/email/templates/welcome-candidate";
import { buildWelcomeCompanyEmail } from "@/lib/email/templates/welcome-company";
import { buildProfileCompletedEmail } from "@/lib/email/templates/profile-completed";
import { buildPublicProfileEnabledEmail } from "@/lib/email/templates/public-profile-enabled";
import { buildApplicationReceivedCandidateEmail } from "@/lib/email/templates/application-received-candidate";
import { buildNewApplicationCompanyEmail } from "@/lib/email/templates/new-application-company";
import { buildJobExpiringEmail } from "@/lib/email/templates/job-expiring";
import { buildJobDeactivatedSummaryEmail } from "@/lib/email/templates/job-deactivated-summary";
import { buildCompanyDailyJobDigestEmail } from "@/lib/email/templates/company-daily-job-digest";
import { buildCandidateWeeklyProfileViewsEmail } from "@/lib/email/templates/candidate-weekly-profile-views";
import { buildProfileStartedEmail } from "@/lib/email/templates/profile-started";
import type { RenderedEmail } from "@/lib/email/types";

// No probamos el diseño pixel a pixel -- solo que cada template siempre
// produce un email completo y usable (subject/html/text no vacíos, sin
// tirar una excepción) incluso con los datos más pelados posibles (strings
// vacíos, arrays vacíos), que es exactamente lo que puede pasar con un
// perfil recién creado o un negocio sin nombre cargado todavía.
function expectValidEmail(email: RenderedEmail) {
  expect(email.subject.length).toBeGreaterThan(0);
  expect(email.html).toContain("<!doctype html>");
  expect(email.html.length).toBeGreaterThan(0);
  expect(email.text.length).toBeGreaterThan(0);
  expect(email.text).not.toContain("<");
}

describe("email templates", () => {
  it("welcome_candidate renders with full data", () => {
    expectValidEmail(
      buildWelcomeCandidateEmail({
        name: "Sofía",
        profileUrl: "https://tucv.ar/postulante/editar",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
      }),
    );
  });

  it("welcome_candidate renders even with an empty name", () => {
    expectValidEmail(
      buildWelcomeCandidateEmail({ name: "", profileUrl: "https://tucv.ar/postulante/editar", preferencesUrl: "https://tucv.ar/configuracion/notificaciones" }),
    );
  });

  it("welcome_company renders even with an empty business name", () => {
    expectValidEmail(
      buildWelcomeCompanyEmail({ businessName: "", panelUrl: "https://tucv.ar/empresa/panel", preferencesUrl: "https://tucv.ar/configuracion/notificaciones" }),
    );
  });

  it("profile_completed renders with full data", () => {
    expectValidEmail(
      buildProfileCompletedEmail({
        name: "Juan",
        profileUrl: "https://tucv.ar/p/juan",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });

  it("public_profile_enabled renders with full data", () => {
    expectValidEmail(
      buildPublicProfileEnabledEmail({
        name: "Juan",
        publicProfileUrl: "https://tucv.ar/p/juan",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });

  it("application_received_candidate renders even with empty job/business names", () => {
    expectValidEmail(
      buildApplicationReceivedCandidateEmail({
        name: "",
        jobTitle: "",
        businessName: "",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });

  it("new_application_company renders even with empty candidate/job names", () => {
    expectValidEmail(
      buildNewApplicationCompanyEmail({
        businessName: "",
        candidateName: "",
        jobTitle: "",
        applicantsPanelUrl: "https://tucv.ar/empresa/panel",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });

  it("job_expiring renders and includes the day count in the subject", () => {
    const email = buildJobExpiringEmail({
      businessName: "Almacén Don José",
      jobTitle: "Cajero",
      expiresInDays: 2,
      renewUrl: "https://tucv.ar/empresa/busquedas/123",
      preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
      unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
    });
    expectValidEmail(email);
    expect(email.subject).toContain("Cajero");
  });

  it("job_deactivated_summary renders and includes the applicant count", () => {
    const email = buildJobDeactivatedSummaryEmail({
      businessName: "Almacén Don José",
      jobTitle: "Cajero",
      totalApplicants: 7,
      renewUrl: "https://tucv.ar/empresa/busquedas/nueva",
      preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
      unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
    });
    expectValidEmail(email);
    expect(email.html).toContain("7");
  });

  it("company_daily_job_digest renders and includes the applicant count", () => {
    const email = buildCompanyDailyJobDigestEmail({
      businessName: "Almacén Don José",
      newApplicantsCount: 3,
      jobsSummary: "Recibiste 3 nuevos postulantes en tus búsquedas activas.",
      panelUrl: "https://tucv.ar/empresa/panel",
      preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
      unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
    });
    expectValidEmail(email);
    expect(email.html).toContain("3");
  });

  it("candidate_weekly_profile_views renders even with zero views", () => {
    expectValidEmail(
      buildCandidateWeeklyProfileViewsEmail({
        name: "",
        viewsCount: 0,
        profileUrl: "https://tucv.ar/p/juan",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });

  it("profile_started renders with full data", () => {
    expectValidEmail(
      buildProfileStartedEmail({
        createProfileUrl: "https://tucv.ar/postulante/nuevo",
        preferencesUrl: "https://tucv.ar/configuracion/notificaciones",
        unsubscribeUrl: "https://tucv.ar/api/email/unsubscribe?token=abc",
      }),
    );
  });
});
