/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Opt-in SEPARADO de consent_zone_visible: ese ya existe y solo controla
  // si empresas autenticadas lo ven en la búsqueda privada de candidatos
  // (candidate_profiles.listRule exige auth siempre, ver esa migración).
  // Este campo nuevo controla algo mucho más expuesto -- aparecer listado
  // en /postulantes, público y sin login, con el perfil descubrible sin
  // que nadie tenga que conocer antes el link. profile_slug es adivinable
  // (sale del nombre, ver lib/profile-slug.ts), así que reusar
  // consent_zone_visible acá hubiera hecho público -- sin que el
  // candidato lo supiera -- a cualquiera que ya lo tuviera tildado para
  // la búsqueda privada. Arranca en false siempre (nunca pre-tildado).
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool9002300001",
    "name": "consent_public_profile",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")
  collection.fields.removeById("bool9002300001")
  return app.save(collection)
})
