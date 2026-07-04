/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 1,
    "name": "category",
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
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 1,
    "name": "category",
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
