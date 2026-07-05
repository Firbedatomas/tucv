/// <reference path="../pb_data/types.d.ts" />

// NOTA: los avisos de Telegram al admin van INLINE dentro de cada hook (buscar
// "[tg]"), NO como helper compartido. PocketBase corre cada hook en un contexto
// aislado donde las funciones top-level de este archivo NO están en scope
// (daba "ReferenceError: tgNotify is not defined" y el hook fallaba sin avisar).

// Login único con Google para `users` (empresas y postulantes comparten esta
// colección de auth, distinguidos por su business_accounts/candidate_profiles
// relacionado). Se aplica en cada arranque -- en vez de en una migration --
// para poder rotar el client secret pisando la env var, sin tocar el
// historial de migrations ni comitear el secret en git. Si las env vars no
// están seteadas (ej. clonaste el repo y todavía no configuraste Google
// Cloud Console) el login por Google queda apagado y PocketBase arranca
// igual, sin romper.
onBootstrap((e) => {
  e.next()

  const clientId = $os.getenv("GOOGLE_CLIENT_ID")
  const clientSecret = $os.getenv("GOOGLE_CLIENT_SECRET")
  if (!clientId || !clientSecret) {
    return
  }

  const users = e.app.findCollectionByNameOrId("users")
  users.oauth2.enabled = true
  users.oauth2.providers = [
    {
      name: "google",
      clientId: clientId,
      clientSecret: clientSecret,
      // El default de PocketBase para "google" usa PKCE. Con nuestro client
      // tipo "Web application" (confidencial, no público) eso parece hacer
      // que la librería OAuth2 omita el client_secret en el intercambio de
      // token (Google responde "invalid_request: client_secret is
      // missing"), como si el client fuera público. Forzamos el flujo
      // clásico sin PKCE para que siempre mande client_secret.
      pkce: false,
    },
  ]
  // Además de leerlo en el momento del login (meta.name/meta.avatarURL en la
  // respuesta de authWithOAuth2, que es lo que usa el frontend para
  // prellenar formularios), dejamos que PocketBase copie nombre/foto acá
  // también -- sirve como respaldo visible en el Admin UI y para el caso de
  // sesiones restauradas donde no hay `meta` a mano.
  users.oauth2.mappedFields = {
    name: "name",
    avatarURL: "avatar",
  }
  users.passwordAuth.enabled = false
  e.app.save(users)
})

// Cada usuario (candidato o empresa) necesita su fila de preferencias de
// notificación desde el arranque -- así /configuracion/notificaciones y los
// links de "cancelar suscripción" de los emails siempre tienen algo que
// leer/editar, sin tener que fijarse en cada lugar de la app si ya existe.
onRecordAfterCreateSuccess((e) => {
  const prefs = e.app.findCollectionByNameOrId("notification_preferences")
  const record = new Record(prefs)
  record.set("user", e.record.id)
  record.set("applications_frequency", "instant")
  record.set("company_digest_frequency", "daily")
  record.set("profile_views_frequency", "weekly")
  record.set("profile_tips", true)
  record.set("marketing", false)
  e.app.save(record)
  e.next()
}, "users")

// Audita cada cambio de estado de una postulación. Se genera server-side
// (no confiamos en que el frontend haga las dos escrituras) para que el
// historial sea confiable aunque el panel falle a mitad de camino.
onRecordAfterCreateSuccess((e) => {
  const events = e.app.findCollectionByNameOrId("application_status_events")
  const record = new Record(events)
  record.set("application", e.record.id)
  record.set("status", e.record.get("status"))
  e.app.save(record)

  // Aviso por mail al candidato y a la empresa. El armado del email (HTML,
  // Resend) vive en la app de Next -- este JSVM no tiene npm -- así que acá
  // solo mandamos un evento liviano con el tipo y el id, y la ruta interna
  // vuelve a leer el registro posta antes de mandar nada (ver
  // app/api/email/trigger/route.ts).
  try {
    $http.send({
      url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
      method: "POST",
      body: JSON.stringify({ type: "application_created", recordId: e.record.id }),
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
      timeout: 5,
    })
  } catch (err) {
    // Un email que no sale nunca debe bloquear ni romper la postulación.
  }

  e.next()
}, "applications")

