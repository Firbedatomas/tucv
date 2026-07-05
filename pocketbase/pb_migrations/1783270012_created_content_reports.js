/// <reference path="../pb_data/types.d.ts" />
// Reportes de contenido generado por terceros (referencias y recomendaciones)
// que aparece en un perfil público. Cualquier visitante puede reportar un item
// puntual; la escritura es siempre por API (pbAdmin) con rate-limit por IP ->
// createRule cerrado. Solo el admin lee/gestiona (valida sesión aparte).
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9002700121",
        "maxSelect": 1,
        "name": "content_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["reference", "recommendation"]
      },
      { "hidden": false, "id": "text9002700122", "max": 40, "min": 1, "name": "content_id", "presentable": false, "required": true, "system": false, "type": "text" },
      {
        "hidden": false,
        "id": "select9002700123",
        "maxSelect": 1,
        "name": "reason",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["falsa", "ofensiva", "spam", "otro"]
      },
      { "hidden": false, "id": "text9002700124", "max": 800, "min": 0, "name": "detail", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "text9002700125", "max": 40, "min": 0, "name": "reporter_ip", "presentable": false, "required": false, "system": false, "type": "text" },
      {
        "hidden": false,
        "id": "select9002700126",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["pending", "reviewed", "dismissed"]
      },
      { "hidden": false, "id": "autodate9002700127", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_9002700012",
    "indexes": ["CREATE INDEX idx_content_reports_type ON content_reports (content_type, content_id)"],
    "name": "content_reports",
    "system": false,
    "type": "base"
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700012")
  return app.delete(collection)
})
