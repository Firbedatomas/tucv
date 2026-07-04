/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // Descripción libre y opcional -- ayuda a diferenciar "somos una cadena
  // grande" de "somos un café de barrio" con contenido real, en vez de
  // dejar el perfil reducido a nombre + teléfono + zona.
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401195",
    "max": 400,
    "min": 0,
    "name": "bio",
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

  collection.fields.removeById("text8823401195")

  return app.save(collection)
})
