/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Opt-in de contacto directo, SEPARADO de consent_zone_visible. Ese controla
  // si el perfil aparece en la búsqueda privada de empresas (/empresa/candidatos);
  // este controla si además se muestra el WhatsApp / botón "Contactar". Así un
  // candidato puede quedar visible para empresas sin exponer su teléfono todavía.
  // Arranca en false; los perfiles nuevos lo eligen explícito en el formulario.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9002700003",
    "name": "consent_contact",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))
  app.save(collection)

  // Backfill: quien YA eligió ser visible para empresas venía mostrando su
  // WhatsApp a esas empresas (era el comportamiento anterior). Preservarlo en
  // vez de dejarlo de golpe no-contactable evita una regresión silenciosa.
  const rows = app.findRecordsByFilter("pbc_1078143753", "consent_zone_visible = true", "", 500, 0)
  for (const r of rows) {
    r.set("consent_contact", true)
    app.save(r)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("bool9002700003")
  return app.save(collection)
})
