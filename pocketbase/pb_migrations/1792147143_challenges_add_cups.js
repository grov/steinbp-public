/// <reference path="../pb_data/types.d.ts" />
// Score d'un défi : gobelets mis par chaque joueur (0-0 = score non saisi).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("challenges")

  for (const [id, name] of [["number5820193741", "player1_cups"], ["number5820193742", "player2_cups"]]) {
    collection.fields.add(new Field({
      "hidden": false,
      "id": id,
      "max": null,
      "min": 0,
      "name": name,
      "onlyInt": true,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }))
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("challenges")

  collection.fields.removeById("number5820193741")
  collection.fields.removeById("number5820193742")

  return app.save(collection)
})
