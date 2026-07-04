/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_8823401200")

  // Pedía habilitar login antes de reportar, para evitar abuso (reportes
  // masivos anónimos contra un negocio de la competencia, por ejemplo) --
  // sigue sin requerir un perfil de postulante o negocio armado, solo una
  // sesión de Google real. El segundo término evita que alguien mande
  // `reporter` con el id de otra persona.
  collection.createRule = "@request.auth.id != \"\" && reporter = @request.auth.id"

  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation8823401201",
    "maxSelect": 1,
    "minSelect": 1,
    "name": "reporter",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_8823401200")

  collection.createRule = ""
  collection.fields.removeById("relation8823401201")

  return app.save(collection)
})
