/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  // "multi_local" y "job_extend" se agregaron a mano en el admin de
  // PocketBase (mismo patrón que "multi_local" en business_accounts.plan --
  // ver scripts/pb-migrate-multi-local-plan.mjs) y nunca quedaron en una
  // migración. Ver también 1783159999_created_payments.js.
  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["plan_pro", "job_boost", "multi_local", "job_extend"]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["plan_pro", "job_boost"]

  return app.save(collection)
})
