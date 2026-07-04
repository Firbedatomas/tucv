/// <reference path="../pb_data/types.d.ts" />
// Suma "contratado" al final del pipeline del mini-CRM (guardado -> contactado
// -> entrevistado -> descartado / contratado). Solo agrega un valor al select,
// no toca datos existentes.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700004")
  const field = collection.fields.getById("select9002700403")
  field.values = ["guardado", "contactado", "entrevistado", "descartado", "contratado"]
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700004")
  const field = collection.fields.getById("select9002700403")
  field.values = ["guardado", "contactado", "entrevistado", "descartado"]
  return app.save(collection)
})
