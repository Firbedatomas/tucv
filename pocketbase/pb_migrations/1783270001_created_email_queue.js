/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Cola interna de emails diferidos por horario silencioso (quiet hours).
    // Solo superusuario: la escribe lib/email/send.ts (pbAdmin) cuando un
    // envío cae dentro de la ventana de silencio del usuario, y la vacía
    // /api/cron/flush-email-queue. Guardamos el email YA renderizado
    // (subject/html/text) -- no los datos para rearmarlo -- así el flush
    // solo tiene que mandarlo, sin depender de que el registro origen siga
    // igual (o exista) horas después.
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
        "id": "text9004270001",
        "max": 60,
        "min": 0,
        "name": "type",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation9004270002",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "email9004270003",
        "name": "to",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9004270004",
        "max": 300,
        "min": 0,
        "name": "subject",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        // OJO: max:0 en PocketBase NO es "sin límite" -- cae al tope por
        // defecto de 5000 chars, y el HTML de un email (layout inline +
        // contenido) lo supera fácil. Confirmado probándolo: create de un
        // html de 20k chars devolvía validation_max_text_constraint. Por eso
        // un máximo explícito holgado.
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9004270005",
        "max": 200000,
        "min": 0,
        "name": "html",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9004270006",
        "max": 50000,
        "min": 0,
        "name": "text_body",
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
        "id": "text9004270007",
        "max": 500,
        "min": 0,
        "name": "unsubscribe_url",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date9004270008",
        "max": "",
        "min": "",
        "name": "scheduled_for",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
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
    "id": "pbc_9004270000",
    "indexes": [
      "CREATE INDEX idx_email_queue_scheduled_for ON email_queue (scheduled_for)"
    ],
    "name": "email_queue",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9004270000")
  return app.delete(collection)
})
