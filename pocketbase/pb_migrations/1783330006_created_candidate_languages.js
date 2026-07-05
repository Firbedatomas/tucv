/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- IDIOMAS relacionales (decisión 5: aprobado pero OPCIONAL, nunca
// obligatorio en el registro; sirve para comercio/turismo/hotelería/call center
// sin volver pesado el perfil). Un registro por idioma + nivel. Ownership: dueño.
migrate((app) => {
  const OWNER = "@request.auth.id != \"\" && candidate_profile.user = @request.auth.id"
  const collection = new Collection({
    "type": "base",
    "name": "candidate_languages",
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
        "id": "clg_candidate",
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
        "id": "clg_language",
        "max": 60,
        "min": 1,
        "name": "language",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "clg_level",
        "maxSelect": 1,
        "name": "level",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["basico", "intermedio", "avanzado", "nativo"]
      },
      {
        "hidden": false,
        "id": "autodate_clg_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_clg_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_clg_candidate` ON `candidate_languages` (`candidate_profile`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_languages")
  return app.delete(collection)
})
