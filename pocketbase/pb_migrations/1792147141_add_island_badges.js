/// <reference path="../pb_data/types.d.ts" />
// Ajoute les badges Island aux réglages existants (les badges enregistrés
// depuis l'admin ne reprennent pas les nouveaux défauts). Idempotent : un
// badge déjà présent (même id) n'est pas dupliqué.

const ISLAND_BADGES = [
  { id: "castaway",    emoji: "🏝️", name: "Naufragé",    desc: "1ère Island", stat: "island_count", threshold: 1 },
  { id: "explorer",    emoji: "🧭", name: "Explorateur", desc: "5 Islands",   stat: "island_count", threshold: 5 },
  { id: "archipelago", emoji: "🌴", name: "Archipel",    desc: "15 Islands",  stat: "island_count", threshold: 15 },
]

migrate((app) => {
  const records = app.findAllRecords("app_settings")
  for (const record of records) {
    const raw = record.getString("badges")
    // Pas de badges enregistrés → l'app utilise les défauts, qui incluent déjà Island
    if (!raw || raw === "null") continue
    const badges = JSON.parse(raw)

    const missing = ISLAND_BADGES.filter((b) => !badges.some((x) => x.id === b.id))
    if (missing.length === 0) continue

    // Insertion juste après le dernier badge Balls Back (sinon en fin de liste)
    let at = badges.length
    for (let i = 0; i < badges.length; i++) {
      if (badges[i].stat === "balls_back_count") at = i + 1
    }
    badges.splice(at, 0, ...missing)

    record.set("badges", badges)
    app.save(record)
  }
}, (app) => {
  const ids = ISLAND_BADGES.map((b) => b.id)
  const records = app.findAllRecords("app_settings")
  for (const record of records) {
    const raw = record.getString("badges")
    if (!raw || raw === "null") continue
    record.set("badges", JSON.parse(raw).filter((b) => !ids.includes(b.id)))
    app.save(record)
  }
})
