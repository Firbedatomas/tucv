/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "select3713686397",
    "maxSelect": 1,
    "name": "plan",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "free",
      "pro"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1597278251")

  // remove field
  collection.fields.removeById("select3713686397")

  return app.save(collection)
})
