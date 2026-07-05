/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- TAREAS normalizadas por experiencia (decisión del usuario:
// relacional para matching/ranking por tarea). Además de `experience`, guarda
// `candidate_profile` denormalizado: simplifica la regla de ownership (un solo
// hop) y las queries de matching. `task` es el texto/slug (catálogo o libre);
// `task_catalog` la relación opcional al catálogo `tasks`. El cache
// `dominant_tasks` en candidate_profiles (otra migración) resume esto para las
// cards.
migrate((app) => {
  const cwe = app.findCollectionByNameOrId("candidate_work_experiences")
  const tasksCat = app.findCollectionByNameOrId("tasks")
  const OWNER = "@request.auth.id != \"\" && candidate_profile.user = @request.auth.id"

  const collection = new Collection({
    "type": "base",
    "name": "candidate_experience_tasks",
    "createRule": OWNER,
    "listRule": OWNER,
    "viewRule": OWNER,
    "updateRule": OWNER,
    "deleteRule": OWNER,
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
        "collectionId": cwe.id,
        "hidden": false,
        "id": "cet_experience",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "experience",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "cet_candidate",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "candidate_profile",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "cet_task",
        "max": 120,
        "min": 1,
        "name": "task",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": tasksCat.id,
        "hidden": false,
        "id": "cet_catalog",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "task_catalog",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "autodate_cet_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_cet_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_cet_experience` ON `candidate_experience_tasks` (`experience`)",
      "CREATE INDEX `idx_cet_candidate` ON `candidate_experience_tasks` (`candidate_profile`)",
      "CREATE INDEX `idx_cet_task` ON `candidate_experience_tasks` (`task`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_experience_tasks")
  return app.delete(collection)
})
