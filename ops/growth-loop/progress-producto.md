# Progreso del loop de producto

Memoria narrativa del loop. Cada corrida de `scripts/product-loop.sh` agrega una
entrada con la evidencia del día y los hallazgos que superaron el piso.

**Para qué existe este archivo:** las tablas dicen *qué pasó*; esto dice *qué se
intentó y qué no funcionó*. Sin esa segunda parte, un loop repite el mismo
intento fallido cada iteración sin darse cuenta. La sección "Qué se hizo con
esto" se completa a mano (o por un agente, cuando el loop tenga manos) — es la
parte que hace que la próxima corrida arranque sabiendo más que la anterior.

**Estado actual: FASE DE OBSERVACIÓN.** El loop solo lee y avisa. No toca
código, no abre PRs, no modifica datos. Subir el nivel de autonomía es una
decisión explícita, y el playbook pide tomarla recién con evidencia de que el
detector acierta en este dominio.

## Contexto de arranque (2026-07-24)

El cuello del negocio no es tráfico: es que las empresas publiquen, vuelvan y
paguen. Por eso este loop existe antes que el de SEO — el de SEO optimizaría el
lado postulante, que ya funciona, mientras que el problema real está del lado
empresa.

Reglas del detector en `lib/intelligence/product-signals.ts`, con piso de
evidencia de 5 unidades: por debajo de eso cualquier porcentaje es ruido (con 3
negocios, "el 100% no activó" no significa nada).

Lo que se mira hoy:

- **Activación**: negocios registrados hace +7 días que nunca publicaron.
- **Retención**: negocios que publicaron una sola vez hace +30 días y no volvieron.
- **Valor entregado**: búsquedas que vencieron sin recibir ni una postulación.
- **Embudo del reclutador**: entra al panel de candidatos pero no contacta a nadie.
- **Embudo de captación**: ve una empresa sembrada pero no completa el reclamo.
- **Perfiles incompletos** (único del lado postulante: un perfil a medias no le
  sirve a la empresa, así que resta de los dos lados).

## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [alta] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- Primera corrida del loop. NO se tocó producto: se corrigió el DETECTOR.
- **Qué no funcionó:** marcó tres hallazgos como severidad "alta" sobre muestras
  de 5 negocios y 7 visitas. El piso de evidencia (5) filtraba lo absurdo pero
  dejaba pasar lo anecdótico como si fuera concluyente. Se agregó un tope: por
  debajo de 20 unidades nada llega a "alta" y se marca `muestraChica`.
- Se verificó que los conteos no estén truncados por paginación (100 perfiles es
  el total real, contrastado contra PocketBase).

## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [media] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. _(muestra chica: cualitativo, no estadístico)_ → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [media] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). _(muestra chica: cualitativo, no estadístico)_ → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- Corrida posterior al arreglo del detector. Queda UN hallazgo con muestra
  suficiente: el embudo de captación (39 vistas → 0 reclamos completados).
- Ese es el que importa: es el mecanismo pensado para resolver el cuello real
  del negocio (conseguir empresas) y hoy no cierra el círculo. De 39 vistas, 8
  marcaron "me interesa", 1 llegó a la pantalla de reclamo y 0 lo completaron.
- **Próxima acción sugerida:** entender la caída entre `sourced_me_interesa` (8)
  y `sourced_reclamar_ver` (1). Ahí se pierde el 87% y es el paso más barato de
  arreglar, porque el interés del candidato ya existe.
- Los otros dos hallazgos quedan en observación hasta tener más volumen: con 5
  negocios no se puede distinguir un problema de producto de la casualidad.


## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **Hay interés de candidatos que nadie usó para contactar al negocio** (empresa) — 19 negocios sembrados tienen candidatos interesados y NINGUNO de los 986 sembrados fue contactado (todos siguen en "detected"). → El embudo no se corta por un problema de producto: el paso de contactar es manual y no se está haciendo. Está en /admin/captacion, que ya trae el mensaje y el link de WhatsApp listos.
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [media] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. _(muestra chica: cualitativo, no estadístico)_ → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [media] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). _(muestra chica: cualitativo, no estadístico)_ → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- Se investigó la caída 8 -> 1 del embudo de captación. **No era un problema de
  UX**: `sourced_me_interesa` lo dispara el CANDIDATO y `sourced_reclamar_ver` el
  DUEÑO del negocio. Entre los dos hay un paso manual (contactar) que nunca se dio.