onRecordUpdate((e) => {
  const previous = e.app.findRecordById("applications", e.record.id)
  const statusChanged = previous.get("status") !== e.record.get("status")

  e.next()

  if (statusChanged) {
    const events = e.app.findCollectionByNameOrId("application_status_events")
    const record = new Record(events)
    record.set("application", e.record.id)
    record.set("status", e.record.get("status"))
    e.app.save(record)
  }
}, "applications")

// Registra el consentimiento del postulante (guardar perfil / visibilidad
// por zona) en un log server-side, separado del propio perfil.
onRecordAfterCreateSuccess((e) => {
  const logs = e.app.findCollectionByNameOrId("consent_logs")

  const saveLog = new Record(logs)
  saveLog.set("candidate", e.record.id)
  saveLog.set("type", "save_profile")
  e.app.save(saveLog)

  if (e.record.get("consent_zone_visible")) {
    const zoneLog = new Record(logs)
    zoneLog.set("candidate", e.record.id)
    zoneLog.set("type", "zone_visible")
    e.app.save(zoneLog)
  }

  // consent_public_profile es el opt-in de listado en /postulantes -- ver
  // la migración 1783230000_updated_candidate_profiles.js sobre por qué es
  // un campo separado de consent_zone_visible, no una reutilización.
  if (e.record.get("consent_public_profile")) {
    const publicLog = new Record(logs)
    publicLog.set("candidate", e.record.id)
    publicLog.set("type", "public_profile")
    e.app.save(publicLog)
  }

  // "welcome_candidate" y (si ya activó el listado público desde el propio
  // alta) "public_profile_enabled" -- ver nota de $http.send más arriba en
  // el hook de "applications" sobre por qué esto es solo un aviso liviano.
  try {
    $http.send({
      url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
      method: "POST",
      body: JSON.stringify({ type: "welcome_candidate", recordId: e.record.id }),
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
      timeout: 5,
    })
    if (e.record.get("consent_public_profile")) {
      $http.send({
        url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
        method: "POST",
        body: JSON.stringify({ type: "public_profile_enabled", recordId: e.record.id }),
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
        timeout: 5,
      })
    }
  } catch (err) {
    // idem: nunca bloquea ni rompe el alta del perfil.
  }

  // Aviso Telegram INLINE (no como helper top-level): PocketBase corre cada hook
  // en un contexto aislado, así que una función definida arriba NO está en scope
  // acá -> daba "ReferenceError: tgNotify is not defined" y el hook fallaba sin
  // avisar (por eso no llegaba ningún aviso). Va inline como los $http.send de
  // email, que sí andan porque usan globals ($http/$os).
  try {
    const _tgTok = $os.getenv("TELEGRAM_BOT_TOKEN")
    const _tgChat = $os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if (_tgTok && _tgChat) {
      const _tgRes = $http.send({
        url: "https://api.telegram.org/bot" + _tgTok + "/sendMessage",
        method: "POST",
        body: JSON.stringify({
          chat_id: _tgChat,
          text:
            "🙋 Nuevo postulante\n" +
            (e.record.get("name") || "(sin nombre)") +
            "\nZona: " + (e.record.get("city_zone") || "-") +
            "\nRubros: " + ([].concat(e.record.get("categories") || []).join(", ") || "-"),
          disable_web_page_preview: true,
        }),
        headers: { "Content-Type": "application/json" },
        timeout: 6,
      })
      console.log("[tg] postulante -> " + (_tgRes.statusCode === 200 ? "ok" : "status " + _tgRes.statusCode + " " + String(_tgRes.raw).slice(0, 150)))
    } else {
      console.log("[tg] sin config TELEGRAM_BOT_TOKEN/CHAT_ID")
    }
  } catch (_tgErr) {
    console.log("[tg] postulante EXCEPCION: " + _tgErr)
  }

  e.next()
}, "candidate_profiles")

