/// <reference path="../pb_data/types.d.ts" />

// El select `email_events.type` se quedó corto: le faltaban 4 valores de
// EmailType (candidate_invitation, contact_request, candidate_match_digest y el
// nuevo campaign). Loguear un evento de esos tipos tiraba 400 -> el flush de la
// cola hacía 500 y reenviaba el email (duplicado, visto con "campaign"). Además
// de esto, logEmailEvent ahora es best-effort. Reversible (vuelve a los 13).
const FULL = [
  "welcome_candidate", "welcome_company", "profile_started", "profile_completed",
  "public_profile_enabled", "application_received_candidate", "new_application_company",
  "job_expiring", "job_deactivated_summary", "company_daily_job_digest",
  "candidate_weekly_profile_views", "team_invite", "company_weekly_job_digest",
  "candidate_invitation", "contact_request", "candidate_match_digest", "campaign",
]
const ORIGINAL = FULL.slice(0, 13)

migrate((app) => {
  const collection = app.findCollectionByNameOrId("email_events")
  const field = collection.fields.getByName("type")
  field.values = FULL
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("email_events")
  const field = collection.fields.getByName("type")
  field.values = ORIGINAL
  return app.save(collection)
})
