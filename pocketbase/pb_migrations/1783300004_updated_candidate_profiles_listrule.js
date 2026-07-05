/// <reference path="../pb_data/types.d.ts" />
// FIX de privacidad (Prioridad 1): el listRule de candidate_profiles tenía una
// rama `consent_zone_visible = true` que dejaba a CUALQUIER usuario autenticado
// listar todos los perfiles visibles y, como PocketBase no restringe por campo,
// recibir whatsapp / birth_date / cv_file / edit_token de todos. La búsqueda de
// empresa ahora se sirve por /api/empresa/candidates (proyección segura,
// server-side), así que esa rama ya no hace falta. La sacamos -> nadie puede
// listar candidate_profiles crudo salvo el propio dueño o una empresa que
// recibió una postulación de ese candidato (mismo criterio que el viewRule).
migrate((app) => {
  const c = app.findCollectionByNameOrId("pbc_1078143753")
  c.listRule = '(@request.auth.id != "" && (user = @request.auth.id || applications_via_candidate.job_post.business.user ?= @request.auth.id)) || (@request.auth.id != "" && applications_via_candidate.job_post.business.business_members_via_business.user ?= @request.auth.id)'
  return app.save(c)
}, (app) => {
  const c = app.findCollectionByNameOrId("pbc_1078143753")
  c.listRule = '(@request.auth.id != "" && (user = @request.auth.id || consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)) || (@request.auth.id != "" && applications_via_candidate.job_post.business.business_members_via_business.user ?= @request.auth.id)'
  return app.save(c)
})
