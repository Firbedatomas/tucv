/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // Marca de tiempo del último digest de "candidatos compatibles" enviado a este
  // negocio (feature Pro). El cron diario solo alerta por candidatos con novedad
  // desde este momento, y lo avanza tras cada corrida. Vacío = todavía no se le
  // mandó ninguno (primera corrida no alerta, solo lo setea).
  collection.fields.add(new Field({
    "hidden": false,
    "id": "date_lastcandalert",
    "max": "",
    "min": "",
    "name": "last_candidate_alert_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  collection.fields.removeById("date_lastcandalert")

  return app.save(collection)
})
