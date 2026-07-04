/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // add field
  collection.fields.addAt(20, new Field({
    "hidden": false,
    "id": "json596545917",
    "maxSize": 20000,
    "name": "category_experience",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "hidden": false,
    "id": "json2669555100",
    "maxSize": 20000,
    "name": "references",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select989021800",
    "maxSelect": 6,
    "name": "categories",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "atencion",
      "ventas",
      "caja",
      "reposicion",
      "limpieza",
      "deposito",
      "reparto",
      "seguridad",
      "cuidado",
      "construccion",
      "mantenimiento",
      "taller_oficio",
      "cocina",
      "moza_mozo",
      "barista",
      "administracion_basica",
      "produccion_operario",
      "jardineria",
      "pintura",
      "plomeria",
      "electricidad",
      "peluqueria_estetica",
      "eventos",
      "recepcion_conserje",
      "chofer",
      "delivery_moto",
      "ninera",
      "costura",
      "panaderia",
      "otro"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // remove field
  collection.fields.removeById("json596545917")

  // remove field
  collection.fields.removeById("json2669555100")

  // update field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select989021800",
    "maxSelect": 6,
    "name": "categories",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "atencion",
      "ventas",
      "caja",
      "reposicion",
      "limpieza",
      "deposito",
      "reparto",
      "seguridad",
      "cuidado",
      "construccion",
      "mantenimiento",
      "taller_oficio",
      "cocina",
      "moza_mozo",
      "barista",
      "administracion_basica",
      "produccion_operario",
      "otro"
    ]
  }))

  return app.save(collection)
})
