/// <reference path="../pb_data/types.d.ts" />

// L'inscription publique ne peut créer qu'un joueur en attente de validation.
// Sans cette règle, n'importe qui pouvait s'inscrire directement en admin approuvé.
const SIGNUP_RULE = "@request.auth.role = 'admin' || (@request.body.role = 'joueur' && @request.body.status = 'pending')"

migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")
  collection.createRule = SIGNUP_RULE
  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")
  collection.createRule = ""
  app.save(collection)
})