onRecordUpdate((e) => {
  const previous = e.app.findRecordById("candidate_profiles", e.record.id)
  const zoneVisibleTurnedOn =
    !previous.get("consent_zone_visible") && e.record.get("consent_zone_visible")
  const publicProfileTurnedOn =
    !previous.get("consent_public_profile") && e.record.get("consent_public_profile")

  // "Perfil completo" = tiene bio, al menos un rubro y al menos una
  // disponibilidad (campos garantizados por el schema declarativo; NO uso
  // `experience`, que lo agregan los scripts .mjs y puede no existir en todo
  // entorno). El email profile_completed se dispara SOLO en la transición
  // incompleto -> completo en una edición: en el alta, "registro" y "perfil
  // completo" son el mismo instante y ya lo cubre welcome_candidate, así que
  // mandarlo también ahí sería spam. Mismo criterio de completitud que el
  // badge "Perfil completo" (lib/candidate-badges.ts), sin `experience`.
  function isComplete(rec) {
    const bio = (rec.get("bio") || "").trim()
    const cats = rec.get("categories") || []
    const avail = rec.get("availability") || []
    return bio.length > 0 && cats.length > 0 && avail.length > 0
  }
  const becameComplete = !isComplete(previous) && isComplete(e.record)

  e.next()

  if (becameComplete) {
    try {
      $http.send({
        url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
        method: "POST",
        body: JSON.stringify({ type: "profile_completed", recordId: e.record.id }),
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
        timeout: 5,
      })
    } catch (err) {
      // idem: nunca bloquea ni rompe la edición del perfil.
    }
  }

  if (zoneVisibleTurnedOn) {
    const logs = e.app.findCollectionByNameOrId("consent_logs")
    const zoneLog = new Record(logs)
    zoneLog.set("candidate", e.record.id)
    zoneLog.set("type", "zone_visible")
    e.app.save(zoneLog)
  }

  if (publicProfileTurnedOn) {
    const logs = e.app.findCollectionByNameOrId("consent_logs")
    const publicLog = new Record(logs)
    publicLog.set("candidate", e.record.id)
    publicLog.set("type", "public_profile")
    e.app.save(publicLog)

    try {
      $http.send({
        url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
        method: "POST",
        body: JSON.stringify({ type: "public_profile_enabled", recordId: e.record.id }),
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
        timeout: 5,
      })
    } catch (err) {
      // idem: nunca bloquea ni rompe la edición del perfil.
    }
  }
}, "candidate_profiles")

// Trackea rubros "otro" que los postulantes escriben a mano: cuando se
// repiten mucho puede tener sentido sumarlos a la lista oficial de rubros
// (CATEGORIES en lib/constants.ts) — pero esa decisión la toma una persona
// revisando category_suggestions, no algo automático (evita que texto raro
// o inapropiado se cuele solo).
// Nota: la lógica va duplicada en los dos hooks (create/update) a propósito
// -- el JSVM de PocketBase evalúa cada callback de forma aislada y no
// resuelve funciones auxiliares declaradas a nivel de archivo entre hooks.
onRecordAfterCreateSuccess((e) => {
  const categories = e.record.get("categories") || []
  const other = (e.record.get("category_other") || "").trim().toLowerCase()
  if (other && categories.indexOf("otro") !== -1) {
    const suggestions = e.app.findCollectionByNameOrId("category_suggestions")
    let existing
    try {
      existing = e.app.findFirstRecordByFilter("category_suggestions", "text = {:text}", { text: other })
    } catch {
      existing = null
    }
    if (existing) {
      existing.set("count", existing.get("count") + 1)
      e.app.save(existing)
    } else {
      const suggestion = new Record(suggestions)
      suggestion.set("text", other)
      suggestion.set("count", 1)
      e.app.save(suggestion)
    }
  }
  e.next()
}, "candidate_profiles")

onRecordAfterUpdateSuccess((e) => {
  const categories = e.record.get("categories") || []
  const other = (e.record.get("category_other") || "").trim().toLowerCase()
  if (other && categories.indexOf("otro") !== -1) {
    const suggestions = e.app.findCollectionByNameOrId("category_suggestions")
    let existing
    try {
      existing = e.app.findFirstRecordByFilter("category_suggestions", "text = {:text}", { text: other })
    } catch {
      existing = null
    }
    if (existing) {
      existing.set("count", existing.get("count") + 1)
      e.app.save(existing)
    } else {
      const suggestion = new Record(suggestions)
      suggestion.set("text", other)
      suggestion.set("count", 1)
      e.app.save(suggestion)
    }
  }
  e.next()
}, "candidate_profiles")

