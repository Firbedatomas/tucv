/// <reference path="../pb_data/types.d.ts" />

// F2 · Interés de un candidato en una búsqueda NO verificada (2026-07-06). No es
// una postulación formal (la empresa todavía no administra la publicación) -- es
// la señal blanda que se usa como gancho de outreach ("ya tenés X interesados").
// Cuando la empresa reclama y verifica, este interés se convierte en
// postulaciones reales. Reglas null: se crea vía una ruta Next (pbAdmin) que
// valida, para no engañar al candidato ni exponer la colección.
migrate((app) => {
  const jobId = app.findCollectionByNameOrId("sourced_jobs").id

  const collection = new Collection({
    "type": "base",
    "name": "candidate_interest",
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text_ci_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "cascadeDelete": true, "collectionId": jobId, "hidden": false, "id": "ci_job", "maxSelect": 1, "minSelect": 0, "name": "sourced_job", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "cascadeDelete": true, "collectionId": "pbc_1078143753", "hidden": false, "id": "ci_cand", "maxSelect": 1, "minSelect": 0, "name": "candidate", "presentable": false, "required": false, "system": false, "type": "relation" },
      { "hidden": false, "id": "ci_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_ci_job_cand` ON `candidate_interest` (`sourced_job`, `candidate`) WHERE `candidate` != ''",
      "CREATE INDEX `idx_ci_job` ON `candidate_interest` (`sourced_job`)"
    ]
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_interest")
  return app.delete(collection)
})
