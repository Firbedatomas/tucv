/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // "Invitar a postularse": una empresa invita a un candidato del directorio a
  // una búsqueda concreta. Si el candidato acepta, se crea una postulación
  // normal (application). Loop interno propio de TuCV, distinto de las
  // invitaciones de EQUIPO (business_invites), que suman colaboradores.
  const collection = new Collection({
    // Escrituras solo por API server (pbAdmin): crear valida que la búsqueda
    // sea del negocio y dispara el email; aceptar/rechazar crea la postulación.
    // Por eso create/update/delete quedan cerrados al cliente.
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    // La empresa ve las invitaciones que mandó; el candidato ve las que recibió.
    "listRule": "(@request.auth.id != \"\" && business.user = @request.auth.id) || (@request.auth.id != \"\" && candidate.user = @request.auth.id)",
    "viewRule": "(@request.auth.id != \"\" && business.user = @request.auth.id) || (@request.auth.id != \"\" && candidate.user = @request.auth.id)",
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
        "id": "relation9002700501",
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
        "id": "relation9002700502",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3979010322",
        "hidden": false,
        "id": "relation9002700503",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "job_post",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select9002700504",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["enviada", "aceptada", "rechazada"]
      },
      {
        "hidden": false,
        "id": "text9002700505",
        "max": 500,
        "min": 0,
        "name": "message",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate9002700506",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate9002700507",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002700005",
    "indexes": [
      "CREATE UNIQUE INDEX idx_candidate_invitations_unique ON candidate_invitations (business, candidate, job_post)"
    ],
    "name": "candidate_invitations",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700005")
  return app.delete(collection)
})
