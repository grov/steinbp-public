/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // add field: island_count (number)
  collection.fields.add(new Field({
    "hidden": false,
    "id": "number3918274650",
    "max": null,
    "min": 0,
    "name": "island_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  collection.fields.removeById("number3918274650")

  return app.save(collection)
})
