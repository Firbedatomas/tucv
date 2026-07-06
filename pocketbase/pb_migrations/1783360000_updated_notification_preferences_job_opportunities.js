/// <reference path="../pb_data/types.d.ts" />

// Opción B (2026-07-06): los avisos de OPORTUNIDADES laborales se tratan como
// SERVICIO (el candidato se anotó justo para conseguir trabajo), no como
// marketing. Nuevo campo `job_opportunities` en notification_preferences. En el
// código se interpreta null/ausente como TRUE (así los 144 perfiles ya
// existentes quedan opt-in por default sin data migration); solo un false
// explícito (baja de un click) los saca. El gate de campañas pasa a usar esto en
// vez de `marketing`. Aditivo, reversible, no toca datos.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("notification_preferences")
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "np_job_opps",
    "name": "job_opportunities",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))
  app.save(collection)

  // Data-step: PocketBase pone el bool nuevo en FALSE para los registros
  // existentes -> hay que ponerlos en TRUE (opt-in por default, Opción B),
  // SALVO quienes ya se dieron de baja de todo (unsubscribeAll deja
  // applications=never + profile_tips=false + marketing=false): a esos se les
  // respeta la baja y quedan en false.
  const recs = app.findAllRecords("notification_preferences")
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i]
    const unsubscribed =
      r.get("applications_frequency") === "never" &&
      r.get("profile_tips") === false &&
      r.get("marketing") === false
    r.set("job_opportunities", !unsubscribed)
    app.save(r)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("notification_preferences")
  collection.fields.removeById("np_job_opps")
  return app.save(collection)
})
