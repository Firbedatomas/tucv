/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // "7" hace falta para el plan gratis (lib/plan-limits.ts maxDurationDays)
  // -- sin este valor en el select, crear una búsqueda gratis fallaba con
  // 400 al forzar duration_days a 7.
  const field = collection.fields.getById("select3098838237")
  field.values = ["7", "15", "30"]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  const field = collection.fields.getById("select3098838237")
  field.values = ["15", "30"]

  return app.save(collection)
})
