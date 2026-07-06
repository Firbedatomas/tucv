/// <reference path="../pb_data/types.d.ts" />

// Reintentos robustos de la cola de emails (2026-07-06). Suma `attempts` a
// email_queue: cuántas veces se intentó enviar. El flush reintenta ante error
// TRANSITORIO de Resend (con backoff) hasta un máximo, en vez de descartar el
// email al primer fallo. Aditivo, reversible, no toca datos (default 0/null).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("email_queue")
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "eq_attempts",
    "max": null,
    "min": null,
    "name": "attempts",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("email_queue")
  collection.fields.removeById("eq_attempts")
  return app.save(collection)
})
