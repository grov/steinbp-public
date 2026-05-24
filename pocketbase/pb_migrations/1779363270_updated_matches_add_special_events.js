/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  // add field: game_over (bool)
  collection.fields.addAt(17, new Field({
    "hidden": false,
    "id": "bool9483729101",
    "name": "game_over",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field: balls_back_count (number)
  collection.fields.addAt(18, new Field({
    "hidden": false,
    "id": "number4821039471",
    "max": null,
    "min": 0,
    "name": "balls_back_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field: bounce_count (number)
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "number7382910284",
    "max": null,
    "min": 0,
    "name": "bounce_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field: trickshot_count (number)
  collection.fields.addAt(20, new Field({
    "hidden": false,
    "id": "number1029384756",
    "max": null,
    "min": 0,
    "name": "trickshot_count",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2541054544")

  collection.fields.removeById("bool9483729101")
  collection.fields.removeById("number4821039471")
  collection.fields.removeById("number7382910284")
  collection.fields.removeById("number1029384756")

  return app.save(collection)
})
