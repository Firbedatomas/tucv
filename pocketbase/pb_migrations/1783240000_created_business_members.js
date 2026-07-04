/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Fila = "este usuario tiene acceso de colaborador a este negocio".
    // Siempre se crea server-side (accept-invite route, con pbAdmin) después
    // de validar el token de invitación + que el email coincida -- por eso
    // createRule va cerrado, igual que notification_preferences. El dueño sí
    // puede borrar (sacar a alguien de su equipo) y el propio miembro puede
    // borrar su fila (salir del equipo).
    "createRule": null,
    "listRule": "business.user = @request.auth.id || user = @request.auth.id",
    "viewRule": "business.user = @request.auth.id || user = @request.auth.id",
    "updateRule": null,
    "deleteRule": "business.user = @request.auth.id || user = @request.auth.id",
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
        "collectionId": "pbc_1597278251",
        "hidden": false,
        "id": "relation9101300001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "business",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation9101300002",
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
    "id": "pbc_9101300000",
    "indexes": [
      // Un usuario solo puede pertenecer a un negocio a la vez (como
      // colaborador) -- simplifica el modelo V1: no hay selector de "negocio
      // activo" en la UI. business_accounts ya impone lo mismo para dueños
      // (idx_business_accounts_user) por la misma razón.
      "CREATE UNIQUE INDEX idx_business_members_user ON business_members (user)"
    ],
    "name": "business_members",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101300000")
  return app.delete(collection)
})
