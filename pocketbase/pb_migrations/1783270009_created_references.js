/// <reference path="../pb_data/types.d.ts" />
// Sistema de referencias: el candidato genera un link único (reference_token),
// lo comparte a mano con un ex jefe/compañero/cliente, y esa persona carga una
// referencia. Queda pending; el candidato aprueba/oculta/elimina. Nada se
// publica solo. La escritura del referente es siempre por API (pbAdmin) con el
// token -> createRule cerrado. El candidato dueño lista/borra las suyas.
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "updateRule": null,
    "listRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && candidate.user = @request.auth.id",
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
        "id": "relation9002700901",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      { "hidden": false, "id": "text9002700902", "max": 80, "min": 1, "name": "referrer_name", "presentable": false, "required": true, "system": false, "type": "text" },
      {
        "hidden": false,
        "id": "select9002700903",
        "maxSelect": 1,
        "name": "relation",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["conocido", "companiero", "ex_jefe", "cliente", "encargado", "empresa"]
      },
      { "hidden": false, "id": "text9002700904", "max": 120, "min": 0, "name": "company", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "text9002700905", "max": 800, "min": 1, "name": "text", "presentable": false, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "bool9002700906", "name": "show_name", "presentable": false, "required": false, "system": false, "type": "bool" },
      {
        "hidden": false,
        "id": "select9002700907",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["pending", "approved", "hidden", "rejected"]
      },
      { "hidden": false, "id": "text9002700908", "max": 40, "min": 0, "name": "reporter_ip", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "autodate9002700909", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate9002700910", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_9002700009",
    "indexes": ["CREATE INDEX idx_references_candidate ON candidate_references (candidate, status)"],
    "name": "candidate_references",
    "system": false,
    "type": "base"
  })
  app.save(collection)

  // Token único del candidato para su link de referencias (/r/[token]).
  const cp = app.findCollectionByNameOrId("pbc_1078143753")
  cp.fields.addAt(cp.fields.length, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text9002700911",
    "max": 40,
    "min": 0,
    "name": "reference_token",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  return app.save(cp)
}, (app) => {
  const cp = app.findCollectionByNameOrId("pbc_1078143753")
  cp.fields.removeById("text9002700911")
  app.save(cp)
  const collection = app.findCollectionByNameOrId("pbc_9002700009")
  return app.delete(collection)
})
