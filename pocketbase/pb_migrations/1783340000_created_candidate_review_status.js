/// <reference path="../pb_data/types.d.ts" />

// Estado "visto" del recruiter (2026-07-05, aprobado). Colección SEPARADA a
// propósito -- no se extendió saved_candidates porque /api/business-activity
// cuenta TODOS los saved_candidates como la métrica "Candidatos guardados", y
// meter "viewed" ahí la inflaría. Acá "visto" vive aparte: nunca pisa
// guardado/contactado/descartado (la UI prioriza el estado de saved_candidates).
// Aditiva, reversible, no toca datos existentes. Unique (business_account,
// candidate_profile) -> no duplica. Ownership: mismo patrón que saved_candidates.
migrate((app) => {
  const OWNER = "@request.auth.id != \"\" && business_account.user = @request.auth.id"
  const collection = new Collection({
    "type": "base",
    "name": "candidate_review_status",
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
        "collectionId": "pbc_1597278251",
        "hidden": false,
        "id": "crs_business",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "business_account",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "crs_candidate",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "candidate_profile",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "crs_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["viewed"]
      },
      {
        "hidden": false,
        "id": "autodate_crs_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_crs_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_crs_business_candidate` ON `candidate_review_status` (`business_account`, `candidate_profile`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_review_status")
  return app.delete(collection)
})
