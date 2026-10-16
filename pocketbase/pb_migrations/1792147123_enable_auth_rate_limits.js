/// <reference path="../pb_data/types.d.ts" />

// Limite le brute-force sur l'authentification et la création de comptes.
// BunkerWeb filtre déjà en amont : ces règles ne visent que les routes
// sensibles et restent volontairement larges.
//
// L'IP client est fournie par le nginx de l'app via X-Real-IP (seul header
// de confiance). Si l'IP réelle n'était pas résolue, tous les clients
// partageraient l'IP du proxy : d'où des seuils tolérants.
migrate((app) => {
  const settings = app.settings()

  settings.trustedProxy.headers = ["X-Real-IP"]
  settings.trustedProxy.useLeftmostIP = false

  settings.rateLimits.enabled = true
  settings.rateLimits.rules = [
    { label: "*:auth", audience: "", duration: 60, maxRequests: 10 },
    { label: "*:requestPasswordReset", audience: "", duration: 60, maxRequests: 3 },
    { label: "*:requestVerification", audience: "", duration: 60, maxRequests: 3 },
    { label: "*:requestOTP", audience: "", duration: 60, maxRequests: 3 },
    { label: "users:create", audience: "@guest", duration: 60, maxRequests: 5 },
  ]

  app.save(settings)
}, (app) => {
  const settings = app.settings()

  settings.trustedProxy.headers = []
  settings.rateLimits.enabled = false
  settings.rateLimits.rules = []

  app.save(settings)
})
