/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && (consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)",
    "viewRule": "(@request.query.token != \"\" && @request.query.token = edit_token) || (@request.auth.id != \"\" && applications_via_candidate.job_post.business.user ?= @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && consent_zone_visible = true",
    "viewRule": "@request.query.token != \"\" && @request.query.token = edit_token"
  }, collection)

  return app.save(collection)
})
