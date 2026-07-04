/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Público a propósito -- reportar un negocio sospechoso no debería
    // exigir crearse una cuenta primero. A cambio, nadie (ni el propio
    // negocio reportado) puede LISTAR ni VER los reportes salvo el
    // superusuario -- se revisan a mano desde el admin de PocketBase.
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
        "collectionId": "pbc_3979010322",
        "hidden": false,
        "id": "relation8823401196",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "job_post",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select8823401197",
        "maxSelect": 1,
        "name": "reason",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "parece_falso",
          "pide_dinero_o_datos",
          "discriminatorio_u_ofensivo",
          "otro"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text8823401198",
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
        "id": "text8823401199",
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
    "id": "pbc_8823401200",
    "indexes": [],
    "name": "business_reports",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_8823401200")
  return app.delete(collection)
})
