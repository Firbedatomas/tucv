/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // city_zone sigue siendo el string libre que se muestra (viene de
  // AddressAutocomplete o texto tipeado a mano) -- estos tres campos son
  // SOLO para filtrar/ordenar por geografía real, nunca para mostrar. Quedan
  // vacíos si la persona tipeó la zona a mano en vez de elegir una sugerencia
  // real (ver components/ui/AddressAutocomplete.tsx, onSelectDetails).
  ;["city", "province", "country"].forEach((name, i) => {
    collection.fields.addAt(collection.fields.length, new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text928374" + i,
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

  // Backfill best-effort para los perfiles que ya existen: parsea el
  // "Barrio, Provincia, País" (formato Google) que ya tenían guardado en
  // city_zone -- es una heurística, no una geocodificación real, así que
  // casos ambiguos (ej. "Córdoba, Argentina", donde Córdoba es a la vez
  // ciudad y provincia) quedan con la mejor aproximación posible. Los
  // perfiles nuevos, guardados con el autocomplete real, no dependen de
  // esto.
  function parseZone(zone) {
    const parts = (zone || "").split(",").map(function (p) { return p.trim() }).filter(Boolean)
    if (parts.length >= 3) return { city: parts[0], province: parts[parts.length - 2], country: parts[parts.length - 1] }
    if (parts.length === 2) return { city: parts[0], province: "", country: parts[1] }
    if (parts.length === 1) return { city: parts[0], province: "", country: "" }
    return { city: "", province: "", country: "" }
  }

  const rows = app.findRecordsByFilter("pbc_1078143753", "city_zone != ''", "", 2000, 0)
  for (const r of rows) {
    const parsed = parseZone(r.get("city_zone"))
    r.set("city", parsed.city)
    r.set("province", parsed.province)
    r.set("country", parsed.country)
    app.save(r)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("text9283740")
  collection.fields.removeById("text9283741")
  collection.fields.removeById("text9283742")
  return app.save(collection)
})
