/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_236192342")

  // Nuevo tipo de consentimiento: listado público en /postulantes (ver
  // consent_public_profile en candidate_profiles).
  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["save_profile", "zone_visible", "public_profile"]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_236192342")

  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["save_profile", "zone_visible"]

  return app.save(collection)
})
