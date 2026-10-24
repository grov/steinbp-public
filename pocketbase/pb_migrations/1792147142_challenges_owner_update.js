/// <reference path="../pb_data/types.d.ts" />
// L'auteur d'un défi peut le modifier (comme il peut le supprimer), avec les
// mêmes garanties qu'à la création : il reste auteur et joueur 1, et le
// vainqueur est l'un des deux camps.

const ADMIN_ONLY = "@request.auth.role = 'admin'"

migrate((app) => {
  const collection = app.findCollectionByNameOrId("challenges")
  collection.updateRule = ADMIN_ONLY + " || (" +
    "created_by = @request.auth.id" +
    " && @request.body.created_by:changed = false" +
    " && @request.body.player1_id:changed = false" +
    " && (@request.body.winner_name = @request.body.player1_name || @request.body.winner_name = @request.body.player2_name)" +
    ")"
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("challenges")
  collection.updateRule = ADMIN_ONLY
  return app.save(collection)
})
