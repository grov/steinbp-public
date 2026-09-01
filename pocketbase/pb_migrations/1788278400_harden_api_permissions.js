/// <reference path="../pb_data/types.d.ts" />

const MANAGER = "@request.auth.role = 'admin' || @request.auth.role = 'organisateur'"
const OWNER_MANAGER = "@request.auth.role = 'admin' || (@request.auth.role = 'organisateur' && created_by = @request.auth.id)"
const CHILD_OWNER_MANAGER = "@request.auth.role = 'admin' || (@request.auth.role = 'organisateur' && tournament_id.created_by = @request.auth.id)"

function saveRules(app, collectionName, rules) {
  const collection = app.findCollectionByNameOrId(collectionName)
  for (const [name, value] of Object.entries(rules)) collection[name] = value
  app.save(collection)
}

migrate((app) => {
  // Un compte peut modifier son profil, mais jamais s'approuver ou changer son rôle.
  saveRules(app, "_pb_users_auth_", {
    listRule: "@request.auth.id != '' && (@request.auth.status = 'approved' || " + MANAGER + ")",
    viewRule: "@request.auth.id != '' && (id = @request.auth.id || @request.auth.status = 'approved' || " + MANAGER + ")",
    updateRule: "@request.auth.role = 'admin' || (id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false)",
    deleteRule: "@request.auth.role = 'admin'",
  })

  // Un organisateur ne gère que les tournois qu'il a créés.
  saveRules(app, "tournaments", {
    createRule: "@request.auth.role = 'admin' || (@request.auth.role = 'organisateur' && @request.body.created_by = @request.auth.id && @request.body.status = 'registration')",
    updateRule: OWNER_MANAGER + " && @request.body.created_by:changed = false",
    deleteRule: OWNER_MANAGER,
  })

  // Même contrôle de propriété pour toutes les données rattachées au tournoi.
  for (const name of ["game_tables", "teams", "groups", "group_standings", "matches"]) {
    saveRules(app, name, {
      createRule: CHILD_OWNER_MANAGER,
      updateRule: CHILD_OWNER_MANAGER + " && @request.body.tournament_id:changed = false",
      deleteRule: CHILD_OWNER_MANAGER,
    })
  }

  // Les défis restent lisibles par les membres approuvés pour alimenter le
  // palmarès global. La création impose l'utilisateur comme auteur/joueur 1.
  saveRules(app, "challenges", {
    listRule: "@request.auth.id != '' && (@request.auth.status = 'approved' || " + MANAGER + ")",
    viewRule: "@request.auth.id != '' && (@request.auth.status = 'approved' || " + MANAGER + ")",
    createRule: "@request.auth.id != '' && @request.body.created_by = @request.auth.id && @request.body.player1_id = @request.auth.id && (@request.body.winner_name = @request.body.player1_name || @request.body.winner_name = @request.body.player2_name)",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin' || created_by = @request.auth.id",
  })
}, (app) => {
  saveRules(app, "_pb_users_auth_", {
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    updateRule: "id = @request.auth.id || @request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
  })

  saveRules(app, "tournaments", {
    createRule: MANAGER,
    updateRule: MANAGER,
    deleteRule: MANAGER,
  })

  for (const name of ["game_tables", "teams", "groups", "group_standings", "matches"]) {
    saveRules(app, name, {
      createRule: MANAGER,
      updateRule: MANAGER,
      deleteRule: MANAGER,
    })
  }

  saveRules(app, "challenges", {
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && (created_by = @request.auth.id || @request.auth.role = 'admin')",
    deleteRule: "@request.auth.id != '' && (created_by = @request.auth.id || @request.auth.role = 'admin')",
  })
})
