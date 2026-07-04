/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // Mismo criterio que consent_save en candidate_profiles: el registro de
  // empresa no tenía NINGÚN chequeo de aceptación de términos/privacidad
  // (RegistroForm.tsx no lo pedía). Server-side vía createRule, no solo un
  // checkbox validado en el cliente -- si no, cualquiera con su token
  // autenticado podía pegarle directo a la API y saltearlo.
  const previousCreateRule = collection.createRule
  collection.createRule = `(${previousCreateRule}) && terms_accepted = true`

  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9003250201",
    "name": "terms_accepted",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")
  collection.createRule = `@request.auth.id != "" && user = @request.auth.id`
  collection.fields.removeById("bool9003250201")
  return app.save(collection)
})
