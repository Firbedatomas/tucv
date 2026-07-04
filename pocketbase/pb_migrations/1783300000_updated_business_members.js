/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101300000")

  // Rol del colaborador dentro del negocio. Hasta ahora toda membresía era
  // implícitamente "reviewer" (ver/marcar postulantes, nada más). Sumamos
  // "admin" para quien además puede crear/editar búsquedas e invitar equipo.
  // El dueño NO vive acá -- es la fila de business_accounts (ver
  // lib/business-access.ts), su rol "owner" es implícito.
  //
  // required:false a propósito: las filas que ya existen no tienen valor y
  // no queremos que la migración las rechace. El backfill de abajo las pone
  // en "reviewer" (el comportamiento que ya tenían), y el código trata la
  // ausencia de rol como "reviewer" por las dudas (business-access.ts).
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select9101300003",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["admin", "reviewer"]
  }))
  app.save(collection)

  // Backfill: todo miembro ya existente pasa a "reviewer" explícito.
  const rows = app.findRecordsByFilter("pbc_9101300000", "id != ''", "", 1000, 0)
  for (const r of rows) {
    if (!r.get("role")) {
      r.set("role", "reviewer")
      app.save(r)
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9101300000")
  collection.fields.removeById("select9101300003")
  return app.save(collection)
})
