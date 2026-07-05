/// <reference path="../pb_data/types.d.ts" />

// Fase 0 del rediseño de perfil laboral relacional (2026-07-05, aprobado por el
// usuario). Catálogo DB-driven de RUBROS. Reemplaza a futuro la lista fija del
// select `categories` de candidate_profiles + las constantes de lib/constants.ts,
// pero por ahora convive: permite agregar rubros nuevos SIN migraciones. Lectura
// pública (el form del candidato y los filtros lo leen sin auth); escritura solo
// admin/seed. El usuario siempre puede tipear texto libre si un rubro no está.
migrate((app) => {
  const collection = new Collection({
    "type": "base",
    "name": "job_categories",
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
        "id": "jobcatslug",
        "max": 60,
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
        "id": "jobcatlabel",
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
        "id": "jobcatgroup",
        "max": 80,
        "min": 0,
        "name": "group",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "jobcatsort",
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
        "id": "jobcatactive",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "autodate_jc_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_jc_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_job_categories_slug` ON `job_categories` (`slug`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("job_categories")
  return app.delete(collection)
})
