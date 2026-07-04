/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
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
        "cascadeDelete": true,
        "collectionId": "pbc_1597278251",
        "hidden": false,
        "id": "relation148074040",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "business",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
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
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3718713580",
        "max": 200,
        "min": 0,
        "name": "address_zone",
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
        "id": "text1466534506",
        "max": 120,
        "min": 0,
        "name": "role",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select2768976709",
        "maxSelect": 4,
        "name": "shift",
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
        "hidden": false,
        "id": "select4276059274",
        "maxSelect": 1,
        "name": "experience_required",
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text293288580",
        "max": 600,
        "min": 0,
        "name": "visible_message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select3098838237",
        "maxSelect": 1,
        "name": "duration_days",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "15",
          "30"
        ]
      },
      {
        "hidden": false,
        "id": "date261981154",
        "max": "",
        "min": "",
        "name": "expires_at",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "bool1260321794",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2560465762",
        "max": 60,
        "min": 0,
        "name": "slug",
        "pattern": "^[a-z0-9-]+$",
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
    "id": "pbc_3979010322",
    "indexes": [
      "CREATE UNIQUE INDEX idx_job_posts_slug ON job_posts (slug)"
    ],
    "listRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "name": "job_posts",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && business.user = @request.auth.id",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322");

  return app.delete(collection);
})
