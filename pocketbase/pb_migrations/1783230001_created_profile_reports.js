/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Mismo criterio que business_reports: reportar un perfil sospechoso
    // (falso, discriminatorio, pide dinero) no debería exigir cuenta.
    // Nadie salvo el superusuario puede listar/ver -- se revisan a mano.
    // El rate limit por IP va en la propia ruta (lib/rate-limit.ts), no acá.
    "createRule": "",
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
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "relation9002310001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select9002310002",
        "maxSelect": 1,
        "name": "reason",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["parece_falso", "contenido_inapropiado", "datos_incorrectos", "otro"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002310003",
        "max": 500,
        "min": 0,
        "name": "detail",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002310004",
        "max": 200,
        "min": 0,
        "name": "reporter_contact",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002310005",
        "max": 64,
        "min": 0,
        "name": "reporter_ip",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002310000",
    "indexes": [],
    "name": "profile_reports",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002310000")
  return app.delete(collection)
})
