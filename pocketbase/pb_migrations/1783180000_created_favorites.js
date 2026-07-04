/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    // El negocio dueño de la búsqueda necesita ver CUÁNTOS favoritos tiene
    // (no quién en particular) -- se resuelve con un conteo
    // (getList(1,1,...).totalItems) contra este mismo listRule, sin
    // exponer los perfiles de quién guardó qué.
    "listRule": "(@request.auth.id != \"\" && candidate.user = @request.auth.id) || (@request.auth.id != \"\" && job_post.business.user = @request.auth.id)",
    "viewRule": "(@request.auth.id != \"\" && candidate.user = @request.auth.id) || (@request.auth.id != \"\" && job_post.business.user = @request.auth.id)",
    "deleteRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "updateRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "relation8823401191",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3979010322",
        "hidden": false,
        "id": "relation8823401192",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "job_post",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_8823401193",
    "indexes": [
      "CREATE UNIQUE INDEX idx_favorites_candidate_job ON favorites (candidate, job_post)"
    ],
    "name": "favorites",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_8823401193")
  return app.delete(collection)
})
