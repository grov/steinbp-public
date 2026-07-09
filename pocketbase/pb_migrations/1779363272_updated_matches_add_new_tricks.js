/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // add field: redemption_count (number)
  collection.fields.addAt(21, new Field({
    "hidden": false,
    "id": "number5738291046",
    "max": null,
    "min": 0,
    "name": "redemption_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field: contre_son_camp_count (number)
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "number6482910573",
    "max": null,
    "min": 0,
    "name": "contre_son_camp_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  collection.fields.removeById("number5738291046")
  collection.fields.removeById("number6482910573")

  return app.save(collection)
})
