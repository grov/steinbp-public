/// <reference path="../pb_data/types.d.ts" />

// Mode « Tournoi officiel » : qualifications en chacun-contre-chacun avec
// matchs chronométrés et barème de points, puis arbre final.
// Ajoute aussi les infos d'événement (lieu, date, règles) à tous les formats.

function numberField(id, name, min, max, help) {
  return new Field({
    "help": help,
    "hidden": false,
    "id": id,
    "max": max,
    "min": min,
    "name": name,
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  })
}

migrate((app) => {
  // ── Tournois ────────────────────────────────────────────────
  const tournaments = app.findCollectionByNameOrId("tournaments")

  const format = tournaments.fields.getByName("format")
  format.values = ["single_elimination", "group_then_elimination", "official"]

  tournaments.fields.add(new Field({
    "help": "Lieu de l'événement",
    "hidden": false,
    "id": "text1792147124",
    "max": 200,
    "min": 0,
    "name": "location",
    "pattern": "",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  tournaments.fields.add(new Field({
    "help": "Date et heure de début",
    "hidden": false,
    "id": "date1792147124",
    "max": "",
    "min": "",
    "name": "starts_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))
  tournaments.fields.add(new Field({
    "help": "Règles du jeu affichées aux joueurs (texte brut)",
    "hidden": false,
    "id": "text1792147125",
    "max": 10000,
    "min": 0,
    "name": "rules",
    "pattern": "",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  tournaments.fields.add(numberField("number1792147124", "match_duration", 1, 60, "Durée d'un match de qualification (minutes)"))
  tournaments.fields.add(numberField("number1792147125", "points_win", 0, 10, "Points pour une victoire"))
  tournaments.fields.add(numberField("number1792147126", "points_win_time", 0, 10, "Points pour une victoire au temps"))
  tournaments.fields.add(numberField("number1792147127", "points_draw", 0, 10, "Points pour une égalité"))
  tournaments.fields.add(numberField("number1792147128", "points_loss", 0, 10, "Points pour une défaite"))
  tournaments.fields.add(numberField("number1792147129", "qualified_count", 0, 128, "Nombre d'équipes qualifiées pour l'arbre final"))
  app.save(tournaments)

  // ── Matchs : score de chaque équipe ─────────────────────────
  // 0/0 sur un match terminé avec vainqueur = ancien match : le score se
  // déduit alors de winner_cups_remaining.
  const matches = app.findCollectionByNameOrId("matches")
  matches.fields.add(numberField("number1792147130", "team1_cups", 0, 10, "Gobelets mis par l'équipe 1"))
  matches.fields.add(numberField("number1792147131", "team2_cups", 0, 10, "Gobelets mis par l'équipe 2"))
  app.save(matches)

  // ── Classements : matchs nuls ───────────────────────────────
  const standings = app.findCollectionByNameOrId("group_standings")
  standings.fields.add(numberField("number1792147132", "draws", 0, null, "Matchs nuls"))
  app.save(standings)
}, (app) => {
  const tournaments = app.findCollectionByNameOrId("tournaments")
  tournaments.fields.getByName("format").values = ["single_elimination", "group_then_elimination"]
  for (const id of [
    "text1792147124", "date1792147124", "text1792147125",
    "number1792147124", "number1792147125", "number1792147126",
    "number1792147127", "number1792147128", "number1792147129",
  ]) tournaments.fields.removeById(id)
  app.save(tournaments)

  const matches = app.findCollectionByNameOrId("matches")
  matches.fields.removeById("number1792147130")
  matches.fields.removeById("number1792147131")
  app.save(matches)

  const standings = app.findCollectionByNameOrId("group_standings")
  standings.fields.removeById("number1792147132")
  app.save(standings)
})
