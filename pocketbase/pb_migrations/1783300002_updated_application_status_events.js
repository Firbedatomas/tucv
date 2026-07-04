/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1464196590")

  // Traza de quién cambió el estado de un postulante, desde qué estado, y una
  // nota interna opcional. Hasta ahora esta colección existía pero no la
  // escribía nadie -- ahora la escribe /api/applications/[id]/status (server,
  // con pbAdmin) en cada cambio. Todos los campos son opcionales: `changed_by`
  // puede faltar si algún día el cambio lo hace un proceso, y `from_status`
  // no existe para el primer evento de una postulación.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select9146196001",
    "maxSelect": 1,
    "name": "from_status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["nuevo", "contactado", "entrevista", "contratado", "descartado"]
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text9146196002",
    "max": 2000,
    "min": 0,
    "name": "note",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation9146196003",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "changed_by",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // El dueño Y los colaboradores del negocio pueden LEER el historial de sus
  // postulantes. createRule sigue null: los eventos solo se crean server-side
  // (ruta con pbAdmin), nunca directo desde el cliente.
  const memberBranch = `application.job_post.business.business_members_via_business.user ?= @request.auth.id`
  const rule = `@request.auth.id != "" && (application.job_post.business.user = @request.auth.id || ${memberBranch})`
  collection.listRule = rule
  collection.viewRule = rule

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1464196590")
  collection.fields.removeById("select9146196001")
  collection.fields.removeById("text9146196002")
  collection.fields.removeById("relation9146196003")
  const rule = `@request.auth.id != "" && application.job_post.business.user = @request.auth.id`
  collection.listRule = rule
  collection.viewRule = rule
  return app.save(collection)
})
