/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  const previousListRule = collection.listRule

  // Un colaborador invitado (business_members) puede LISTAR las búsquedas de
  // su negocio igual que el dueño -- solo lectura, createRule/updateRule/
  // deleteRule siguen siendo exclusivamente del dueño (business.user).
  const memberBranch = `business.business_members_via_business.user ?= @request.auth.id`
  collection.listRule = `(${previousListRule}) || (@request.auth.id != "" && ${memberBranch})`

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.listRule = `(@request.auth.id != "" && business.user = @request.auth.id) || (active = true && expires_at > @now)`

  return app.save(collection)
})