- **El dato duro:** 986 sembrados, los 986 en estado "detected". Cero contactados,
  cero reclamados. El panel /admin/captacion ya existía con mensaje y link de
  WhatsApp listos, pero listaba las 986 filas sin ordenar: los leads calientes
  estaban enterrados.
- Se ordenó la cola por interés real (lib/sourced-priority.ts) y se agregó la
  señal `captacion-sin-contactar` al detector para que esto no vuelva a pasar
  desapercibido.
- **Qué NO se hizo, y por qué:** no se automatizó el contacto en frío. Dos motivos.
  (1) Solo 19 de 500 sembrados tienen email; el canal viable es WhatsApp (398 con
  teléfono), que no se puede automatizar sin riesgo de bloqueo. (2) Mandar mail
  frío desde el mismo dominio/cuenta de Resend que usan los emails
  transaccionales puede quemar la reputación de envío y romper lo que hoy
  funciona (avisos de postulación, vencimientos).
- **Hallazgo pendiente de decisión:** los sembrados con interés son en su mayoría
  CADENAS (YPF, Coto, Topper, Kevingston, Smart Fit, Juan Valdez), no el cliente
  objetivo de TuCV (comercios y pymes locales). Google Places devuelve primero lo
  más prominente. Aunque el outreach fuera perfecto, se le estaría ofreciendo una
  herramienta de contratación local a la casa central de Coto. El cuello puede no
  estar en el contacto sino en A QUIÉN se está sembrando.

## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [media] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. _(muestra chica: cualitativo, no estadístico)_ → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [media] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). _(muestra chica: cualitativo, no estadístico)_ → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- (a completar: qué se probó, qué funcionó, qué NO funcionó)

## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [media] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. _(muestra chica: cualitativo, no estadístico)_ → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [media] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). _(muestra chica: cualitativo, no estadístico)_ → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- (a completar: qué se probó, qué funcionó, qué NO funcionó)

## 2026-07-24
**Evidencia**
- Negocios: 5 total · 3 nunca publicaron · 0 publicaron una vez y no volvieron · 1 en plan pago
- Búsquedas: 2 activas · 2 vencidas (30d) · 2 de esas sin ninguna postulación
- Postulantes: 100 total · 39 incompletos
- Objetivos (30d): recruiter_panel=7, sourced_me_interesa=8, sourced_reclamar_ver=1, sourced_ver=39

**Hallazgos**
- [alta] **Hay interés de candidatos que nadie usó para contactar al negocio** (empresa) — 19 negocios sembrados tienen candidatos interesados y NINGUNO de los 986 sembrados fue contactado (todos siguen en "detected"). → El embudo no se corta por un problema de producto: el paso de contactar es manual y no se está haciendo. Está en /admin/captacion, que ya trae el mensaje y el link de WhatsApp listos.
- [alta] **La captación de empresas no cierra el círculo** (empresa) — 39 vistas de empresas sembradas y solo 0 reclamos completados (se pierde el 100%). → Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.
- [media] **Negocios que se registran y nunca publican** (empresa) — 3 de 5 negocios (60%) se registraron hace más de 7 días y nunca publicaron una búsqueda. _(muestra chica: cualitativo, no estadístico)_ → Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.
- [media] **El reclutador entra al panel de candidatos pero no contacta** (empresa) — 7 entraron a /empresa/candidatos y solo 0 contactaron a alguien (se pierde el 100%). _(muestra chica: cualitativo, no estadístico)_ → Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.
- [baja] **Perfiles de postulante que quedan a medio completar** (postulante) — 39 de 100 perfiles (39%) están incompletos. → Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.

**Qué se hizo con esto**
- (a completar: qué se probó, qué funcionó, qué NO funcionó)
