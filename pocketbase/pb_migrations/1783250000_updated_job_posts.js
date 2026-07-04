/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Marcadores para los emails de vencimiento (ver app/api/cron/daily y
  // pb_hooks/main.pb.js) -- sin esto, el cron mandaría "tu búsqueda vence
  // pronto"/"tu búsqueda venció" todos los días mientras dure la ventana de
  // aviso. Se resetean solos cuando expires_at se mueve a futuro (renovar/
  // extender/reactivar), ver el hook onRecordUpdate("job_posts") nuevo.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9003250001",
    "name": "expiring_notified",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9003250002",
    "name": "expired_notified",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")
  collection.fields.removeById("bool9003250001")
  collection.fields.removeById("bool9003250002")
  return app.save(collection)
})
