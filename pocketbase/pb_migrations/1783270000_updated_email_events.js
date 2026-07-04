/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001100000")

  // Nuevo tipo: digest semanal de empresa (company_weekly_job_digest, ver
  // lib/email/templates/company-weekly-job-digest.ts) -- hace real la opción
  // "semanal" del centro de preferencias. Mismo cuidado que con team_invite:
  // sin sumarlo acá, logEmailEvent tira 400 al loguear el primer envío.
  const typeField = collection.fields.getById("select9001100003")
  typeField.values = [...typeField.values, "company_weekly_job_digest"]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001100000")

  const typeField = collection.fields.getById("select9001100003")
  typeField.values = typeField.values.filter((v) => v !== "company_weekly_job_digest")

  return app.save(collection)
})
