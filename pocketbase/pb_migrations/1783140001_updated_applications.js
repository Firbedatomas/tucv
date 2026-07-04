/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2689671926")

  // Respuestas del postulante a las screening_questions de la búsqueda --
  // { questionId, answer } por pregunta, "answer" es "si"/"no" para
  // preguntas si_no o texto libre para las de tipo texto.
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "json8823401185",
    "maxSize": 4000,
    "name": "screening_answers",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // Score calculado al postularse a partir de las respuestas si_no y el
  // peso de cada pregunta (alto=3/medio=2/bajo=1) -- se guarda ya calculado
  // para poder ordenar el panel de postulantes sin tener que recalcular
  // contra job_post.screening_questions en cada lectura.
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number8823401186",
    "max": null,
    "min": 0,
    "name": "score",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2689671926")

  collection.fields.removeById("json8823401185")
  collection.fields.removeById("number8823401186")

  return app.save(collection)
})
