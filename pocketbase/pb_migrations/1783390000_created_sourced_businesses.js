/// <reference path="../pb_data/types.d.ts" />

// F2 · Motor de captación de empresas (2026-07-06, aprobado). Empresa DETECTADA
// públicamente, NO verificada -- se siembra a partir de datos públicos (web
// propia, Instagram/Facebook, Google Maps, Google for Jobs, cámaras/municipios)
// y la empresa la reclama/verifica después. NUNCA es una cuenta "como si fuera"
// la empresa: es un perfil no verificado con su fuente registrada (evidence +
// source_url) que asciende a business_accounts solo al reclamarse.
//
// Reglas TODAS null a propósito: solo pbAdmin (server-side) escribe/lee esto;
// las páginas públicas reclamables lo consumen vía server component con pbAdmin
// (mismo patrón que getPublicJob/public-profile), exponiendo una proyección
// segura. Aditiva, reversible, no toca datos existentes.
migrate((app) => {
  const collection = new Collection({
    "type": "base",
    "name": "sourced_businesses",
    "createRule": null,
    "listRule": null,
    "viewRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_sb_id",
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
      { "hidden": false, "id": "sb_name", "max": 200, "min": 0, "name": "name", "pattern": "", "presentable": true, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_rubro", "max": 80, "min": 0, "name": "rubro", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_zone", "max": 120, "min": 0, "name": "city_zone", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_addr", "max": 250, "min": 0, "name": "address", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "exceptDomains": null, "hidden": false, "id": "sb_email", "name": "contact_email", "onlyDomains": null, "presentable": false, "required": false, "system": false, "type": "email" },
      { "hidden": false, "id": "sb_phone", "max": 40, "min": 0, "name": "contact_phone", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_ig", "max": 200, "min": 0, "name": "instagram", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_web", "max": 300, "min": 0, "name": "website", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_srctype", "maxSelect": 1, "name": "source_type", "presentable": false, "required": false, "system": false, "type": "select", "values": ["website", "gmaps", "instagram", "facebook", "google_jobs", "camara", "municipio", "otro"] },
      { "hidden": false, "id": "sb_srcurl", "max": 500, "min": 0, "name": "source_url", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_evidence", "max": 2000, "min": 0, "name": "evidence", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_region", "max": 60, "min": 0, "name": "region", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_status", "maxSelect": 1, "name": "status", "presentable": false, "required": false, "system": false, "type": "select", "values": ["detected", "contacted", "claimed", "opted_out"] },
      { "cascadeDelete": false, "collectionId": "pbc_1597278251", "hidden": false, "id": "sb_claimed", "maxSelect": 1, "minSelect": 0, "name": "claimed_business", "presentable": false, "required": false, "system": false, "type": "relation" },
      { "hidden": false, "id": "sb_slug", "max": 100, "min": 0, "name": "public_slug", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_notes", "max": 1000, "min": 0, "name": "notes", "pattern": "", "presentable": false, "required": false, "system": false, "type": "text" },
      { "hidden": false, "id": "sb_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "sb_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_sb_slug` ON `sourced_businesses` (`public_slug`) WHERE `public_slug` != ''",
      "CREATE INDEX `idx_sb_region_status` ON `sourced_businesses` (`region`, `status`)"
    ]
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("sourced_businesses")
  return app.delete(collection)
})
