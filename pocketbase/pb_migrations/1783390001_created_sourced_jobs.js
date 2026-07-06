/// <reference path="../pb_data/types.d.ts" />

// F2 · Búsqueda DETECTADA públicamente (2026-07-06). Cuelga de sourced_businesses.
// Se muestra como "búsqueda no verificada" en el perfil reclamable: el candidato
// ve que la empresa TODAVÍA no administra la publicación en TuCV (sin engañarlo),
// y su interés (candidate_interest) es el gancho de outreach. Al reclamar/publicar
// asciende a un job_posts real (public_job). Reglas null: pbAdmin server-side.
migrate((app) => {
  const bizId = app.findCollectionByNameOrId("sourced_businesses").id
  const jobPostsId = app.findCollectionByNameOrId("job_posts").id

  const collection = new Collection({
    "type": "base",
    "name": "sourced_jobs",
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text_sj_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "cascadeDelete": true, "collectionId": bizId, "hidden": false, "id": "sj_biz", "maxSelect": 1, "minSelect": 0, "name": "sourced_business", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "hidden": false, "id": "sj_role", "max": 120, "min": 0, "name": "role", "pattern": "", "presentable": true, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_rubro", "max": 80, "min": 0, "name": "rubro", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_desc", "max": 600, "min": 0, "name": "description_snippet", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_raw", "max": 4000, "min": 0, "name": "raw_text", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_srcurl", "max": 500, "min": 0, "name": "source_url", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_evidence", "max": 2000, "min": 0, "name": "evidence", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_status", "maxSelect": 1, "name": "status", "presentable": false, "required": false, "system": false, "type": "select", "values": ["detected", "published_unverified", "claimed", "expired"] },
      { "cascadeDelete": false, "collectionId": jobPostsId, "hidden": false, "id": "sj_pubjob", "maxSelect": 1, "minSelect": 0, "name": "public_job", "presentable": false, "required": false, "system": false, "type": "relation" },
      { "hidden": false, "id": "sj_fwd", "max": 300, "min": 0, "name": "apply_forwarding", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_slug", "max": 100, "min": 0, "name": "public_slug", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sj_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "sj_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_sj_slug` ON `sourced_jobs` (`public_slug`) WHERE `public_slug` != ''",
      "CREATE INDEX `idx_sj_biz` ON `sourced_jobs` (`sourced_business`)",
      "CREATE INDEX `idx_sj_status` ON `sourced_jobs` (`status`)"
    ]
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("sourced_jobs")
  return app.delete(collection)
})