// Sincroniza el espejo público public_candidate_cards (ver la migración
// 1783270002_created_public_candidate_cards.js sobre por qué existe). Si
// consent_public_profile está prendido, hace upsert de la card con SOLO los
// campos seguros ya derivados (display_name = "Juan P.", nunca whatsapp/
// fecha de nacimiento/CV); si está apagado, borra la card si existía. La
// lógica va DUPLICADA en create y update a propósito -- el JSVM de
// PocketBase evalúa cada callback aislado y no resuelve funciones a nivel de
// archivo entre hooks (mismo motivo, y mismo patrón, que category_suggestions
// arriba). El borrado del perfil no necesita hook: la relación `candidate`
// de la card tiene cascadeDelete.
onRecordAfterCreateSuccess((e) => {
  const cards = e.app.findCollectionByNameOrId("public_candidate_cards")
  let existing
  try {
    existing = e.app.findFirstRecordByFilter("public_candidate_cards", "candidate = {:id}", { id: e.record.id })
  } catch {
    existing = null
  }
  const isPublic = !!e.record.get("consent_public_profile") && !!e.record.get("profile_slug") && !e.record.get("suspended")
  if (!isPublic) {
    if (existing) e.app.delete(existing)
    e.next()
    return
  }
  const fullName = (e.record.get("name") || "").trim()
  const parts = fullName.split(/\s+/).filter(function (p) { return p.length > 0 })
  let displayName = "Postulante"
  if (parts.length === 1) displayName = parts[0]
  else if (parts.length >= 2) displayName = parts[0] + " " + parts[1].charAt(0).toUpperCase() + "."
  const pbBase = $os.getenv("NEXT_PUBLIC_POCKETBASE_URL") || "http://127.0.0.1:8092"
  const photo = e.record.get("photo")
  const photoUrl = photo ? pbBase + "/api/files/" + e.record.collection().id + "/" + e.record.id + "/" + photo : ""
  const card = existing || new Record(cards)
  card.set("candidate", e.record.id)
  card.set("slug", e.record.get("profile_slug"))
  card.set("display_name", displayName)
  card.set("city_zone", e.record.get("city_zone") || "")
  card.set("city", e.record.get("city") || "")
  card.set("province", e.record.get("province") || "")
  card.set("country", e.record.get("country") || "")
  card.set("categories", e.record.get("categories") || [])
  card.set("category_other", e.record.get("category_other") || "")
  card.set("experience", e.record.get("experience") || "")
  card.set("availability", e.record.get("availability") || [])
  card.set("has_own_transport", e.record.get("has_own_transport") || "")
  card.set("immediate_availability", !!e.record.get("immediate_availability"))
  card.set("bio", e.record.get("bio") || "")
  card.set("photo_url", photoUrl)
  card.set("source_created", e.record.get("created"))
  card.set("source_updated", e.record.get("updated"))
  // Fase 2: cache del perfil laboral en el espejo (fallback: si el cache está
  // vacío, la card usa `categories`/`experience` viejos, que también van acá).
  card.set("total_experience_months", e.record.get("total_experience_months") || 0)
  card.set("work_experience_count", e.record.get("work_experience_count") || 0)
  card.set("dominant_categories", e.record.get("dominant_categories") || [])
  card.set("latest_job_title", e.record.get("latest_job_title") || "")
  card.set("has_current_job", !!e.record.get("has_current_job"))
  {
    // experience_categories = rubros distintos de las experiencias, para que el
    // matching público cruce "trabajó en X" aunque no lo tenga como rubro deseado.
    let _expCats = []
    try {
      const _exps = e.app.findRecordsByFilter("candidate_work_experiences", "candidate_profile = {:id}", "", 300, 0, { id: e.record.id })
      const _seen = {}
      for (let _i = 0; _i < _exps.length; _i++) { const _ct = _exps[_i].get("category"); if (_ct && !_seen[_ct]) { _seen[_ct] = 1; _expCats.push(_ct) } }
    } catch (_err) { }
    card.set("experience_categories", _expCats)
  }
  e.app.save(card)
  e.next()
}, "candidate_profiles")

