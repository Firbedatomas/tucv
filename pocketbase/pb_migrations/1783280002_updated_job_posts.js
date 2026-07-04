/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Ver 1783280000_updated_candidate_profiles.js -- mismo patrón, acá sobre
  // address_zone en vez de city_zone.
  ;["city", "province", "country"].forEach((name, i) => {
    collection.fields.addAt(collection.fields.length, new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text928394" + i,
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

  function parseZone(zone) {
    const parts = (zone || "").split(",").map(function (p) { return p.trim() }).filter(Boolean)
    if (parts.length >= 3) return { city: parts[0], province: parts[parts.length - 2], country: parts[parts.length - 1] }
    if (parts.length === 2) return { city: parts[0], province: "", country: parts[1] }
    if (parts.length === 1) return { city: parts[0], province: "", country: "" }
    return { city: "", province: "", country: "" }
  }

  const rows = app.findRecordsByFilter("pbc_3979010322", "address_zone != ''", "", 2000, 0)
  for (const r of rows) {
    const parsed = parseZone(r.get("address_zone"))
    r.set("city", parsed.city)
    r.set("province", parsed.province)
    r.set("country", parsed.country)
    app.save(r)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")
  collection.fields.removeById("text9283940")
  collection.fields.removeById("text9283941")
  collection.fields.removeById("text9283942")
  return app.save(collection)
})
