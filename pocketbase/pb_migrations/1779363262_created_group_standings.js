/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = 'admin' || @request.auth.role = 'organisateur'",
    "deleteRule": "@request.auth.role = 'admin' || @request.auth.role = 'organisateur'",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_340646327",
        "help": "",
        "hidden": false,
        "id": "relation869376999",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "tournament_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3346940990",
        "help": "",
        "hidden": false,
        "id": "relation4266973511",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "group_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_1568971955",
        "help": "",
        "hidden": false,
        "id": "relation694999214",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "team_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number1825427252",
        "max": null,
        "min": 0,
        "name": "played",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2732118329",
        "max": null,
        "min": 0,
        "name": "wins",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number724428801",
        "max": null,
        "min": 0,
        "name": "losses",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3005013885",
        "max": null,
        "min": 0,
        "name": "cups_for",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3547527737",
        "max": null,
        "min": 0,
        "name": "cups_against",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number666537513",
        "max": null,
        "min": 0,
        "name": "points",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_1033420308",
    "indexes": [],
    "listRule": "",
    "name": "group_standings",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = 'admin' || @request.auth.role = 'organisateur'",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1033420308");

  return app.delete(collection);
})
