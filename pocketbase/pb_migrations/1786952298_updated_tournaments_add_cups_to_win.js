/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_340646327")

  // Champ optionnel pour préserver les tournois existants : l'application
  // utilise cups_per_side lorsque cups_to_win n'est pas encore renseigné.
  collection.fields.addAt(6, new Field({
    "help": "Nombre de gobelets à mettre pour gagner le match",
    "hidden": false,
    "id": "number1786952298",
    "max": 10,
    "min": 1,
    "name": "cups_to_win",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_340646327")
  collection.fields.removeById("number1786952298")
  return app.save(collection)
})
