/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Preguntas filtro configurables por búsqueda -- JSON (no relación a otra
  // colección) porque son 3-5 preguntas ad-hoc por búsqueda, sin necesidad
  // de reusarlas entre búsquedas ni reportarlas por separado. Cada item:
  // { id, question, type: "si_no"|"texto", weight: "alto"|"medio"|"bajo" }.
  collection.fields.addAt(57, new Field({
    "hidden": false,
    "id": "json8823401184",
    "maxSize": 6000,
    "name": "screening_questions",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("json8823401184")

  return app.save(collection)
})
