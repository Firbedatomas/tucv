/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Moderación básica desde /admin/postulantes -- ver
  // 1783290000_updated_business_accounts.js. Oculta el perfil del listado
  // público (hook de sincronización de public_candidate_cards) sin
  // borrar nada, reversible.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9006300003",
    "name": "suspended",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("bool9006300003")
  return app.save(collection)
})
