/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "consent_save = true",
    "deleteRule": "@request.query.token != \"\" && @request.query.token = edit_token",
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 120,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4222712125",
        "max": 40,
        "min": 0,
        "name": "whatsapp",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1134951791",
        "max": 120,
        "min": 0,
        "name": "city_zone",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date3845444698",
        "max": "",
        "min": "",
        "name": "birth_date",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "number153273267",
        "max": 99,
        "min": 14,
        "name": "age_manual",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select3343321666",
        "maxSelect": 1,
        "name": "gender",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "hombre",
          "mujer",
          "otro",
          "prefiero_no_decir"
        ]
      },
      {
        "hidden": false,
        "id": "file347571224",
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp"
        ],
        "name": "photo",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
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
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text829127273",
        "max": 120,
        "min": 0,
        "name": "category_other",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select93372675",
        "maxSelect": 1,
        "name": "experience",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "sin_experiencia",
          "menos_6_meses",
          "6_a_12_meses",
          "1_a_3_anos",
          "mas_3_anos"
        ]
      },
      {
        "hidden": false,
        "id": "select1068999359",
        "maxSelect": 7,
        "name": "availability",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "manana",
          "tarde",
          "noche",
          "full_time",
          "part_time",
          "fines_semana",
          "feriados"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3227611777",
        "max": 500,
        "min": 0,
        "name": "references_text",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3709889147",
        "max": 400,
        "min": 0,
        "name": "bio",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "file3989952204",
        "maxSelect": 1,
        "maxSize": 10485760,
        "mimeTypes": [
          "application/pdf",
          "image/jpeg",
          "image/png"
        ],
        "name": "cv_file",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "bool4234525394",
        "name": "consent_save",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool3768490901",
        "name": "consent_zone_visible",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "[a-zA-Z0-9]{32}",
        "hidden": false,
        "id": "text1720046662",
        "max": 40,
        "min": 0,
        "name": "edit_token",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1078143753",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && consent_zone_visible = true",
    "name": "candidate_profiles",
    "system": false,
    "type": "base",
    "updateRule": "@request.query.token != \"\" && @request.query.token = edit_token",
    "viewRule": "@request.query.token != \"\" && @request.query.token = edit_token"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753");

  return app.delete(collection);
})
