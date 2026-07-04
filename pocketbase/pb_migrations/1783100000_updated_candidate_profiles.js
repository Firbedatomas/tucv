/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // add field
  collection.fields.addAt(27, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1899876543",
    "maxSelect": 1,
    "minSelect": 1,
    "name": "user",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // Parcial: los candidate_profiles de antes de este cambio quedan con
  // user="" (no hubo backfill) -- un índice único normal chocaría contra
  // esos duplicados. Con el WHERE, esos registros viejos (huérfanos, ya
  // inaccesibles por las reglas de abajo) no cuentan para la unicidad.
  collection.indexes.push(
    "CREATE UNIQUE INDEX idx_candidate_profiles_user ON candidate_profiles (user) WHERE user != ''",
  )

  // update collection data: login con Google reemplaza el edit_token como
  // mecanismo de autorización -- el campo edit_token queda en el schema por
  // compatibilidad de datos viejos, pero deja de usarse en las reglas.
  // listRule suma "user = @request.auth.id" para que el postulante pueda
  // encontrar su propio perfil (getFirstListItem) sin depender de
  // consent_zone_visible ni de tener una postulación ya hecha.
  unmarshal({
    "createRule": "@request.auth.id != \"\" && user = @request.auth.id && consent_save = true",
    "deleteRule": "user = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && (user = @request.auth.id || consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)",
    "updateRule": "user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && (user = @request.auth.id || applications_via_candidate.job_post.business.user ?= @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // remove field
  collection.fields.removeById("relation1899876543")

  collection.indexes = collection.indexes.filter((idx) => idx.indexOf("idx_candidate_profiles_user") === -1)

  // update collection data
  unmarshal({
    "createRule": "consent_save = true",
    "deleteRule": "@request.query.token != \"\" && @request.query.token = edit_token",
    "listRule": "@request.auth.id != \"\" && (consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)",
    "updateRule": "@request.query.token != \"\" && @request.query.token = edit_token",
    "viewRule": "(@request.query.token != \"\" && @request.query.token = edit_token) || (@request.auth.id != \"\" && applications_via_candidate.job_post.business.user ?= @request.auth.id)"
  }, collection)

  return app.save(collection)
})
