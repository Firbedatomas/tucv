/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- ESTUDIOS relacionales (carreras/cursos/certificaciones). Reemplaza
// el JSON `studies` de candidate_profiles (que queda read-only de respaldo). Un
// registro por estudio, con estado en_curso/completo/abandonado. Ownership: solo
// el dueño hace CRUD desde el cliente.
migrate((app) => {
  const OWNER = "@request.auth.id != \"\" && candidate_profile.user = @request.auth.id"
  const collection = new Collection({
    "type": "base",
    "name": "candidate_education",
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
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "ced_candidate",
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
        "id": "ced_title",
        "max": 160,
        "min": 1,
        "name": "title",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "ced_kind",
        "maxSelect": 1,
        "name": "kind",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["carrera", "curso", "certificacion"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "ced_institution",
        "max": 160,
        "min": 0,
        "name": "institution",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "ced_level",
        "maxSelect": 1,
        "name": "level",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["primario", "secundario", "terciario", "universitario", "posgrado"]
      },
      {
        "hidden": false,
        "id": "ced_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["en_curso", "completo", "abandonado"]
      },
      {
        "hidden": false,
        "id": "ced_start_year",
        "max": 2100,
        "min": 1950,
        "name": "start_year",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "ced_end_year",
        "max": 2100,
        "min": 1950,
        "name": "end_year",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate_ced_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_ced_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_ced_candidate` ON `candidate_education` (`candidate_profile`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_education")
  return app.delete(collection)
})
