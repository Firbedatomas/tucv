/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Sueldo: opcional a propósito (no todas las búsquedas quieren publicarlo),
  // pero queremos que exista como dato aunque no se muestre público.
  collection.fields.addAt(50, new Field({
    "hidden": false,
    "id": "select8823401177",
    "maxSelect": 1,
    "name": "salary_mode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["mostrar", "no_mostrar", "a_convenir", "segun_convenio"]
  }))

  collection.fields.addAt(51, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401178",
    "max": 60,
    "min": 0,
    "name": "salary_amount",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // Días y horarios: texto corto libre (no chips todavía) -- "Lunes a
  // viernes, 8 a 16hs", "Fines de semana, turno cortado", etc.
  collection.fields.addAt(52, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text8823401179",
    "max": 150,
    "min": 0,
    "name": "schedule_details",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(53, new Field({
    "hidden": false,
    "id": "select8823401180",
    "maxSelect": 1,
    "name": "vacancies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["1", "2", "3_o_mas", "no_seguro"]
  }))

  // Requisitos obligatorios: solo lo que NO está cubierto ya por otro campo
  // -- "turno cortado"/"movilidad propia" ya viven en `perks`, "fines de
  // semana" ya es un valor de `shift`, y experiencia previa ya la cubre
  // `experience_required`. Repetirlos acá sería el mismo dato dos veces.
  collection.fields.addAt(54, new Field({
    "hidden": false,
    "id": "select8823401181",
    "maxSelect": 3,
    "name": "hard_requirements",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "vive_cerca",
      "disponibilidad_inmediata",
      "mayor_18"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("select8823401177")
  collection.fields.removeById("text8823401178")
  collection.fields.removeById("text8823401179")
  collection.fields.removeById("select8823401180")
  collection.fields.removeById("select8823401181")

  return app.save(collection)
})
