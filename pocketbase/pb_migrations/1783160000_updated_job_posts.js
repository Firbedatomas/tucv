/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Vacío = nunca se destacó / ya venció el destaque. El feed público y el
  // listado ordenan primero por esto (featured_until > ahora), después por
  // fecha de creación -- ver lib/public-jobs-list.ts.
  collection.fields.addAt(24, new Field({
    "hidden": false,
    "id": "date8823401187",
    "max": "",
    "min": "",
    "name": "featured_until",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("date8823401187")

  return app.save(collection)
})
