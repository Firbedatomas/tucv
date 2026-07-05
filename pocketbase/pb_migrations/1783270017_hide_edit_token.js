/// <reference path="../pb_data/types.d.ts" />
// Seguridad/higiene: `edit_token` de candidate_profiles estaba con hidden:false,
// así que salía en cada respuesta de list a cualquier usuario autenticado
// (rama consent_zone_visible del listRule). Hoy las reglas de escritura del
// perfil son `user = @request.auth.id` (no @request.query.token = edit_token),
// así que el token ya NO es credencial de escritura y nada del cliente lo lee
// -> ocultarlo no rompe nada y saca un secreto histórico de las respuestas.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  const field = collection.fields.getById("text1720046662")
  field.hidden = true
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  const field = collection.fields.getById("text1720046662")
  field.hidden = false
  return app.save(collection)
})
