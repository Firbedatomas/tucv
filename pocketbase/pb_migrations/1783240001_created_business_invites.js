/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Invitación a colaborar en un negocio. `status` es informativo (se
    // muestra en la UI del dueño) pero NO es lo que otorga acceso real --
    // eso lo hace exclusivamente la fila creada en business_members al
    // aceptar. createRule cerrado: siempre se crea desde
    // /api/business-invites (valida plan + cupo antes de crear).
    "createRule": null,
    "listRule": "business.user = @request.auth.id",
    "viewRule": "business.user = @request.auth.id",
    "updateRule": "business.user = @request.auth.id",
    "deleteRule": "business.user = @request.auth.id",
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
        "id": "relation9101400001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "business",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "email9101400002",
        "name": "email",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "autogeneratePattern": "[a-zA-Z0-9]{32}",
        "hidden": false,
        "id": "text9101400003",
        "max": 32,
        "min": 32,
        "name": "token",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9101400004",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["pending", "accepted", "revoked"]
      },
      {
        "hidden": false,
        "id": "date9101400005",
        "max": "",
        "min": "",
        "name": "expires",
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
    "id": "pbc_9101400000",
    "indexes": [
      "CREATE UNIQUE INDEX idx_business_invites_token ON business_invites (token)"
    ],
    "name": "business_invites",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101400000")
  return app.delete(collection)
})
