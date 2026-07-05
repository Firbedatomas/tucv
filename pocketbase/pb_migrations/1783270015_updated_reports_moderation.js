/// <reference path="../pb_data/types.d.ts" />
// Cola de moderación operativa sobre los reportes. Antes de esto:
//   - profile_reports  (pbc_9002310000) NO tenía `status`.
//   - business_reports (pbc_8823401200) NO tenía `status`.
//   - content_reports  (pbc_9002700012) YA tenía `status` con valores
//     ["pending", "reviewed", "dismissed"].
//
// Uniformamos las tres colecciones con un mismo set de estados para que la
// misma UI/route de moderación (app/api/admin/moderate) sirva para las tres.
// A content_reports le AMPLIAMOS los valores (no lo reemplazamos) para no
// invalidar registros existentes en "reviewed"/"dismissed".
const STATUS_VALUES = [
  "pending",
  "reviewing",
  "resolved_no_action",
  "hidden",
  "user_warned",
  "user_blocked",
  "reviewed",
  "dismissed",
]

migrate((app) => {
  // 1) profile_reports: agregar `status` (no lo tenía).
  const profileReports = app.findCollectionByNameOrId("pbc_9002310000")
  profileReports.fields.add(new Field({
    "hidden": false,
    "id": "select9002310010",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": STATUS_VALUES,
  }))
  app.save(profileReports)

  // 2) business_reports: agregar `status` (no lo tenía).
  const businessReports = app.findCollectionByNameOrId("pbc_8823401200")
  businessReports.fields.add(new Field({
    "hidden": false,
    "id": "select8823401210",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": STATUS_VALUES,
  }))
  app.save(businessReports)

  // 3) content_reports: ampliar los valores del `status` existente.
  const contentReports = app.findCollectionByNameOrId("pbc_9002700012")
  const statusField = contentReports.fields.getById("select9002700126")
  statusField.values = STATUS_VALUES
  app.save(contentReports)
}, (app) => {
  // Down: quitar los campos nuevos y volver content_reports a su set original.
  const profileReports = app.findCollectionByNameOrId("pbc_9002310000")
  profileReports.fields.removeById("select9002310010")
  app.save(profileReports)

  const businessReports = app.findCollectionByNameOrId("pbc_8823401200")
  businessReports.fields.removeById("select8823401210")
  app.save(businessReports)

  const contentReports = app.findCollectionByNameOrId("pbc_9002700012")
  const statusField = contentReports.fields.getById("select9002700126")
  statusField.values = ["pending", "reviewed", "dismissed"]
  app.save(contentReports)
})
