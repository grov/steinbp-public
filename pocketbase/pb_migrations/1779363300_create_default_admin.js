/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  const record = new Record(collection)
  record.set("email", "admin@steinbp.local")
  record.set("username", "admin")
  record.set("display_name", "Administrateur")
  record.set("status", "approved")
  record.set("role", "admin")
  record.set("password", "littlestein")
  record.set("passwordConfirm", "littlestein")

  return app.save(record)
}, (app) => {
  const record = app.findAuthRecordByEmail("_pb_users_auth_", "admin@steinbp.local")
  return app.delete(record)
})
