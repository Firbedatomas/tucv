/// <reference path="../pb_data/types.d.ts" />
// Solicitudes de contacto empresa -> candidato. La empresa pide contacto; el
// candidato acepta (se revela su WhatsApp a esa empresa) o rechaza. Si el
// candidato tiene contacto directo activado, la empresa lo ve sin pedir, pero
// igual se registra (contact_revealed). Escrituras solo por API.
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
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
      { "cascadeDelete": true, "collectionId": "pbc_1597278251", "hidden": false, "id": "relation9002701101", "maxSelect": 1, "minSelect": 1, "name": "business", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "cascadeDelete": true, "collectionId": "pbc_1078143753", "hidden": false, "id": "relation9002701102", "maxSelect": 1, "minSelect": 1, "name": "candidate", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "cascadeDelete": false, "collectionId": "pbc_3979010322", "hidden": false, "id": "relation9002701103", "maxSelect": 1, "minSelect": 0, "name": "job_post", "presentable": false, "required": false, "system": false, "type": "relation" },
      { "hidden": false, "id": "text9002701104", "max": 300, "min": 0, "name": "reason", "presentable": false, "required": false, "system": false, "type": "text" },
      {
        "hidden": false,
        "id": "select9002701105",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["pending", "accepted", "rejected"]
      },
      { "hidden": false, "id": "autodate9002701106", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate9002701107", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_9002700011",
    "indexes": ["CREATE INDEX idx_contact_requests_candidate ON contact_requests (candidate, status)"],
    "name": "contact_requests",
    "system": false,
    "type": "base"
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700011")
  return app.delete(collection)
})
