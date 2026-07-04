/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    // Tabla espejo PÚBLICA del directorio /postulantes. candidate_profiles
    // no puede ser pública (su listRule exige auth a propósito: tiene
    // whatsapp, fecha de nacimiento, CV -- ver la migración
    // 1783100000_updated_candidate_profiles.js), y PocketBase no permite
    // restringir POR CAMPO en un listRule: si podés listar el registro,
    // ves todos sus campos. Por eso este espejo, que guarda SOLO los campos
    // seguros ya derivados (display_name = "Juan P.", nunca el nombre
    // completo), con listRule/viewRule públicos. Eso habilita dos cosas que
    // el espejo hace posibles y candidate_profiles no: que el cliente lea el
    // directorio sin superusuario, y -- lo importante -- que se suscriba en
    // tiempo real (SSE) a los cambios (PocketBase autoriza el evento de
    // suscripción con el listRule). Lo mantiene sincronizado el hook
    // onRecordAfterCreate/Update/Delete("candidate_profiles") en
    // pb_hooks/main.pb.js.
    "createRule": null,
    "listRule": "",
    "viewRule": "",
    "updateRule": null,
    "deleteRule": null,
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
        "id": "relation9005270001",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "candidate",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270002",
        "max": 120,
        "min": 0,
        "name": "slug",
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
        "id": "text9005270003",
        "max": 120,
        "min": 0,
        "name": "display_name",
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
        "id": "text9005270004",
        "max": 200,
        "min": 0,
        "name": "city_zone",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json9005270005",
        "maxSize": 0,
        "name": "categories",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270006",
        "max": 100,
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270007",
        "max": 40,
        "min": 0,
        "name": "experience",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json9005270008",
        "maxSize": 0,
        "name": "availability",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270009",
        "max": 10,
        "min": 0,
        "name": "has_own_transport",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "bool9005270010",
        "name": "immediate_availability",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270011",
        "max": 5000,
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text9005270012",
        "max": 500,
        "min": 0,
        "name": "photo_url",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date9005270013",
        "max": "",
        "min": "",
        "name": "source_created",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date9005270014",
        "max": "",
        "min": "",
        "name": "source_updated",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
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
        "id": "autodate2990389177",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_9005270000",
    "indexes": [
      "CREATE UNIQUE INDEX idx_public_candidate_cards_candidate ON public_candidate_cards (candidate)"
    ],
    "name": "public_candidate_cards",
    "system": false,
    "type": "base"
  })

  app.save(collection)

  // Backfill: sembramos el espejo con los perfiles que YA tienen
  // consent_public_profile=true (mismo cómputo de display_name/photo_url que
  // hace el hook -- ver pb_hooks/main.pb.js). En pre-lanzamiento esto suele
  // ser 0 filas, pero deja el espejo consistente si ya hubiera alguno.
  const publicProfiles = app.findRecordsByFilter("candidate_profiles", "consent_public_profile = true", "", 0, 0)
  const cards = app.findCollectionByNameOrId("pbc_9005270000")
  const pbBase = $os.getenv("NEXT_PUBLIC_POCKETBASE_URL") || "http://127.0.0.1:8092"
  for (const p of publicProfiles) {
    if (!p.get("profile_slug")) continue
    const fullName = (p.get("name") || "").trim()
    const parts = fullName.split(/\s+/).filter(Boolean)
    let displayName = "Postulante"
    if (parts.length === 1) displayName = parts[0]
    else if (parts.length >= 2) displayName = parts[0] + " " + parts[1].charAt(0).toUpperCase() + "."
    const photo = p.get("photo")
    const photoUrl = photo ? pbBase + "/api/files/" + p.collection().id + "/" + p.id + "/" + photo : ""

    const card = new Record(cards)
    card.set("candidate", p.id)
    card.set("slug", p.get("profile_slug"))
    card.set("display_name", displayName)
    card.set("city_zone", p.get("city_zone") || "")
    card.set("categories", p.get("categories") || [])
    card.set("category_other", p.get("category_other") || "")
    card.set("experience", p.get("experience") || "")
    card.set("availability", p.get("availability") || [])
    card.set("has_own_transport", p.get("has_own_transport") || "")
    card.set("immediate_availability", !!p.get("immediate_availability"))
    card.set("bio", p.get("bio") || "")
    card.set("photo_url", photoUrl)
    card.set("source_created", p.get("created"))
    card.set("source_updated", p.get("updated"))
    app.save(card)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9005270000")
  return app.delete(collection)
})