onRecordAfterUpdateSuccess((e) => {
  const cards = e.app.findCollectionByNameOrId("public_candidate_cards")
  let existing
  try {
    existing = e.app.findFirstRecordByFilter("public_candidate_cards", "candidate = {:id}", { id: e.record.id })
  } catch {
    existing = null
  }
  const isPublic = !!e.record.get("consent_public_profile") && !!e.record.get("profile_slug") && !e.record.get("suspended")
  if (!isPublic) {
    if (existing) e.app.delete(existing)
    e.next()
    return
  }
  const fullName = (e.record.get("name") || "").trim()
  const parts = fullName.split(/\s+/).filter(function (p) { return p.length > 0 })
  let displayName = "Postulante"
  if (parts.length === 1) displayName = parts[0]
  else if (parts.length >= 2) displayName = parts[0] + " " + parts[1].charAt(0).toUpperCase() + "."
  const pbBase = $os.getenv("NEXT_PUBLIC_POCKETBASE_URL") || "http://127.0.0.1:8092"
  const photo = e.record.get("photo")
  const photoUrl = photo ? pbBase + "/api/files/" + e.record.collection().id + "/" + e.record.id + "/" + photo : ""
  const card = existing || new Record(cards)
  card.set("candidate", e.record.id)
  card.set("slug", e.record.get("profile_slug"))
  card.set("display_name", displayName)
  card.set("city_zone", e.record.get("city_zone") || "")
  card.set("city", e.record.get("city") || "")
  card.set("province", e.record.get("province") || "")
  card.set("country", e.record.get("country") || "")
  card.set("categories", e.record.get("categories") || [])
  card.set("category_other", e.record.get("category_other") || "")
  card.set("experience", e.record.get("experience") || "")
  card.set("availability", e.record.get("availability") || [])
  card.set("has_own_transport", e.record.get("has_own_transport") || "")
  card.set("immediate_availability", !!e.record.get("immediate_availability"))
  card.set("bio", e.record.get("bio") || "")
  card.set("photo_url", photoUrl)
  card.set("source_created", e.record.get("created"))
  card.set("source_updated", e.record.get("updated"))
  // Fase 2: cache del perfil laboral en el espejo (fallback: si el cache está
  // vacío, la card usa `categories`/`experience` viejos, que también van acá).
  card.set("total_experience_months", e.record.get("total_experience_months") || 0)
  card.set("work_experience_count", e.record.get("work_experience_count") || 0)
  card.set("dominant_categories", e.record.get("dominant_categories") || [])
  card.set("latest_job_title", e.record.get("latest_job_title") || "")
  card.set("has_current_job", !!e.record.get("has_current_job"))
  {
    // experience_categories = rubros distintos de las experiencias, para que el
    // matching público cruce "trabajó en X" aunque no lo tenga como rubro deseado.
    let _expCats = []
    try {
      const _exps = e.app.findRecordsByFilter("candidate_work_experiences", "candidate_profile = {:id}", "", 300, 0, { id: e.record.id })
      const _seen = {}
      for (let _i = 0; _i < _exps.length; _i++) { const _ct = _exps[_i].get("category"); if (_ct && !_seen[_ct]) { _seen[_ct] = 1; _expCats.push(_ct) } }
    } catch (_err) { }
    card.set("experience_categories", _expCats)
  }
  e.app.save(card)
  e.next()
}, "candidate_profiles")

// Protege `plan` (free/pro) de business_accounts: una empresa autenticada
// puede editar su propio registro (nombre, teléfono, zona), pero NO puede
// auto-otorgarse el plan pago -- eso lo cambia solo un superusuario (por
// ahora a mano vía el admin de PocketBase, hasta que haya cobro real).
// hasSuperuserAuth() vive en los hooks *Request (nivel API), no en
// onRecordCreate/onRecordUpdate (nivel modelo, sin contexto de request).
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    const previous = e.app.findRecordById("business_accounts", e.record.id)
    if (e.record.get("plan") !== previous.get("plan")) {
      e.record.set("plan", previous.get("plan"))
    }
  }
  e.next()
}, "business_accounts")

