/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Contador simple para el digest semanal "candidate_weekly_profile_views"
  // (ver app/api/cron/weekly) -- no un log detallado por visita (quién,
  // cuándo, desde dónde): alcanza con un número para el email, y evita
  // sumar una tabla de eventos entera para esto. `_total` nunca se resetea
  // (métrica acumulada, no se usa en ningún email hoy); `_since_digest` es
  // el que el cron lee y vuelve a poner en 0 después de mandar el digest.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "number9003250101",
    "max": null,
    "min": 0,
    "name": "profile_views_total",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "number9003250102",
    "max": null,
    "min": 0,
    "name": "profile_views_since_digest",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("number9003250101")
  collection.fields.removeById("number9003250102")
  return app.save(collection)
})
