/// <reference path="../pb_data/types.d.ts" />

// Endurece el createRule de `applications` (2026-07-06). Antes era solo
// `job_post.active = true`: no exigía auth ni ataba la postulación al candidato
// autenticado, así que alguien podía crear una postulación a nombre de OTRO
// candidate_profile (IDOR / spam). Ahora exige: estar logueado, que la búsqueda
// esté activa, y que el `candidate` sea el perfil del propio usuario. El flujo
// real ya postula siempre con el perfil propio (CandidateForm/PublicJobClient),
// así que no se rompe. Los creates server-side (aceptar invitación) usan pbAdmin
// (superusuario) y saltan la regla. El `status` lo fuerza además un hook.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("applications")
  collection.createRule = '@request.auth.id != "" && job_post.active = true && candidate.user = @request.auth.id'
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("applications")
  collection.createRule = "job_post.active = true"
  return app.save(collection)
})
