/// <reference path="../pb_data/types.d.ts" />

// Fase 0 -- SEED inicial de los catálogos (rubros, puestos, tareas) con la lista
// ampliada del pedido. Es data de CATÁLOGO (no de usuario): segura y aditiva. De
// acá en más se agregan/editan rubros/puestos/tareas desde el admin SIN
// migraciones. Idempotente: si un slug ya existe, lo saltea.
migrate((app) => {
  function upsert(colName, rows) {
    const col = app.findCollectionByNameOrId(colName)
    rows.forEach((r, i) => {
      let existing = null
      try { existing = app.findFirstRecordByData(colName, "slug", r.slug) } catch (e) { existing = null }
      if (existing) return
      const rec = new Record(col)
      rec.set("slug", r.slug)
      rec.set("label", r.label)
      if (r.group !== undefined) rec.set("group", r.group)
      if (r.category !== undefined) rec.set("category", r.category)
      rec.set("sort", r.sort !== undefined ? r.sort : i)
      rec.set("active", true)
      app.save(rec)
    })
  }

  // RUBROS (sectores). El campo `categories` de candidate_profiles sigue con su
  // select granular actual (compat); estos son para experiencias y el picker nuevo.
  upsert("job_categories", [
    { slug: "gastronomia", label: "Gastronomía" },
    { slug: "comercio", label: "Comercio" },
    { slug: "administracion", label: "Administración" },
    { slug: "logistica", label: "Logística" },
    { slug: "salud", label: "Salud" },
    { slug: "construccion", label: "Construcción" },
    { slug: "limpieza", label: "Limpieza" },
    { slug: "tecnologia", label: "Tecnología" },
    { slug: "seguridad", label: "Seguridad" },
    { slug: "cuidado", label: "Cuidado de personas" },
    { slug: "mantenimiento", label: "Mantenimiento" },
    { slug: "oficios", label: "Oficios" },
    { slug: "otros", label: "Otros" },
  ])

  // PUESTOS por rubro (category = slug del rubro).
  upsert("job_roles", [
    // Gastronomía
    { slug: "mozo", label: "Mozo/a", category: "gastronomia" },
    { slug: "barista", label: "Barista", category: "gastronomia" },
    { slug: "cocina", label: "Cocina", category: "gastronomia" },
    { slug: "ayudante_cocina", label: "Ayudante de cocina", category: "gastronomia" },
    { slug: "bachero", label: "Bachero/a", category: "gastronomia" },
    { slug: "cajero_gastronomico", label: "Cajero/a gastronómico", category: "gastronomia" },
    { slug: "delivery", label: "Delivery", category: "gastronomia" },
    { slug: "pasteleria", label: "Pastelería", category: "gastronomia" },
    { slug: "panaderia", label: "Panadería", category: "gastronomia" },
    { slug: "cafeteria", label: "Cafetería", category: "gastronomia" },
    // Comercio
    { slug: "atencion_publico", label: "Atención al público", category: "comercio" },
    { slug: "caja", label: "Caja", category: "comercio" },
    { slug: "ventas", label: "Ventas", category: "comercio" },
    { slug: "reposicion", label: "Reposición", category: "comercio" },
    { slug: "encargado", label: "Encargado/a", category: "comercio" },
    { slug: "supervisor", label: "Supervisor/a", category: "comercio" },
    { slug: "compras", label: "Compras", category: "comercio" },
    // Administración
    { slug: "administrativo", label: "Administrativo/a", category: "administracion" },
    { slug: "recepcion", label: "Recepción", category: "administracion" },
    { slug: "secretaria", label: "Secretaría", category: "administracion" },
    { slug: "rrhh", label: "RRHH", category: "administracion" },
    { slug: "facturacion", label: "Facturación", category: "administracion" },
    { slug: "tesoreria", label: "Tesorería", category: "administracion" },
    { slug: "cobranzas", label: "Cobranzas", category: "administracion" },
    { slug: "data_entry", label: "Data entry", category: "administracion" },
    // Logística
    { slug: "chofer", label: "Chofer", category: "logistica" },
    { slug: "reparto", label: "Reparto", category: "logistica" },
    { slug: "deposito", label: "Depósito", category: "logistica" },
    { slug: "picking", label: "Picking", category: "logistica" },
    { slug: "expedicion", label: "Expedición", category: "logistica" },
    { slug: "autoelevador", label: "Autoelevador", category: "logistica" },
    // Salud
    { slug: "enfermeria", label: "Enfermería", category: "salud" },
    { slug: "cuidador", label: "Cuidador/a", category: "salud" },
    { slug: "acompanante_terapeutico", label: "Acompañante terapéutico", category: "salud" },
    { slug: "recepcion_medica", label: "Recepción médica", category: "salud" },
    // Construcción
    { slug: "albanil", label: "Albañil", category: "construccion" },
    { slug: "electricista", label: "Electricista", category: "construccion" },
    { slug: "plomero", label: "Plomero", category: "construccion" },
    { slug: "pintor", label: "Pintor", category: "construccion" },
    { slug: "soldador", label: "Soldador", category: "construccion" },
    { slug: "carpintero", label: "Carpintero", category: "construccion" },
    // Limpieza
    { slug: "limpieza_general", label: "Limpieza general", category: "limpieza" },
    { slug: "mucama", label: "Mucama", category: "limpieza" },
    { slug: "maestranza", label: "Maestranza", category: "limpieza" },
    // Tecnología
    { slug: "soporte_it", label: "Soporte IT", category: "tecnologia" },
    { slug: "programacion", label: "Programación", category: "tecnologia" },
    { slug: "diseno_ux", label: "Diseño UX/UI", category: "tecnologia" },
    { slug: "qa", label: "QA", category: "tecnologia" },
    { slug: "marketing_digital", label: "Marketing digital", category: "tecnologia" },
  ])

  // TAREAS/skills (starter, se amplía sin migración). category vacía = genérica.
  upsert("tasks", [
    { slug: "atencion_cliente", label: "Atención al cliente", category: "" },
    { slug: "trabajo_equipo", label: "Trabajo en equipo", category: "" },
    { slug: "manejo_caja", label: "Manejo de caja", category: "comercio" },
    { slug: "cobro_arqueo", label: "Cobro y arqueo", category: "comercio" },
    { slug: "reposicion_mercaderia", label: "Reposición de mercadería", category: "comercio" },
    { slug: "control_stock", label: "Control de stock / inventario", category: "comercio" },
    { slug: "preparacion_alimentos", label: "Preparación de alimentos", category: "gastronomia" },
    { slug: "armado_pedidos", label: "Armado de pedidos", category: "gastronomia" },
    { slug: "cafeteria_barra", label: "Cafetería / barra", category: "gastronomia" },
    { slug: "manejo_autoelevador", label: "Manejo de autoelevador", category: "logistica" },
    { slug: "picking_packing", label: "Picking y packing", category: "logistica" },
    { slug: "carga_descarga", label: "Carga y descarga", category: "logistica" },
    { slug: "manejo_vehiculo", label: "Manejo de vehículo", category: "logistica" },
    { slug: "facturacion_tarea", label: "Facturación", category: "administracion" },
    { slug: "uso_pc", label: "Uso de PC / office", category: "administracion" },
    { slug: "limpieza_orden", label: "Limpieza y orden", category: "limpieza" },
    { slug: "cuidado_personas", label: "Cuidado de personas", category: "salud" },
  ])
}, (app) => {
  // Rollback: vaciar los catálogos (solo data de catálogo).
  ["job_categories", "job_roles", "tasks"].forEach((name) => {
    try {
      const recs = app.findAllRecords(name)
      recs.forEach((r) => app.delete(r))
    } catch (e) { /* colección ya borrada por otra down-migration */ }
  })
})
