/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- catálogo DB-driven de PUESTOS (job_roles), agrupados por rubro
// (campo `category` = slug de job_categories, texto para no acoplar y permitir
// puestos de rubros libres). Lectura pública; escritura admin/seed. Texto libre
// siempre disponible en la UI si el puesto no está.
migrate((app) => {
  const collection = new Collection({
    "type": "base",
    "name": "job_roles",
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
        "id": "jobroleslug",
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
        "id": "jobrolelabel",
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
        "id": "jobrolecat",
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
        "id": "jobrolesort",
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
        "id": "jobroleactive",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "autodate_jr_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_jr_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_job_roles_slug` ON `job_roles` (`slug`)",
      "CREATE INDEX `idx_job_roles_category` ON `job_roles` (`category`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("job_roles")
  return app.delete(collection)
})
