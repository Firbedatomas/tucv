/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101400000")

  // El rol con el que se está invitando (admin o reviewer). Al aceptar, la
  // ruta /api/business-invites/[token]/accept copia este valor a
  // business_members.role. required:false + backfill a "reviewer" para las
  // invitaciones ya emitidas, que fueron creadas cuando toda membresía era
  // implícitamente reviewer.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select9101400006",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["admin", "reviewer"]
  }))
  app.save(collection)

  const rows = app.findRecordsByFilter("pbc_9101400000", "id != ''", "", 1000, 0)
  for (const r of rows) {
    if (!r.get("role")) {
      r.set("role", "reviewer")
      app.save(r)
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101400000")
  collection.fields.removeById("select9101400006")
  return app.save(collection)
})
