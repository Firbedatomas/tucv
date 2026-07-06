/// <reference path="../pb_data/types.d.ts" />

// F2: logo de la empresa detectada (2026-07-06). Guardamos la URL del logo/imagen
// oficial que el robot saca de la página (og:image o un <img> de logo). Se muestra
// dimensionado por CSS en /e/[slug] y /oportunidades. Aditivo, reversible.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sourced_businesses")
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "sb_logo_url",
    "max": 500,
    "min": 0,
    "name": "logo_url",
    "pattern": "",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("sourced_businesses")
  collection.fields.removeById("sb_logo_url")
  return app.save(collection)
})
