/// <reference path="../pb_data/types.d.ts" />
// Bloqueos candidato -> empresa. "Este candidato bloqueó a esta empresa": la
// empresa ya no puede enviarle solicitudes de contacto. Lo crea/borra el
// candidato dueño por API (pbAdmin) con su token -> escrituras cerradas.
// El candidato dueño lista/ve los suyos. Índice único (candidate, business).
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "listRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
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
      { "cascadeDelete": true, "collectionId": "pbc_1078143753", "hidden": false, "id": "relation9002701601", "maxSelect": 1, "minSelect": 1, "name": "candidate", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "cascadeDelete": true, "collectionId": "pbc_1597278251", "hidden": false, "id": "relation9002701602", "maxSelect": 1, "minSelect": 1, "name": "business", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "hidden": false, "id": "autodate9002701603", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_9002700016",
    "indexes": ["CREATE UNIQUE INDEX idx_blocks_candidate_business ON blocks (candidate, business)"],
    "name": "blocks",
    "system": false,
    "type": "base"
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700016")
  return app.delete(collection)
})
