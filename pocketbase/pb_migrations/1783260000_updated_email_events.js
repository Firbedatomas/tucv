/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001100000")

  // Faltaba acá -- se agregó "team_invite" al union EmailType (lib/email/
  // types.ts) pero nunca a los values reales del campo `type` de
  // email_events, así que logEmailEvent tiraba 400 al intentar loguear el
  // primer envío de una invitación de equipo (y esa excepción, sin catch en
  // la ruta, hacía que /api/business-invites devolviera una respuesta sin
  // body -- el error real que vio el usuario al probarlo).
  const typeField = collection.fields.getById("select9001100003")
  typeField.values = [...typeField.values, "team_invite"]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_9001100000")

  const typeField = collection.fields.getById("select9001100003")
  typeField.values = typeField.values.filter((v) => v !== "team_invite")

  return app.save(collection)
})