// Aviso de bienvenida a la empresa recién registrada -- ver nota de
// $http.send en el hook de "applications" más arriba.
onRecordAfterCreateSuccess((e) => {
  try {
    $http.send({
      url: ($os.getenv("APP_INTERNAL_URL") || "http://127.0.0.1:3000") + "/api/email/trigger",
      method: "POST",
      body: JSON.stringify({ type: "welcome_company", recordId: e.record.id }),
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + $os.getenv("EMAIL_TRIGGER_SECRET") },
      timeout: 5,
    })
  } catch (err) {
    // nunca bloquea ni rompe el alta de la empresa.
  }

  // Aviso Telegram INLINE (ver nota en el hook de candidate_profiles).
  try {
    const _tgTok = $os.getenv("TELEGRAM_BOT_TOKEN")
    const _tgChat = $os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if (_tgTok && _tgChat) {
      const _tgRes = $http.send({
        url: "https://api.telegram.org/bot" + _tgTok + "/sendMessage",
        method: "POST",
        body: JSON.stringify({
          chat_id: _tgChat,
          text:
            "🏢 Nueva empresa\n" +
            (e.record.get("business_name") || "(sin nombre)") +
            "\nZona: " + (e.record.get("city_zone") || "-") +
            (e.record.get("phone") ? "\nTel: " + e.record.get("phone") : ""),
          disable_web_page_preview: true,
        }),
        headers: { "Content-Type": "application/json" },
        timeout: 6,
      })
      console.log("[tg] empresa -> " + (_tgRes.statusCode === 200 ? "ok" : "status " + _tgRes.statusCode))
    }
  } catch (_tgErr) {
    console.log("[tg] empresa EXCEPCION: " + _tgErr)
  }

  e.next()
}, "business_accounts")

// Mismo cuidado en la creación: nadie arranca en "pro" mandando el campo a
// mano en el alta.
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth() && e.record.get("plan")) {
    e.record.set("plan", "")
  }
  e.next()
}, "business_accounts")

// Los límites del plan gratis (1 búsqueda activa, 1 creada por mes, 7 días
// de duración -- mismos números que lib/plan-limits.ts, duplicados acá a
// propósito: los hooks de PocketBase son JS plano, sin acceso a los módulos
// TS de la app, mismo motivo por el que scripts/seed.js reimplementa su
// propio slugify) SOLO se chequeaban en JobPostForm.tsx -- cualquiera con su
// propio token autenticado podía pegarle directo a la API y saltarse los
// tres, sin que hubiera ninguna regla del lado del servidor. Bypaseado para
// superusuario (Admin UI / scripts de seed) para no romper esos usos.
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) {
    e.next()
    return
  }

  const business = e.app.findRecordById("business_accounts", e.record.get("business"))
  const plan = business.get("plan") || "free"

  if (plan === "free") {
    // Duración: el plan gratis dura 7 días siempre, sin importar qué haya
    // mandado el cliente (el form ni deja elegir otra cosa, pero esto lo
    // hace real del lado del servidor también).
    e.record.set("duration_days", "7")

    const activeCount = e.app.countRecords(
      "job_posts",
      $dbx.exp("business = {:business} AND active = true AND expires_at > {:now}", {
        business: business.id,
        now: new Date().toISOString(),
      }),
    )
    if (activeCount >= 1) {
      throw new BadRequestError(
        "Con el plan gratis podés tener 1 búsqueda activa a la vez. Cerrá la anterior o activá el plan Pro para publicar varias al mismo tiempo.",
      )
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const monthlyCount = e.app.countRecords(
      "job_posts",
      $dbx.exp("business = {:business} AND created > {:since}", { business: business.id, since: since.toISOString() }),
    )
    if (monthlyCount >= 1) {
      throw new BadRequestError(
        "Con el plan gratis podés crear 1 búsqueda por mes. Esperá a que pase el mes desde tu última búsqueda o activá el plan Pro para publicar cuando quieras.",
      )
    }
  } else if (plan === "multi_local") {
    const activeCount = e.app.countRecords(
      "job_posts",
      $dbx.exp("business = {:business} AND active = true AND expires_at > {:now}", {
        business: business.id,
        now: new Date().toISOString(),
      }),
    )
    if (activeCount >= 10) {
      throw new BadRequestError("Tu plan permite hasta 10 búsquedas activas a la vez. Cerrá alguna para publicar una nueva.")
    }
  }

  e.next()
}, "job_posts")

