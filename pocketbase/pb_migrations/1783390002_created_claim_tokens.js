/// <reference path="../pb_data/types.d.ts" />

// F2 · Reclamo/verificación de una empresa detectada (2026-07-06). Cuando la
// empresa reclama su perfil no verificado, se valida que sea suya (dominio del
// email, OTP al teléfono, o manual) y recién ahí sourced_business asciende a
// business_accounts. Reglas null: el flujo lo maneja el server (pbAdmin) para no
// exponer tokens ni permitir auto-verificación desde el cliente.
migrate((app) => {
  const bizId = app.findCollectionByNameOrId("sourced_businesses").id

  const collection = new Collection({
    "type": "base",
    "name": "claim_tokens",
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text_ct_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "cascadeDelete": true, "collectionId": bizId, "hidden": false, "id": "ct_biz", "maxSelect": 1, "minSelect": 0, "name": "sourced_business", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "hidden": false, "id": "ct_token", "max": 100, "min": 0, "name": "token", "pattern": "", "presentable": false, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "ct_method", "maxSelect": 1, "name": "method", "presentable": false, "required": false, "system": false, "type": "select", "values": ["email_domain", "phone_otp", "manual"] },
      { "hidden": false, "id": "ct_status", "maxSelect": 1, "name": "status", "presentable": false, "required": false, "system": false, "type": "select", "values": ["pending", "verified", "rejected"] },
      { "cascadeDelete": false, "collectionId": "_pb_users_auth_", "hidden": false, "id": "ct_user", "maxSelect": 1, "minSelect": 0, "name": "claimant_user", "presentable": false, "required": false, "system": false, "type": "relation" },
      { "hidden": false, "id": "ct_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "ct_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_ct_token` ON `claim_tokens` (`token`)",
      "CREATE INDEX `idx_ct_biz` ON `claim_tokens` (`sourced_business`)"
    ]
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("claim_tokens")
  return app.delete(collection)
})
