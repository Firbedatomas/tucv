/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- catálogo DB-driven de TAREAS/skills (tasks), agrupadas por rubro
// (campo `category` = slug de job_categories). Alimenta las tareas normalizadas
// de candidate_experience_tasks y el matching por tarea. Lectura pública;
// escritura admin/seed. Texto libre siempre disponible.
migrate((app) => {
  const collection = new Collection({
    "type": "base",
    "name": "tasks",
    "createRule": null,
    "listRule": "",
    "viewRule": "",
    "updateRule": null,
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "taskslug",
        "max": 80,
        "min": 1,
        "name": "slug",
        "pattern": "^[a-z0-9_]+$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "tasklabel",
        "max": 120,
        "min": 1,
        "name": "label",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "taskcat",
        "max": 60,
        "min": 0,
        "name": "category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "tasksort",
        "max": null,
        "min": null,
        "name": "sort",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "taskactive",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "autodate_tk_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_tk_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tasks_slug` ON `tasks` (`slug`)",
      "CREATE INDEX `idx_tasks_category` ON `tasks` (`category`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("tasks")
  return app.delete(collection)
})
