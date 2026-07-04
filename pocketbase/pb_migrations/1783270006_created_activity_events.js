/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Stream de actividad de TuCV: alimenta el feed "en vivo" de la landing y de
  // /empresa/candidatos, contadores por ciudad/rubro y (a futuro) métricas.
  // job_id / candidate_id son TEXTO (no relaciones) a propósito: un evento es
  // un hecho histórico inmutable, no debe desaparecer ni nulificarse si luego
  // se borra la búsqueda o el perfil. La anonimización se hace al leer, no acá.
  const collection = new Collection({
    // Solo eventos marcados como públicos son legibles sin auth (el feed). Los
    // internal/private quedan para uso server (pbAdmin) -> métricas/admin.
    "listRule": "visibility = \"public\"",
    "viewRule": "visibility = \"public\"",
    // Escritura solo server (pbAdmin): los eventos los emite el backend, nunca
    // el cliente directo (evita feed falso / spoofing).
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
        "id": "text9002700601",
        "max": 60,
        "min": 0,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9002700602",
        "maxSelect": 1,
        "name": "actor_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["candidate", "company", "system"]
      },
      {
        "hidden": false,
        "id": "text9002700603",
        "max": 120,
        "min": 0,
        "name": "city",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "text9002700604",
        "max": 120,
        "min": 0,
        "name": "zone",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "text9002700605",
        "max": 60,
        "min": 0,
        "name": "job_id",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "text9002700606",
        "max": 60,
        "min": 0,
        "name": "candidate_id",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select9002700607",
        "maxSelect": 1,
        "name": "visibility",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": ["public", "internal", "private"]
      },
      {
        "hidden": false,
        "id": "json9002700608",
        "maxSize": 4000,
        "name": "metadata",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate9002700609",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9002700006",
    "indexes": [
      "CREATE INDEX idx_activity_events_created ON activity_events (created)",
      "CREATE INDEX idx_activity_events_vis_created ON activity_events (visibility, created)",
      "CREATE INDEX idx_activity_events_type ON activity_events (type)"
    ],
    "name": "activity_events",
    "system": false,
    "type": "base"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9002700006")
  return app.delete(collection)
})
