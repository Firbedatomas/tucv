/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Mini-CRM: una empresa guarda candidatos del directorio proactivo y les
  // lleva un estado (guardado -> contactado -> entrevistado / descartado) con
  // una nota interna. Distinto de `favorites`, que es "un postulante marca un
  // aviso": esto es "una empresa marca un candidato", en el otro sentido.
  const collection = new Collection({
    // Solo la empresa dueña ve/edita sus guardados. Mismo patrón de propiedad
    // que el resto (business.user = @request.auth.id). El candidato NO ve que
    // lo guardaron ni la nota interna.
    "createRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "updateRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
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
        "id": "relation9002700401",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "business",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "relation9002700402",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select9002700403",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["guardado", "contactado", "entrevistado", "descartado"]
      },
      {
        "hidden": false,
        "id": "text9002700404",
        "max": 2000,
        "min": 0,
        "name": "note",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate9002700405",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate9002700406",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002700004",
    "indexes": [
      "CREATE UNIQUE INDEX idx_saved_candidates_business_candidate ON saved_candidates (business, candidate)"
    ],
    "name": "saved_candidates",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700004")
  return app.delete(collection)
})
