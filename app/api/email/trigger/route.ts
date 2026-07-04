import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getOrCreatePreferences } from "@/lib/email/preferences";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildWelcomeCandidateEmail } from "@/lib/email/templates/welcome-candidate";
import { buildWelcomeCompanyEmail } from "@/lib/email/templates/welcome-company";
import { buildPublicProfileEnabledEmail } from "@/lib/email/templates/public-profile-enabled";
import { buildApplicationReceivedCandidateEmail } from "@/lib/email/templates/application-received-candidate";
import { buildNewApplicationCompanyEmail } from "@/lib/email/templates/new-application-company";

const EMAIL_TRIGGER_SECRET = process.env.EMAIL_TRIGGER_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

type TriggerType = "welcome_candidate" | "welcome_company" | "public_profile_enabled" | "application_created";

function unsubscribeUrl(token: string) {
  return `${BASE_URL}/api/email/unsubscribe?token=${token}`;
}
function preferencesUrl() {
  return `${BASE_URL}/configuracion/notificaciones`;
}

// Los hooks de PocketBase (pb_hooks/main.pb.js) corren en un JSVM sin acceso
// a npm -- no pueden usar el SDK de Resend ni armar el HTML de los
// templates. Por eso solo mandan un evento liviano acá ($http.send) con el
// TIPO y el ID del registro recién creado; esta ruta vuelve a leer el
// registro posta con pbAdmin (nunca confía en más datos del payload, mismo
// criterio que app/api/mercadopago/webhook/route.ts) y recién ahí arma y
// manda el email. Un secreto compartido (no la sesión del usuario, esto lo
// llama el propio servidor de PocketBase) protege la ruta.
export async function POST(req: Request) {
  if (!EMAIL_TRIGGER_SECRET) return NextResponse.json({ ok: true });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${EMAIL_TRIGGER_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { type?: TriggerType; recordId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const { type, recordId } = body;
  if (!type || !recordId) return NextResponse.json({ ok: true });

  try {
    const admin = await pbAdmin();

    if (type === "welcome_candidate") {
      const profile = await admin.collection("candidate_profiles").getOne(recordId).catch(() => null);
      if (!profile) return NextResponse.json({ ok: true });
      const user = await admin.collection("users").getOne(profile.user as string).catch(() => null);
      if (!user?.email) return NextResponse.json({ ok: true });
      const prefs = await getOrCreatePreferences(user.id);
      await sendTransactionalEmail({
        type: "welcome_candidate",
        to: user.email as string,
        userId: user.id,
        rendered: buildWelcomeCandidateEmail({
          name: (profile.name as string) || "",
          profileUrl: `${BASE_URL}/postulante/editar`,
          preferencesUrl: preferencesUrl(),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
    }

    if (type === "welcome_company") {
      const business = await admin.collection("business_accounts").getOne(recordId).catch(() => null);
      if (!business) return NextResponse.json({ ok: true });
      const user = await admin.collection("users").getOne(business.user as string).catch(() => null);
      if (!user?.email) return NextResponse.json({ ok: true });
      const prefs = await getOrCreatePreferences(user.id);
      await sendTransactionalEmail({
        type: "welcome_company",
        to: user.email as string,
        userId: user.id,
        rendered: buildWelcomeCompanyEmail({
          businessName: (business.business_name as string) || "",
          panelUrl: `${BASE_URL}/empresa/panel`,
          preferencesUrl: preferencesUrl(),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
    }

    if (type === "public_profile_enabled") {
      const profile = await admin.collection("candidate_profiles").getOne(recordId).catch(() => null);
      if (!profile || !profile.profile_slug) return NextResponse.json({ ok: true });
      const user = await admin.collection("users").getOne(profile.user as string).catch(() => null);
      if (!user?.email) return NextResponse.json({ ok: true });
      const prefs = await getOrCreatePreferences(user.id);
      await sendTransactionalEmail({
        type: "public_profile_enabled",
        to: user.email as string,
        userId: user.id,
        rendered: buildPublicProfileEnabledEmail({
          name: (profile.name as string) || "",
          publicProfileUrl: `${BASE_URL}/p/${profile.profile_slug}`,
          preferencesUrl: preferencesUrl(),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        }),
        unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
      });
    }

    if (type === "application_created") {
      const application = await admin.collection("applications").getOne(recordId).catch(() => null);
      if (!application) return NextResponse.json({ ok: true });
      const [candidate, jobPost] = await Promise.all([
        admin.collection("candidate_profiles").getOne(application.candidate as string).catch(() => null),
        admin.collection("job_posts").getOne(application.job_post as string).catch(() => null),
      ]);
      if (!candidate || !jobPost) return NextResponse.json({ ok: true });
      const business = await admin.collection("business_accounts").getOne(jobPost.business as string).catch(() => null);
      if (!business) return NextResponse.json({ ok: true });

      const [candidateUser, businessUser] = await Promise.all([
        admin.collection("users").getOne(candidate.user as string).catch(() => null),
        admin.collection("users").getOne(business.user as string).catch(() => null),
      ]);

      if (candidateUser?.email) {
        const prefs = await getOrCreatePreferences(candidateUser.id);
        await sendTransactionalEmail({
          type: "application_received_candidate",
          to: candidateUser.email as string,
          userId: candidateUser.id,
          rendered: buildApplicationReceivedCandidateEmail({
            name: (candidate.name as string) || "",
            jobTitle: (jobPost.role as string) || (jobPost.name as string) || "tu búsqueda",
            businessName: (business.business_name as string) || "",
            preferencesUrl: preferencesUrl(),
            unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
          }),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        });
      }

      if (businessUser?.email) {
        const prefs = await getOrCreatePreferences(businessUser.id);
        await sendTransactionalEmail({
          type: "new_application_company",
          to: businessUser.email as string,
          userId: businessUser.id,
          rendered: buildNewApplicationCompanyEmail({
            businessName: (business.business_name as string) || "",
            candidateName: (candidate.name as string) || "un postulante",
            jobTitle: (jobPost.role as string) || (jobPost.name as string) || "tu búsqueda",
            applicantsPanelUrl: `${BASE_URL}/empresa/panel`,
            preferencesUrl: preferencesUrl(),
            unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
          }),
          unsubscribeUrl: unsubscribeUrl(prefs.unsubscribeToken),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Igual criterio que el webhook de Mercado Pago: nunca devolvemos error
    // real acá (el hook de PocketBase no reintenta este $http.send, así que
    // fallar fuerte solo perdería el email sin avisar a nadie más que a los
    // logs del server).
    return NextResponse.json({ ok: true });
  }
}
