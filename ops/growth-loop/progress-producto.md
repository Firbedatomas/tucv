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
