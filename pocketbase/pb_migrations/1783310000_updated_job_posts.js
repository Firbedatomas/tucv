/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  // Programas laborales: capa OPCIONAL de compatibilidad con programas
  // públicos de empleo (PPP Córdoba, Empleo +26, PIL/EPT, etc.). La búsqueda
  // sigue siendo normal -- esto solo declara que el negocio ACEPTA (o quiere
  // priorizar) incorporar vía un programa. Nunca se publica "busco gente con
  // plan": es una capa que TuCV agrega encima, no el título de la búsqueda.

  // Modo elegido por la empresa. "none" = búsqueda común (default real aunque
  // el campo quede vacío en registros viejos: el código trata "" como "none").
  // "need_help" es un LEAD: la empresa no sabe qué programa aplica y pide que
  // TuCV la ayude (gestión monetizable).
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91010001",
    "maxSelect": 1,
    "name": "programs_mode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["none", "accept", "prioritize", "need_help"]
  }))

  // Qué le interesa a la empresa del programa (informativo, ayuda al matching
  // y a la gestión). "sugerir" = "no sé, que TuCV me sugiera".
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "select91010002",
    "maxSelect": 5,
    "name": "programs_interest",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "primer_empleo",
      "entrenamiento_laboral",
      "contratacion_subsidio",
      "practica_profesional",
      "sugerir"
    ]
  }))

  // Visibilidad: mostrar el badge "Acepta programas de empleo" en el link
  // público de la búsqueda. Disponible en todos los planes (es la señal seria
  // e inclusiva; cobrarla mataría el propósito).
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool91010003",
    "name": "programs_public",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // Preguntar compatibilidad al postulante al momento de postularse.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool91010004",
    "name": "programs_ask_applicant",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // Ordenar candidatos compatibles arriba en el panel. Feature de plan pago
  // (Pro/Equipo) -- el gating real vive en lib/plan-limits.ts
  // (canPrioritizeProgramCandidates); el campo se guarda igual.
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "id": "bool91010005",
    "name": "programs_sort_top",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3979010322")

  collection.fields.removeById("select91010001")
  collection.fields.removeById("select91010002")
  collection.fields.removeById("bool91010003")
  collection.fields.removeById("bool91010004")
  collection.fields.removeById("bool91010005")

  return app.save(collection)
})