// Al crear una búsqueda, calculamos expires_at a partir de duration_days
// server-side para que no dependa de la hora/reloj del navegador del cliente.
// El form público de alta no expone "active", así que siempre arranca true;
// el negocio la puede cerrar manualmente después (update) apagando el campo.
onRecordCreate((e) => {
  const days = parseInt(e.record.get("duration_days"), 10) || 30
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  e.record.set("expires_at", expiresAt.toISOString())
  e.record.set("active", true)
  e.next()
}, "job_posts")

// Aviso al admin de nueva búsqueda por Telegram. afterCreateSuccess: ya pasó
// los límites de plan (onRecordCreateRequest de arriba) y quedó persistida.
onRecordAfterCreateSuccess((e) => {
  try {
    let bizName = e.record.get("business")
    try {
      const biz = e.app.findRecordById("business_accounts", e.record.get("business"))
      bizName = biz.get("business_name") || bizName
    } catch (err) {}
    const cat = e.record.get("category") === "otro"
      ? (e.record.get("category_other") || "otro")
      : e.record.get("category")
    // Aviso Telegram INLINE (ver nota en el hook de candidate_profiles).
    const _tgTok = $os.getenv("TELEGRAM_BOT_TOKEN")
    const _tgChat = $os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if (_tgTok && _tgChat) {
      const _tgRes = $http.send({
        url: "https://api.telegram.org/bot" + _tgTok + "/sendMessage",
        method: "POST",
        body: JSON.stringify({
          chat_id: _tgChat,
          text:
            "📢 Nueva búsqueda\n" +
            (e.record.get("role") || e.record.get("name") || "(puesto)") +
            "\nRubro: " + (cat || "-") +
            "\nZona: " + (e.record.get("address_zone") || "-") +
            "\nNegocio: " + bizName,
          disable_web_page_preview: true,
        }),
        headers: { "Content-Type": "application/json" },
        timeout: 6,
      })
      console.log("[tg] busqueda -> " + (_tgRes.statusCode === 200 ? "ok" : "status " + _tgRes.statusCode))
    }
  } catch (err) {
    console.log("[tg] busqueda EXCEPCION: " + err)
  }
  e.next()
}, "job_posts")

// Los avisos de vencimiento (job_expiring/job_deactivated_summary, ver
// app/api/cron/daily) marcan expiring_notified/expired_notified para no
// mandarse todos los días mientras dure la ventana. Si expires_at se mueve
// a futuro (renovar, extender, reactivar -- varios lugares del código hacen
// esto: ApplicantsPanel, mercadopago webhook, JobPostForm) esos avisos
// vuelven a ser válidos para el próximo ciclo, así que se resetean acá, en
// un solo lugar, en vez de repetir "también resetear los flags" en cada
// código que toca expires_at.
onRecordUpdate((e) => {
  const previous = e.app.findRecordById("job_posts", e.record.id)
  const prevExpiresAt = new Date(previous.get("expires_at")).getTime()
  const nextExpiresAt = new Date(e.record.get("expires_at")).getTime()
  if (nextExpiresAt > prevExpiresAt) {
    e.record.set("expiring_notified", false)
    e.record.set("expired_notified", false)
  }
  e.next()
}, "job_posts")

// business_invites.createRule es null (siempre se crea vía pbAdmin desde
// /api/business-invites, después de validar plan+cupo ahí) -- esto es una
// segunda barrera server-side por si ese chequeo de la ruta alguna vez
// queda desactualizado o algún script futuro llama a pbAdmin directo sin
// pasar por la ruta. Mismos números que lib/plan-limits.ts#maxTeamMembers,
// duplicados acá por el mismo motivo que el límite de job_posts arriba
// (los hooks son JS plano, sin acceso a los módulos TS de la app).
onRecordCreateRequest((e) => {
  const business = e.app.findRecordById("business_accounts", e.record.get("business"))
  const plan = business.get("plan") || "free"
  const limit = plan === "multi_local" ? 10 : 0

  const memberCount = e.app.countRecords(
    "business_members",
    $dbx.exp("business = {:business}", { business: business.id }),
  )
  const pendingCount = e.app.countRecords(
    "business_invites",
    $dbx.exp("business = {:business} AND status = 'pending'", { business: business.id }),
  )
  if (memberCount + pendingCount >= limit) {
    throw new BadRequestError("Ya se alcanzó el cupo de miembros de equipo para este negocio.")
  }

  e.next()
}, "business_invites")

