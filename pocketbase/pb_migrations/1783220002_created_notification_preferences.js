/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Una fila por usuario (candidato o empresa, misma colección `users`
    // que el resto de la auth). Se crea sola con defaults sensatos en
    // pb_hooks (onRecordAfterCreateSuccess de "users") -- por eso
    // createRule va cerrado acá, para que siempre exista exactamente una
    // fila por usuario con los valores que puso el hook, no lo que mande
    // un cliente. El dueño sí puede leer/editar la suya desde
    // /configuracion/notificaciones.
    "createRule": null,
    "listRule": "user = @request.auth.id",
    "viewRule": "user = @request.auth.id",
    "updateRule": "user = @request.auth.id",
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
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation9001300001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "user",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select9001300002",
        "maxSelect": 1,
        "name": "applications_frequency",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["instant", "daily", "never"]
      },
      {
        "hidden": false,
        "id": "select9001300003",
        "maxSelect": 1,
        "name": "company_digest_frequency",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["daily", "weekly", "never"]
      },
      {
        "hidden": false,
        "id": "select9001300004",
        "maxSelect": 1,
        "name": "profile_views_frequency",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["weekly", "never"]
      },
      {
        "hidden": false,
        "id": "bool9001300005",
        "name": "profile_tips",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool9001300006",
        "name": "marketing",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "number9001300007",
        "max": 23,
        "min": 0,
        "name": "quiet_hours_start",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number9001300008",
        "max": 23,
        "min": 0,
        "name": "quiet_hours_end",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "[a-zA-Z0-9]{32}",
        "hidden": false,
        "id": "text9001300009",
        "max": 32,
        "min": 32,
        "name": "unsubscribe_token",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
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
      },
      {
        "hidden": false,
        "id": "autodate2990389177",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9001300000",
    "indexes": [
      "CREATE UNIQUE INDEX idx_notification_preferences_user ON notification_preferences (user)",
      "CREATE UNIQUE INDEX idx_notification_preferences_unsubscribe_token ON notification_preferences (unsubscribe_token)"
    ],
    "name": "notification_preferences",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001300000")
  return app.delete(collection)
})
