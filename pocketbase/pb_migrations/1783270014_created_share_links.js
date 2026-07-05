/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Columna vertebral de atribución: cada vez que alguien comparte un perfil o
  // una búsqueda por un canal (WhatsApp, X, QR, poster, widget...) se crea un
  // share_link con un token único. El link público es /s/<token>, que cuenta el
  // click, deja una cookie tucv_ref y redirige a la entidad real. Así podemos
  // responder "qué canal trae vida" (registros, postulaciones) sin tocar la URL
  // canónica de la entidad.
  //
  // entity_id / shared_by_user son TEXTO (no relaciones) a propósito: un share
  // es un hecho histórico, no debe romperse ni nulificarse si luego se borra el
  // perfil, la búsqueda o el usuario. Todo el acceso es por API (pbAdmin): las
  // rules quedan en null para que nadie lea/escriba share_links directo.
  const collection = new Collection({
    "listRule": null,
    "viewRule": null,
    "createRule": null,
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
        "hidden": false,
        "id": "select9002700701",
        "maxSelect": 1,
        "name": "entity_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["profile", "job"]
      },
      {
        "hidden": false,
        "id": "text9002700702",
        "max": 60,
        "min": 0,
        "name": "entity_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "text9002700703",
        "max": 60,
        "min": 0,
        "name": "shared_by_user",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9002700704",
        "maxSelect": 1,
        "name": "channel",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["whatsapp", "x", "instagram", "copy", "qr", "poster", "widget", "rss", "api"]
      },
      {
        "autogeneratePattern": "[a-zA-Z0-9]{20}",
        "hidden": false,
        "id": "text9002700705",
        "max": 40,
        "min": 0,
        "name": "token",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number9002700706",
        "max": null,
        "min": 0,
        "name": "clicks",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate9002700707",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002700014",
    "indexes": [
      "CREATE UNIQUE INDEX idx_share_links_token ON share_links (token)"
    ],
    "name": "share_links",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700014")
  return app.delete(collection)
})
