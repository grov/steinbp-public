/// <reference path="../pb_data/types.d.ts" />
// Duos : identité permanente d'une paire de joueurs, d'un tournoi à l'autre.
// Une équipe de tournoi pointe vers son duo (duo_id) et garde son nom du jour ;
// le duo porte le dernier nom choisi. player1/player2 sont triés par id pour
// qu'une paire n'existe qu'une fois, quel que soit l'ordre d'inscription.

const MANAGER = "@request.auth.role = 'admin' || @request.auth.role = 'organisateur'"

function userRelation(id, name) {
  return new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": id,
    "maxSelect": 1,
    "minSelect": 0,
    "name": name,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  })
}

migrate((app) => {
  const duos = new Collection({
    "type": "base",
    "name": "duos",
    "listRule": "",
    "viewRule": "",
    "createRule": MANAGER,
    "updateRule": MANAGER + " && @request.body.player1:changed = false && @request.body.player2:changed = false && (@request.auth.role = 'admin' || @request.body.legendary:changed = false)",
    "deleteRule": "@request.auth.role = 'admin'",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_duos_pair` ON `duos` (`player1`, `player2`)"
    ]
  })
  duos.fields.add(userRelation("relation1792147130", "player1"))
  duos.fields.add(userRelation("relation1792147131", "player2"))
  duos.fields.add(new Field({
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1792147130",
        "max": 100,
        "min": 1,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      }))
  duos.fields.add(new Field({
        "help": "Équipe légendaire désignée par l'admin (sinon automatique selon le nombre de tournois)",
        "hidden": false,
        "id": "bool1792147130",
        "name": "legendary",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }))
  duos.fields.add(new Field({
        "hidden": false,
        "id": "autodate1792147130",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }))
  duos.fields.add(new Field({
        "hidden": false,
        "id": "autodate1792147131",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }))
  app.save(duos)

  const teams = app.findCollectionByNameOrId("teams")
  teams.fields.add(new Field({
    "cascadeDelete": false,
    "collectionId": duos.id,
    "help": "Duo permanent de cette équipe (vide si un joueur n'a pas de compte)",
    "hidden": false,
    "id": "relation1792147132",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "duo_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))
  app.save(teams)

  // Rattache les équipes existantes, dans l'ordre d'insertion : le duo
  // garde le nom de sa dernière apparition.
  const existing = app.findRecordsByFilter("teams", "is_bye = false && player1_id != '' && player2_id != ''", "@rowid", 0, 0)
  const byPair = {}
  for (const team of existing) {
    const [p1, p2] = [team.get("player1_id"), team.get("player2_id")].sort()
    if (p1 === p2) continue
    const key = p1 + ":" + p2
    let duo = byPair[key]
    if (!duo) {
      duo = new Record(duos)
      duo.set("player1", p1)
      duo.set("player2", p2)
      byPair[key] = duo
    }
    duo.set("name", team.get("name"))
    app.save(duo)
    team.set("duo_id", duo.id)
    app.save(team)
  }
}, (app) => {
  const teams = app.findCollectionByNameOrId("teams")
  teams.fields.removeById("relation1792147132")
  app.save(teams)

  app.delete(app.findCollectionByNameOrId("duos"))
})
