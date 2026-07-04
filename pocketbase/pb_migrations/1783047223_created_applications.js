/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "job_post.active = true",
    "deleteRule": null,
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
        "collectionId": "pbc_3979010322",
        "hidden": false,
        "id": "relation3712359116",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "job_post",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "relation3367145028",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "nuevo",
          "contactado",
          "entrevista",
          "contratado",
          "descartado"
        ]
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
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_2689671926",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && job_post.business.user = @request.auth.id",
    "name": "applications",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && job_post.business.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && job_post.business.user = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2689671926");

  return app.delete(collection);
})
