/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2689671926")

  // Un colaborador invitado puede ver y actualizar el estado de postulantes
  // de su negocio (el trabajo real de "revisar postulantes") -- pero
  // createRule (postulación pública) y deleteRule (null) no cambian.
  const memberBranch = `job_post.business.business_members_via_business.user ?= @request.auth.id`
  const rule = `@request.auth.id != "" && (job_post.business.user = @request.auth.id || ${memberBranch})`
  collection.listRule = rule
  collection.viewRule = rule
  collection.updateRule = rule

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2689671926")

  const rule = "@request.auth.id != \"\" && job_post.business.user = @request.auth.id"
  collection.listRule = rule
  collection.viewRule = rule
  collection.updateRule = rule

  return app.save(collection)
})
