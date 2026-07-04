/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // Web y/o Instagram del negocio -- ambos opcionales, se muestran en el
  // link público de cada búsqueda para que el postulante pueda ver más del
  // negocio antes de postularse.
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401189",
    "max": 200,
    "min": 0,
    "name": "website",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401190",
    "max": 200,
    "min": 0,
    "name": "instagram",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  collection.fields.removeById("text8823401189")
  collection.fields.removeById("text8823401190")

  return app.save(collection)
})
