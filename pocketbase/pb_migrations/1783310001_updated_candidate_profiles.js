/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  // Programas de empleo (lado candidato): datos PRIVADOS. Solo se usan para
  // matching y para el panel de la empresa a la que el candidato se postula.
  // NUNCA salen en el perfil público (app/api/public-profile/[slug]) ni en el
  // directorio (lib/public-candidates-list.ts) -- no agregar estos campos ahí.
  // La edad para inferir compatibilidad ya se deriva de birth_date/age_manual
  // (lib/age.ts); estos campos son la DECLARACIÓN del candidato, que siempre
  // pisa a la inferencia por edad.

  // ¿Le interesa postularse a búsquedas compatibles con programas de empleo?
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91020001",
    "maxSelect": 1,
    "name": "programs_interested",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["si", "no", "no_se"]
  }))

  // ¿En qué programa está inscripto? (multi) -- este es el dato DURO que pisa
  // la inferencia por edad. "ninguno"/"no_se" son respuestas válidas.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91020002",
    "maxSelect": 6,
    "name": "programs_enrolled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["ppp", "empleo_26", "pil_ept", "progresar", "otro", "ninguno", "no_se"]
  }))

  // ¿Aceptaría una práctica o entrenamiento laboral?
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91020003",
    "maxSelect": 1,
    "name": "accepts_training",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["si", "no", "depende"]
  }))

  // Situación laboral actual -- insumo de compatibilidad (varios programas
  // apuntan a personas sin empleo registrado). "prefiero_no_decir" es válido.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91020004",
    "maxSelect": 1,
    "name": "work_situation",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["sin_empleo_registrado", "informal", "registrado", "prefiero_no_decir"]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1078143753")

  collection.fields.removeById("select91020001")
  collection.fields.removeById("select91020002")
  collection.fields.removeById("select91020003")
  collection.fields.removeById("select91020004")

  return app.save(collection)
})
