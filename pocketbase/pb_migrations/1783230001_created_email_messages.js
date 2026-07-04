/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text9002200000",
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
        "collectionId": "pbc_9002100000",
        "hidden": false,
        "id": "relation9002200001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "thread",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select9002200002",
        "maxSelect": 1,
        "name": "direction",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["in", "out"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "email9002200003",
        "name": "from_email",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "json9002200004",
        "maxSize": 0,
        "name": "to_emails",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "json"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002200005",
        "max": 300,
        "min": 0,
        "name": "subject",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002200006",
        "max": 0,
        "min": 0,
        "name": "html_body",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002200007",
        "max": 0,
        "min": 0,
        "name": "text_body",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9002200008",
        "max": 100,
        "min": 0,
        "name": "resend_email_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date9002200009",
        "max": "",
        "min": "",
        "name": "read_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate9002200010",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate9002200011",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002200000",
    "indexes": [
      "CREATE INDEX idx_email_messages_thread ON email_messages (thread)",
      "CREATE UNIQUE INDEX idx_email_messages_resend_id ON email_messages (resend_email_id) WHERE resend_email_id != ''"
    ],
    "name": "email_messages",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002200000")
  return app.delete(collection)
})
