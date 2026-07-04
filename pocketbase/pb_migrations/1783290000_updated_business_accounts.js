/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // Moderación básica desde /admin/negocios. `suspended` oculta las
  // búsquedas del negocio del listado público (job_posts.listRule más
  // abajo) sin borrar nada -- reversible. `verified` es solo informativo
  // por ahora (no cambia ninguna regla de acceso), un badge que el admin
  // prende a mano para negocios que confirmó de verdad.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9006300001",
    "name": "verified",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9006300002",
    "name": "suspended",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")
  collection.fields.removeById("bool9006300001")
  collection.fields.removeById("bool9006300002")
  return app.save(collection)
})
