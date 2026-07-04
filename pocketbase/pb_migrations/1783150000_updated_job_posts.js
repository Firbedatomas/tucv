/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  const previousListRule = collection.listRule

  // Antes solo el negocio dueño podía LISTAR sus propias búsquedas -- el
  // feed en vivo de la home (visitantes sin sesión, filtrando/buscando
  // ofertas) necesita poder listar las que están activas y no vencidas.
  // No afecta nada de negocios/postulantes/postulaciones: solo decide qué
  // tan visible es una búsqueda que YA es pública (viewRule ya era "").
  // También es lo que habilita que el tiempo real (subscribe) le llegue a
  // un cliente anónimo -- PocketBase usa el listRule, no el viewRule, para
  // autorizar el evento de creación en una suscripción de colección
  // entera (confirmado probándolo en producción: sin este cambio, un
  // visitante sin sesión nunca recibía el aviso de una búsqueda nueva).
  collection.listRule = `(${previousListRule}) || (active = true && expires_at > @now)`

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.listRule = "@request.auth.id != \"\" && business.user = @request.auth.id"

  return app.save(collection)
})
