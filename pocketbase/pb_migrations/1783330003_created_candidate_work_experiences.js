/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- EXPERIENCIAS laborales relacionales (1 fila = 1 experiencia, SIN
// límite por rubro). Reemplaza el JSON `category_experience` de
// candidate_profiles (que queda read-only de respaldo hasta el cutover). Fechas
// año+mes (decisión del usuario): la UI muestra mes/año, la duración se calcula
// a meses. Ownership: solo el dueño (candidate_profile.user) hace CRUD desde el
// cliente; el panel empresa y el perfil público leen server-side vía pbAdmin
// (bypassa reglas). `company` (relación a business_accounts) mantiene el ✓ de
// empresa verificada; sin cascadeDelete para no borrar la experiencia si se da
// de baja la empresa.
migrate((app) => {
  const OWNER = "@request.auth.id != \"\" && candidate_profile.user = @request.auth.id"
  const collection = new Collection({
    "type": "base",
    "name": "candidate_work_experiences",
    "createRule": OWNER,
    "listRule": OWNER,
    "viewRule": OWNER,
    "updateRule": OWNER,
    "deleteRule": OWNER,
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
        "collectionId": "pbc_1078143753",
        "hidden": false,
        "id": "cwe_candidate",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "candidate_profile",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "cwe_jobtitle",
        "max": 120,
        "min": 0,
        "name": "job_title",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "cwe_category",
        "max": 60,
        "min": 0,
        "name": "category",
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
        "id": "cwe_company_name",
        "max": 160,
        "min": 0,
        "name": "company_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1597278251",
        "hidden": false,
        "id": "cwe_company",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "company",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "cwe_city",
        "max": 120,
        "min": 0,
        "name": "city",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "cwe_start_year",
        "max": 2100,
        "min": 1950,
        "name": "start_year",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "cwe_start_month",
        "max": 12,
        "min": 1,
        "name": "start_month",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "cwe_end_year",
        "max": 2100,
        "min": 1950,
        "name": "end_year",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "cwe_end_month",
        "max": 12,
        "min": 1,
        "name": "end_month",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "cwe_current",
        "name": "currently_working",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "cwe_description",
        "max": 600,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "cwe_sort",
        "max": null,
        "min": null,
        "name": "sort_order",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate_cwe_c",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_cwe_u",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_cwe_candidate` ON `candidate_work_experiences` (`candidate_profile`)",
      "CREATE INDEX `idx_cwe_category` ON `candidate_work_experiences` (`category`)"
    ]
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidate_work_experiences")
  return app.delete(collection)
})
