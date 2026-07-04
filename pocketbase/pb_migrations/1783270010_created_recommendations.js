/// <reference path="../pb_data/types.d.ts" />
// Recomendaciones: aval liviano de un usuario LOGUEADO y con email verificado
// sobre un perfil. No anónimo, sin autorrecomendación, una por usuario/perfil
// (índice único). Queda pending; el candidato aprueba/oculta/rechaza. El
// público ve el conteo agregado; nombre/texto solo si aprobada + show_name.
// recommender_user es texto (userId) para evitar acoplar al id de la colección
// auth; el chequeo de "verificado / no es él mismo" se hace en la API.
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "updateRule": null,
    "listRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
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
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "relation9002701001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      { "hidden": false, "id": "text9002701002", "max": 40, "min": 1, "name": "recommender_user", "presentable": false, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "text9002701003", "max": 80, "min": 0, "name": "recommender_name", "presentable": false, "required": false, "system": false, "type": "text" },
      {
        "hidden": false,
        "id": "select9002701004",
        "maxSelect": 1,
        "name": "relation",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["conocido", "companiero", "ex_jefe", "cliente", "encargado", "empresa"]
      },
      { "hidden": false, "id": "text9002701005", "max": 500, "min": 0, "name": "text", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "bool9002701006", "name": "show_name", "presentable": false, "required": false, "system": false, "type": "bool" },
      {
        "hidden": false,
        "id": "select9002701007",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["pending", "approved", "hidden", "rejected"]
      },
      { "hidden": false, "id": "autodate9002701008", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate9002701009", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_9002700010",
    "indexes": [
      "CREATE UNIQUE INDEX idx_recommendations_unique ON recommendations (candidate, recommender_user)"
    ],
    "name": "recommendations",
    "system": false,
    "type": "base"
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700010")
  return app.delete(collection)
})
