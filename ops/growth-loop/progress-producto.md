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
- (a completar: qué se probó, qué funcionó, qué NO funcionó)
