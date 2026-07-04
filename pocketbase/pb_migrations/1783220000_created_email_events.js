/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Solo el superusuario (pbAdmin desde la app de Next) escribe y lee acá.
    // Es un log interno de entregabilidad, no algo que el usuario final
    // necesite ver desde su cuenta todavía.
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
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
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation9001100001",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "user",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "email9001100002",
        "name": "email",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "select9001100003",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "welcome_candidate",
          "welcome_company",
          "profile_started",
          "profile_completed",
          "public_profile_enabled",
          "application_received_candidate",
          "new_application_company",
          "job_expiring",
          "job_deactivated_summary",
          "company_daily_job_digest",
          "candidate_weekly_profile_views"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9001100004",
        "max": 200,
        "min": 0,
        "name": "provider_message_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9001100005",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "queued",
          "sent",
          "delivered",
          "opened",
          "clicked",
          "bounced",
          "complained",
          "failed",
          "suppressed"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9001100006",
        "max": 2000,
        "min": 0,
        "name": "error",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json9001100007",
        "maxSize": 0,
        "name": "metadata",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate2990389177",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9001100000",
    "indexes": [
      "CREATE INDEX idx_email_events_provider_message_id ON email_events (provider_message_id)",
      "CREATE INDEX idx_email_events_email ON email_events (email)"
    ],
    "name": "email_events",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001100000")
  return app.delete(collection)
})
