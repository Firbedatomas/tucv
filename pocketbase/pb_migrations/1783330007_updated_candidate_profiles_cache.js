/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- campos CACHE en candidate_profiles, recalculados por hook/service al
// crear/editar experiencias (Fase 3). Solo performance de cards/panel/matching;
// la fuente de verdad son las colecciones relacionales. ADITIVO: usa
// fields.addAt sobre la colección existente -- NUNCA la redefine (hay 3 campos
// creados a mano en prod, has_own_transport/immediate_availability/expected_salary,
// que no están en migraciones y una redefinición borraría).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "cp_total_exp_months",
    "max": null,
    "min": null,
    "name": "total_experience_months",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "cp_work_exp_count",
    "max": null,
    "min": null,
    "name": "work_experience_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "cp_dominant_categories",
    "maxSize": 5000,
    "name": "dominant_categories",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "cp_dominant_tasks",
    "maxSize": 5000,
    "name": "dominant_tasks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "cp_latest_job_title",
    "max": 120,
    "min": 0,
    "name": "latest_job_title",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "cp_has_current_job",
    "name": "has_current_job",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  collection.fields.removeById("cp_total_exp_months")
  collection.fields.removeById("cp_work_exp_count")
  collection.fields.removeById("cp_dominant_categories")
  collection.fields.removeById("cp_dominant_tasks")
  collection.fields.removeById("cp_latest_job_title")
  collection.fields.removeById("cp_has_current_job")

  return app.save(collection)
})
