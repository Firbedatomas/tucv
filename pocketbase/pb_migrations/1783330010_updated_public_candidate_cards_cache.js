/// <reference path="../pb_data/types.d.ts" />

// Fase 2 -- campos cache en el espejo público public_candidate_cards, para que
// la card pública (Fase 3) muestre años/cantidad/rubros y el matching público
// cruce por rubros de experiencia. ADITIVO (no redefine). Los popula el hook de
// sincronización del espejo, con fallback al `experience` global viejo.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9005270000")

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false, "id": "pcc_total_exp_m", "max": null, "min": null,
    "name": "total_experience_months", "onlyInt": true, "presentable": false,
    "required": false, "system": false, "type": "number"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false, "id": "pcc_work_exp_cnt", "max": null, "min": null,
    "name": "work_experience_count", "onlyInt": true, "presentable": false,
    "required": false, "system": false, "type": "number"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false, "id": "pcc_dominant_cats", "maxSize": 5000,
    "name": "dominant_categories", "presentable": false, "required": false,
    "system": false, "type": "json"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false, "id": "pcc_exp_cats", "maxSize": 5000,
    "name": "experience_categories", "presentable": false, "required": false,
    "system": false, "type": "json"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "autogeneratePattern": "", "hidden": false, "id": "pcc_latest_job",
    "max": 120, "min": 0, "name": "latest_job_title", "pattern": "",
    "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text"
  }))
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false, "id": "pcc_has_current", "name": "has_current_job",
    "presentable": false, "required": false, "system": false, "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9005270000")
  collection.fields.removeById("pcc_total_exp_m")
  collection.fields.removeById("pcc_work_exp_cnt")
  collection.fields.removeById("pcc_dominant_cats")
  collection.fields.removeById("pcc_exp_cats")
  collection.fields.removeById("pcc_latest_job")
  collection.fields.removeById("pcc_has_current")
  return app.save(collection)
})
