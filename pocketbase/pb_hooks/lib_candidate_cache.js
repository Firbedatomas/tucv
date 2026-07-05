/// <reference path="../pb_data/types.d.ts" />

// Fase 2 -- lógica ÚNICA de recálculo del cache del perfil laboral, compartida
// por los hooks (candidate_work_experiences / candidate_experience_tasks) vía
// require(). PocketBase corre los hooks aislados, pero require() sí funciona
// dentro del callback (verificado), así que esto evita duplicar la lógica.
// Fuente de verdad: las colecciones relacionales. Los años se calculan como la
// UNIÓN de los intervalos con fecha (no la suma) para no inflar con trabajos
// solapados. El `experience` global se deriva para compatibilidad (cards/espejo/
// matching viejos) y nunca degrada: solo se toca si el perfil tiene experiencias.

function monthsToBucket(m) {
  if (!m || m <= 0) return "sin_experiencia"
  if (m < 6) return "menos_6_meses"
  if (m < 12) return "6_a_12_meses"
  if (m < 36) return "1_a_3_anos"
  return "mas_3_anos"
}

function recompute(app, candidateId) {
  if (!candidateId) return
  let profile
  try { profile = app.findRecordById("candidate_profiles", candidateId) } catch (e) { return }
  if (!profile) return

  let exps = []
  try { exps = app.findRecordsByFilter("candidate_work_experiences", "candidate_profile = {:id}", "sort_order", 300, 0, { id: candidateId }) } catch (e) { exps = [] }
  let tasks = []
  try { tasks = app.findRecordsByFilter("candidate_experience_tasks", "candidate_profile = {:id}", "", 800, 0, { id: candidateId }) } catch (e) { tasks = [] }

  const CURRENT_YEAR = new Date().getFullYear()
  const intervals = []
  const catFreq = {}
  let hasCurrent = false
  let latestTitle = ""
  let latestRank = -1

  for (let i = 0; i < exps.length; i++) {
    const e = exps[i]
    const cat = e.get("category")
    if (cat) catFreq[cat] = (catFreq[cat] || 0) + 1
    const sy = e.get("start_year")
    const cur = !!e.get("currently_working")
    if (cur) hasCurrent = true
    if (sy) {
      const ey = cur ? CURRENT_YEAR : (e.get("end_year") || sy)
      const sAbs = sy * 12 + ((e.get("start_month") || 1) - 1)
      const eAbs = Math.max(ey * 12 + ((e.get("end_month") || 12) - 1), sAbs)
      intervals.push([sAbs, eAbs])
    }
    const rank = cur ? 9999999 : (e.get("end_year") || e.get("start_year") || 0)
    if (rank >= latestRank) { latestRank = rank; if (e.get("job_title")) latestTitle = e.get("job_title") }
  }

  intervals.sort(function (a, b) { return a[0] - b[0] })
  let union = 0, cs = null, ce = null
  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i]
    if (cs === null) { cs = iv[0]; ce = iv[1] }
    else if (iv[0] <= ce) { if (iv[1] > ce) ce = iv[1] }
    else { union += (ce - cs); cs = iv[0]; ce = iv[1] }
  }
  if (cs !== null) union += (ce - cs)

  const dominantCats = Object.keys(catFreq).sort(function (a, b) { return catFreq[b] - catFreq[a] }).slice(0, 4)
  const taskFreq = {}
  for (let i = 0; i < tasks.length; i++) {
    const tk = tasks[i].get("task")
    if (tk) taskFreq[tk] = (taskFreq[tk] || 0) + 1
  }
  const dominantTasks = Object.keys(taskFreq).sort(function (a, b) { return taskFreq[b] - taskFreq[a] }).slice(0, 6)

  profile.set("total_experience_months", union)
  profile.set("work_experience_count", exps.length)
  profile.set("dominant_categories", dominantCats)
  profile.set("dominant_tasks", dominantTasks)
  profile.set("latest_job_title", latestTitle)
  profile.set("has_current_job", hasCurrent)
  // Compatibilidad: solo derivamos `experience` global si hay experiencias, para
  // no degradar a "sin_experiencia" perfiles que aún no cargaron fechas.
  if (exps.length > 0) profile.set("experience", monthsToBucket(union))

  app.save(profile)
}

module.exports = { recompute, monthsToBucket }
