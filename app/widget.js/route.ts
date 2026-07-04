export const dynamic = "force-dynamic";

// Widget embebible: <script src="https://tucv.ar/widget.js" data-city="cordoba"></script>
// Renderiza búsquedas activas de la zona + CTA "Crear mi perfil". Todo vanilla,
// estilos inline (no depende de CSS del sitio anfitrión), y toma el origen del
// propio src del script para que funcione en cualquier dominio. Solo lee la API
// pública de búsquedas (nunca datos de postulantes).
const WIDGET_JS = `(function () {
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;
  var city = script.getAttribute("data-city") || "";
  var limit = script.getAttribute("data-limit") || "5";

  var box = document.createElement("div");
  box.style.cssText = "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;border:2px solid #1c1917;border-radius:8px;padding:16px;background:#faf7f2;color:#1c1917;";
  script.parentNode.insertBefore(box, script.nextSibling);

  var head = document.createElement("div");
  head.style.cssText = "font-weight:700;font-size:15px;margin-bottom:10px;";
  head.textContent = "Búsquedas de laburo cerca tuyo";
  box.appendChild(head);

  var list = document.createElement("div");
  list.textContent = "Cargando...";
  list.style.cssText = "font-size:13px;color:#57534e;";
  box.appendChild(list);

  fetch(origin + "/api/public/jobs?city=" + encodeURIComponent(city) + "&limit=" + encodeURIComponent(limit))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      list.textContent = "";
      var jobs = (data && data.jobs) || [];
      if (!jobs.length) {
        list.textContent = "No hay búsquedas activas en esta zona ahora.";
      } else {
        jobs.forEach(function (j) {
          var a = document.createElement("a");
          a.href = j.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.style.cssText = "display:block;text-decoration:none;color:#1c1917;padding:8px 10px;border:1px solid #e7e2d9;border-radius:6px;margin-bottom:6px;";
          a.innerHTML = "<strong>" + escapeHtml(j.title) + "</strong><br><span style='color:#57534e;font-size:12px;'>" + escapeHtml(j.categoryLabel) + " · " + escapeHtml(j.zone || "") + "</span>";
          list.appendChild(a);
        });
      }
      var cta = document.createElement("a");
      cta.href = origin + "/postulante/nuevo";
      cta.target = "_blank";
      cta.rel = "noopener";
      cta.textContent = "Crear mi perfil gratis";
      cta.style.cssText = "display:inline-block;margin-top:8px;background:#1c1917;color:#faf7f2;font-weight:700;font-size:13px;text-decoration:none;padding:10px 16px;border-radius:6px;";
      box.appendChild(cta);

      var by = document.createElement("div");
      by.style.cssText = "margin-top:8px;font-size:11px;color:#a8a29e;";
      by.innerHTML = "vía <a href='" + origin + "' target='_blank' rel='noopener' style='color:#a8a29e;'>TuCV</a>";
      box.appendChild(by);
    })
    .catch(function () { list.textContent = "No se pudieron cargar las búsquedas."; });

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();`;

export async function GET() {
  return new Response(WIDGET_JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
