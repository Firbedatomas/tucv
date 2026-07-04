/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9005270000")

  // Espejo de candidate_profiles.city/province/country (ver
  // 1783280000_updated_candidate_profiles.js) -- se copian tal cual desde el
  // hook de sincronización (pocketbase/pb_hooks/main.pb.js), no se vuelven a
  // derivar acá.
  ;["city", "province", "country"].forEach((name, i) => {
    collection.fields.addAt(collection.fields.length, new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text928404" + i,
      "max": 120,
      "min": 0,
      "name": name,
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }))
  })
  app.save(collection)

  // Backfill: copia desde el candidate_profiles ya relacionado (corrió
  // primero en esta misma migración, así que ya tiene sus propios
  // city/province/country parseados).
  const cards = app.findRecordsByFilter("pbc_9005270000", "", "", 2000, 0)
  for (const card of cards) {
    let candidate
    try {
      candidate = app.findRecordById("pbc_1078143753", card.get("candidate"))
    } catch {
      continue
    }
    card.set("city", candidate.get("city") || "")
    card.set("province", candidate.get("province") || "")
    card.set("country", candidate.get("country") || "")
    app.save(card)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9005270000")
  collection.fields.removeById("text9284040")
  collection.fields.removeById("text9284041")
  collection.fields.removeById("text9284042")
  return app.save(collection)
})
