/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Un negocio suspendido (ver 1783290000_updated_business_accounts.js)
  // deja de mostrar sus búsquedas en el feed público y en el link directo
  // -- pero el propio dueño (o un colaborador invitado) todavía puede
  // verlas desde su panel, para no perder acceso a sus propios datos
  // mientras está suspendido. viewRule era "" (totalmente público) desde
  // la creación de la colección, nunca se había tocado.
  collection.listRule = collection.listRule.replace(
    "(active = true && expires_at > @now)",
    "(active = true && expires_at > @now && business.suspended != true)",
  )
  collection.viewRule = 'business.suspended != true || (@request.auth.id != "" && business.user = @request.auth.id)'

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")
  collection.listRule = collection.listRule.replace(
    "(active = true && expires_at > @now && business.suspended != true)",
    "(active = true && expires_at > @now)",
  )
  collection.viewRule = ""
  return app.save(collection)
})
