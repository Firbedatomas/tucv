/// <reference path="../pb_data/types.d.ts" />
// Flags de privacidad granulares para /configuracion/privacidad. Gatean la
// capa de interacción (invitaciones, recomendaciones, referencias). Son
// permisos "allow": arrancan en true para no cambiar el comportamiento actual
// de los perfiles ya existentes (backfill), y los nuevos los eligen explícito.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  const defs = [
    { id: "bool9002700801", name: "allow_invitations" },
    { id: "bool9002700802", name: "allow_recommendations" },
    { id: "bool9002700803", name: "show_references" },
  ]
  for (const d of defs) {
    collection.fields.addAt(collection.fields.length, new Field({
      "hidden": false,
      "id": d.id,
      "name": d.name,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }))
  }
  app.save(collection)

  // Backfill: los perfiles existentes mantienen todo habilitado.
  const rows = app.findRecordsByFilter("pbc_1078143753", "id != ''", "", 1000, 0)
  for (const r of rows) {
    r.set("allow_invitations", true)
    r.set("allow_recommendations", true)
    r.set("show_references", true)
    app.save(r)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("bool9002700801")
  collection.fields.removeById("bool9002700802")
  collection.fields.removeById("bool9002700803")
  return app.save(collection)
})
