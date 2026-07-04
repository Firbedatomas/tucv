/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Lista de supresión de envíos (bounce/queja/manual). Solo superusuario:
    // se escribe desde el webhook de Resend (pbAdmin) y se consulta desde
    // lib/email antes de cada envío, nunca directamente desde el browser.
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "email9001200001",
        "name": "email",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "select9001200002",
        "maxSelect": 1,
        "name": "reason",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["bounced", "complained", "manual"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9001200003",
        "max": 2000,
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
    "id": "pbc_9001200000",
    "indexes": [
      "CREATE UNIQUE INDEX idx_email_suppressions_email ON email_suppressions (email)"
    ],
    "name": "email_suppressions",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001200000")
  return app.delete(collection)
})
