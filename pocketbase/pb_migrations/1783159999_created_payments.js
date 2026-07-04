/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Reconstruye `payments` tal como existía antes de que
  // 1783160001_updated_payments.js corriera por primera vez -- la colección
  // se había creado directamente en el admin de PocketBase, sin ningún
  // created_payments.js en el repo (confirmado por el propio comentario de
  // 1783225000_updated_payments.js). Sin este archivo, migrar desde cero (un
  // entorno nuevo, o recrear pb_data local) fallaba en 1783160001 con "no
  // encuentro la colección payments".
  //
  // Idempotente a propósito: en producción esta colección YA existe (fue
  // creada a mano, antes de que este archivo existiera) -- si esta migración
  // corre ahí, no debe intentar crearla de nuevo (chocaría con el id/nombre
  // ya ocupado). Solo crea si hace falta, como en un bootstrap desde cero.
  try {
    app.findCollectionByNameOrId("pbc_631030571")
    return
  } catch {
    // no existe todavía, seguimos y la creamos
  }

  const collection = new Collection({
    "createRule": null,
    "listRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
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
        "collectionId": "pbc_1597278251",
        "hidden": false,
        "id": "relation148074040",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "business",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select2363381545",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["plan_pro"]
      },
      {
        "hidden": false,
        "id": "number2392944706",
        "max": null,
        "min": null,
        "name": "amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["pending", "approved", "rejected"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2081899790",
        "max": 0,
        "min": 0,
        "name": "mp_preference_id",
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
        "id": "text1861132153",
        "max": 0,
        "min": 0,
        "name": "mp_payment_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_631030571",
    "indexes": [],
    "name": "payments",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  // Down: no borramos la colección acá -- si esta migración fue un no-op
  // (producción, la colección ya existía de antes), revertirla no debería
  // destruir datos reales de pagos. Bajarla de verdad, si hiciera falta, es
  // responsabilidad de un down manual explícito, no de este archivo.
})
