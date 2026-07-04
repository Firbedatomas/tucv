/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Cuando category="otro", que aclare cuál -- mismo patrón que ya usa
  // candidate_profiles.category_other.
  collection.fields.addAt(55, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401182",
    "max": 120,
    "min": 0,
    "name": "category_other",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // JSON (no select de valores fijos) porque el vocabulario de tareas
  // depende del rubro elegido -- mismo criterio que ya se usó para `perks`.
  collection.fields.addAt(56, new Field({
    "hidden": false,
    "id": "json8823401183",
    "maxSize": 5000,
    "name": "main_tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("text8823401182")
  collection.fields.removeById("json8823401183")

  return app.save(collection)
})
