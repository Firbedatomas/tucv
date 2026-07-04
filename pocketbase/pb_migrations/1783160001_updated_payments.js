/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  // Nuevo tipo de pago: destacar una búsqueda puntual (vs. plan_pro, que es
  // por cuenta de negocio). Relacionado a un job_post específico -- vacío
  // para pagos de tipo plan_pro.
  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["plan_pro", "job_boost"]

  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3979010322",
    "hidden": false,
    "id": "relation8823401188",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "job_post",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_631030571")

  const typeField = collection.fields.getById("select2363381545")
  typeField.values = ["plan_pro"]

  collection.fields.removeById("relation8823401188")

  return app.save(collection)
})
