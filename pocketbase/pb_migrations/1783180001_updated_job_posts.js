/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Conteo de veces que se tocó cada botón de compartir -- { whatsapp, x,
  // instagram }. Es un contador best-effort (cualquiera puede pegarle al
  // endpoint sin login, como cualquier botón de compartir público), no una
  // métrica a prueba de manipulación; alcanza para que el dueño de la
  // búsqueda tenga una idea de qué tanto se compartió.
  collection.fields.addAt(25, new Field({
    "hidden": false,
    "id": "json8823401194",
    "maxSize": 2000,
    "name": "share_counts",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("json8823401194")

  return app.save(collection)
})
