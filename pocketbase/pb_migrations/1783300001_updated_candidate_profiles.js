/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Un colaborador (business_members) tiene que poder VER el perfil de un
  // postulante que se postuló a una búsqueda de SU negocio -- si no, el
  // reviewer abre "Ver postulantes" y las tarjetas salen vacías porque el
  // expand:candidate no pasa el viewRule. Reflejamos la rama que ya existe
  // para el dueño (applications_via_candidate.job_post.business.user),
  // pasando por business_members_via_business en vez de .user.
  //
  // Sigue acotado al MISMO negocio: un miembro no ve perfiles de postulantes
  // de otros negocios, ni el perfil personal/privado de nadie que no se haya
  // postulado a una búsqueda suya. No toca consent_zone_visible (la búsqueda
  // proactiva de candidatos) ni el acceso del propio postulante a su ficha.
  const memberBranch = `applications_via_candidate.job_post.business.business_members_via_business.user ?= @request.auth.id`
  collection.listRule = `(${collection.listRule}) || (@request.auth.id != "" && ${memberBranch})`
  collection.viewRule = `(${collection.viewRule}) || (@request.auth.id != "" && ${memberBranch})`

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  collection.listRule = `@request.auth.id != "" && (user = @request.auth.id || consent_zone_visible = true || applications_via_candidate.job_post.business.user ?= @request.auth.id)`
  collection.viewRule = `@request.auth.id != "" && (user = @request.auth.id || applications_via_candidate.job_post.business.user ?= @request.auth.id)`

  return app.save(collection)
})
