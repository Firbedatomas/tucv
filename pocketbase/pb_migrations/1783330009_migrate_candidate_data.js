/// <reference path="../pb_data/types.d.ts" />

// Fase 1 -- MIGRACIÓN DE DATOS (no destructiva, idempotente). Convierte los JSON
// category_experience / studies de cada perfil a filas relacionales y calcula el
// cache. Los JSON viejos NO se tocan (quedan read-only de respaldo). Idempotente:
// si un perfil ya tiene experiencias migradas, lo saltea. Reversible: el down
// borra las filas creadas y limpia el cache.
migrate((app) => {
  const CAT_LABELS = {
    atencion: "Atención al público", ventas: "Ventas", caja: "Caja", reposicion: "Reposición",
    limpieza: "Limpieza", deposito: "Depósito", reparto: "Reparto", seguridad: "Seguridad",
    cuidado: "Cuidado de personas", construccion: "Construcción", mantenimiento: "Mantenimiento",
    taller_oficio: "Taller / oficio", cocina: "Cocina", moza_mozo: "Moza/o", barista: "Barista",
    administracion_basica: "Administración básica", produccion_operario: "Producción / operario",
    jardineria: "Jardinería", pintura: "Pintura", plomeria: "Plomería", electricidad: "Electricidad",
    peluqueria_estetica: "Peluquería / estética", eventos: "Eventos", recepcion_conserje: "Recepción / conserje",
    chofer: "Chofer", delivery_moto: "Delivery en moto", ninera: "Niñera/o", costura: "Costura",
    panaderia: "Panadería", otro: "Otro",
  }
  const EXP_LABELS = {
    sin_experiencia: "Sin experiencia", menos_6_meses: "Menos de 6 meses",
    "6_a_12_meses": "6 a 12 meses", "1_a_3_anos": "1 a 3 años", mas_3_anos: "Más de 3 años",
  }
  const BUCKET_MONTHS = { sin_experiencia: 0, menos_6_meses: 3, "6_a_12_meses": 9, "1_a_3_anos": 24, mas_3_anos: 48 }
  const STUDY_LABELS = { primario: "Primario", secundario: "Secundario", terciario: "Terciario", universitario: "Universitario" }
  const CURRENT_YEAR = 2026

  const cweCol = app.findCollectionByNameOrId("candidate_work_experiences")
  const cedCol = app.findCollectionByNameOrId("candidate_education")

  const profiles = app.findAllRecords("candidate_profiles")
  for (let pi = 0; pi < profiles.length; pi++) {
    const p = profiles[pi]
    const pid = p.id

    // idempotencia: si ya tiene experiencias migradas, saltear
    let already = []
    try { already = app.findRecordsByFilter("candidate_work_experiences", "candidate_profile = {:pid}", "", 1, 0, { pid: pid }) } catch (e) { already = [] }
    if (already && already.length > 0) continue

    let ce = []
    try { ce = JSON.parse(p.get("category_experience") || "[]") } catch (e) { ce = [] }
    let studies = []
    try { studies = JSON.parse(p.get("studies") || "[]") } catch (e) { studies = [] }

    const summary = [] // {category, job_title, months, is_current, end_year}
    let sort = 0
    if (Array.isArray(ce)) {
      for (let i = 0; i < ce.length; i++) {
        const e = ce[i] || {}
        const hasData = !!(e.company || e.company_id || e.start_year || e.is_current || (e.experience && e.experience !== "sin_experiencia"))
        if (!hasData) continue // solo-deseado: queda como rubro en `categories`, no como experiencia
        const rec = new Record(cweCol)
        rec.set("candidate_profile", pid)
        rec.set("category", e.category || "")
        rec.set("job_title", CAT_LABELS[e.category] || e.category || "")
        rec.set("company_name", e.company || "")
        if (e.company_id) rec.set("company", e.company_id)
        if (e.start_year) rec.set("start_year", e.start_year)
        if (e.end_year) rec.set("end_year", e.end_year)
        rec.set("currently_working", !!e.is_current)
        rec.set("sort_order", sort++)
        app.save(rec)

        let months, startAbs = null, endAbs = null
        if (e.start_year) {
          const end = Math.max(e.is_current ? CURRENT_YEAR : (e.end_year || e.start_year), e.start_year)
          startAbs = e.start_year * 12
          endAbs = end * 12
          months = Math.max(1, endAbs - startAbs)
        } else {
          months = BUCKET_MONTHS[e.experience] || 0
        }
        summary.push({ category: e.category || "", job_title: CAT_LABELS[e.category] || e.category || "", months: months, is_current: !!e.is_current, end_year: e.is_current ? CURRENT_YEAR : (e.end_year || e.start_year || 0), startAbs: startAbs, endAbs: endAbs })
      }
    }

    // Experiencia legacy/resumen si no se generó ninguna estructurada pero hay
    // señal de trayectoria previa (experiencia global o bio).
    let legacy = false
    const globalExp = p.get("experience") || ""
    const bio = (p.get("bio") || "").toString()
    if (summary.length === 0 && ((globalExp && globalExp !== "sin_experiencia") || bio)) {
      const rec = new Record(cweCol)
      rec.set("candidate_profile", pid)
      rec.set("job_title", "Experiencia previa")
      rec.set("category", "")
      rec.set("description", bio || ("Experiencia previa: " + (EXP_LABELS[globalExp] || globalExp)))
      rec.set("sort_order", 0)
      app.save(rec)
      summary.push({ category: "", job_title: "Experiencia previa", months: BUCKET_MONTHS[globalExp] || 0, is_current: false, end_year: 0, startAbs: null, endAbs: null })
      legacy = true
    }

    if (Array.isArray(studies)) {
      for (let i = 0; i < studies.length; i++) {
        const s = studies[i] || {}
        if (!s.level) continue
        const rec = new Record(cedCol)
        rec.set("candidate_profile", pid)
        rec.set("title", STUDY_LABELS[s.level] || s.level)
        rec.set("level", s.level)
        rec.set("status", s.status === "incompleto" ? "en_curso" : "completo")
        if (s.institution) rec.set("institution", s.institution)
        app.save(rec)
      }
    }

    // Cache. Los años de experiencia se calculan como la UNIÓN de los intervalos
    // con fecha (para NO inflar cuando hay trabajos solapados: 3 empleos
    // 2015-2026 son 11 años reales, no 33) + los sin fecha se suman por su bucket.
    const cats = {}
    for (let i = 0; i < summary.length; i++) {
      if (summary[i].category) cats[summary[i].category] = (cats[summary[i].category] || 0) + 1
    }
    const dated = summary.filter(function (s) { return s.startAbs != null }).map(function (s) { return [s.startAbs, s.endAbs] }).sort(function (a, b) { return a[0] - b[0] })
    let unionMonths = 0, curS = null, curE = null
    for (let i = 0; i < dated.length; i++) {
      const iv = dated[i]
      if (curS === null) { curS = iv[0]; curE = iv[1] }
      else if (iv[0] <= curE) { if (iv[1] > curE) curE = iv[1] }
      else { unionMonths += (curE - curS); curS = iv[0]; curE = iv[1] }
    }
    if (curS !== null) unionMonths += (curE - curS)
    let undatedMonths = 0
    for (let i = 0; i < summary.length; i++) { if (summary[i].startAbs == null) undatedMonths += summary[i].months }
    const totalMonths = unionMonths + undatedMonths
    const dominant = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a] }).slice(0, 4)
    let latest = ""
    let latestRank = -1
    for (let i = 0; i < summary.length; i++) {
      const rank = summary[i].is_current ? 999999 : summary[i].end_year
      if (rank >= latestRank) { latestRank = rank; latest = summary[i].job_title }
    }
    p.set("total_experience_months", totalMonths)
    p.set("work_experience_count", summary.length)
    p.set("dominant_categories", dominant)
    p.set("dominant_tasks", [])
    p.set("latest_job_title", latest)
    p.set("has_current_job", summary.some(function (e) { return e.is_current }))
    app.save(p)
  }
}, (app) => {
  // Rollback: borrar filas migradas + limpiar cache. No toca los JSON viejos.
  const names = ["candidate_experience_tasks", "candidate_work_experiences", "candidate_education", "candidate_languages"]
  for (let i = 0; i < names.length; i++) {
    try {
      const recs = app.findAllRecords(names[i])
      for (let j = 0; j < recs.length; j++) app.delete(recs[j])
    } catch (e) { /* colección ya borrada */ }
  }
  try {
    const profiles = app.findAllRecords("candidate_profiles")
    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i]
      p.set("total_experience_months", 0)
      p.set("work_experience_count", 0)
      p.set("dominant_categories", [])
      p.set("dominant_tasks", [])
      p.set("latest_job_title", "")
      p.set("has_current_job", false)
      app.save(p)
    }
  } catch (e) { /* campos cache ya removidos por la down de Fase 0 */ }
})
