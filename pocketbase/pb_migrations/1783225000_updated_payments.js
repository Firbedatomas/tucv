/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  // `payments` se creó fuera de las migraciones (no hay created_payments.js
  // en el repo) y quedó sin los campos `created`/`updated` -- sin esto no
  // hay forma de ordenar por fecha ni de saber "pagos de hoy" para el panel
  // de admin. Los pagos ya existentes quedan con estos campos vacíos (no hay
  // otra fuente de verdad para reconstruir la fecha real); todo pago nuevo
  // los completa solo.
  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate3208210300",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate3208210301",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  collection.fields.removeById("autodate3208210300")
  collection.fields.removeById("autodate3208210301")

  return app.save(collection)
})
