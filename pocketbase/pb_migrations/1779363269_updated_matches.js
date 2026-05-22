/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // add field
  collection.fields.addAt(15, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2541054544",
    "help": "",
    "hidden": false,
    "id": "relation312795192",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "next_match_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // remove field
  collection.fields.removeById("relation312795192")

  return app.save(collection)
})
