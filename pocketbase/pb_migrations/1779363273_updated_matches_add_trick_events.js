/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // add field: trick_events (json) — tricks attribués par joueur
  collection.fields.addAt(23, new Field({
    "hidden": false,
    "id": "json7194028365",
    "maxSize": 0,
    "name": "trick_events",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  collection.fields.removeById("json7194028365")

  return app.save(collection)
})