// business_members.createRule también es null (siempre vía pbAdmin desde
// /api/business-invites/[token]/accept, que ya valida esto) -- misma lógica
// de segunda barrera que el hook de arriba. El invariante real ("un usuario
// tiene como máximo una relación con un negocio, dueño de uno o miembro de
// otro") lo garantiza además el índice único idx_business_members_user a
// nivel de base de datos; esto solo convierte ese error de constraint en un
// mensaje legible si algo llega a violarlo.
onRecordCreateRequest((e) => {
  const userId = e.record.get("user")
  let ownsBusiness = false
  try {
    e.app.findFirstRecordByFilter("business_accounts", "user = {:user}", { user: userId })
    ownsBusiness = true
  } catch {
    ownsBusiness = false
  }
  if (ownsBusiness) {
    throw new BadRequestError("Esta cuenta ya es dueña de un negocio en TuCV.")
  }

  e.next()
}, "business_members")

// profile_reports.createRule es público a propósito (reportar un perfil
// sospechoso no debería exigir cuenta, mismo criterio que business_reports)
// -- pero a diferencia de business_reports (que sí exige login como única
// mitigación, ver ReportBusinessButton.tsx), acá no hay ningún login que
// pedir, así que el límite tiene que ir server-side por IP. Guardamos la IP
// nosotros (ignoramos lo que mande el cliente) y frenamos a las 5
// denuncias/hora -- alcanza para un uso legítimo (alguien reportando un par
// de perfiles distintos) sin habilitar un spam masivo de reportes falsos.
onRecordCreateRequest((e) => {
  const ip = e.realIP()
  e.record.set("reporter_ip", ip)

  if (ip) {
    // OJO: "created" queda guardado en formato "2026-07-04 17:39:42.282Z"
    // (espacio, no "T") -- $dbx.exp arma un WHERE crudo, sin el resolver de
    // filtros de PocketBase que sí normaliza fechas (a diferencia de
    // admin.filter(...) del lado de la app de Next). Comparado como texto
    // contra un ISO con "T" (Date#toISOString de JS), " " < "T" en ASCII
    // así que TODO "created" siempre parecía "menor" -- el conteo daba
    // siempre 0 sin importar cuántos reportes hubiera. Replicamos acá el
    // mismo formato con espacio para que la comparación de texto SÍ
    // corresponda al orden cronológico real.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace("T", " ")
    const recentCount = e.app.countRecords(
      "profile_reports",
      $dbx.exp("reporter_ip = {:ip} AND created > {:since}", { ip: ip, since: since }),
    )
    if (recentCount >= 5) {
      throw new BadRequestError("Ya reportaste varios perfiles en la última hora. Probá de nuevo más tarde.")
    }
  }

  e.next()
}, "profile_reports")

// ============================================================================
// Fase 2 -- CACHE del perfil laboral. Cuando cambian las experiencias o sus
// tareas, se recalcula el cache del candidate_profiles (años, cantidad, rubros/
// tareas dominantes, último puesto, trabaja actualmente, experience global). La
// lógica vive en lib_candidate_cache.js y se comparte vía require() (los hooks
// corren aislados; require sí funciona dentro del callback). Best-effort: nunca
// rompe la operación que lo dispara.
// ============================================================================
// require() + recompute van INLINE en cada callback: las funciones top-level de
// este archivo NO están en scope dentro de los hooks aislados (daría
// ReferenceError), pero require() sí funciona dentro del callback.
onRecordAfterCreateSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_work_experiences")
onRecordAfterUpdateSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_work_experiences")
onRecordAfterDeleteSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_work_experiences")
onRecordAfterCreateSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_experience_tasks")
onRecordAfterUpdateSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_experience_tasks")
onRecordAfterDeleteSuccess((e) => {
  try { require(`${__hooks}/lib_candidate_cache.js`).recompute(e.app, e.record.get("candidate_profile")) } catch (err) { console.log("[cache] " + err) }
  e.next()
}, "candidate_experience_tasks")
