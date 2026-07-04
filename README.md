# TuCV

App web para trabajos de cercanía: la persona carga su perfil laboral **una sola vez** y se
postula a búsquedas de su zona escaneando un QR o abriendo un link. El empleador genera esa
búsqueda, comparte el QR/link, y ve a los postulantes ordenados en un panel — sin recibir CVs
sueltos por mail, WhatsApp o papel.

No es LinkedIn ni un ATS: es un perfil simple, en criollo, para comercio, servicios, limpieza,
depósito, logística, reparto, construcción, mantenimiento, cuidado, seguridad, ventas, atención,
talleres, producción, administración básica, hotelería, gastronomía y oficios.

> Estado: **MVP**. Pensado para probarse primero en local/staging. El dominio `tucv.ar` todavía
> no está delegado a ningún DNS (ver [checklist de DNS](#checklist-de-dns-tucvar) más abajo).

---

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **PocketBase** (DB + auth + storage de archivos), dedicada a este proyecto
- Sin backend propio aparte de Next: PocketBase se consume directo desde el browser (con reglas
  de acceso por colección) y hay una única ruta server-side (`/api/public-job/[slug]`) para
  resolver la búsqueda pública por slug sin abrir un directorio público de búsquedas.

---

## 1. Instalar

Requisitos: **Node.js 20+**, **pnpm** (`corepack enable` si no lo tenés).

```bash
cd tucv
pnpm install
```

## 2. Variables de entorno

Copiá el ejemplo que corresponda:

```bash
cp .env.local.example .env.local      # desarrollo
# o, en el servidor de producción:
cp .env.production.example .env
```

| Variable | Descripción | Default local |
|---|---|---|
| `NEXT_PUBLIC_POCKETBASE_URL` | URL pública de PocketBase (la usa el navegador directo). | `http://127.0.0.1:8092` |
| `NEXT_PUBLIC_BASE_URL` | Dominio/URL base del sitio (arma los links/QR públicos de cada búsqueda). | `http://localhost:3000` |
| `POCKETBASE_URL` | Solo la usan los scripts (`seed.js`) y la ruta server `/api/public-job/[slug]` (vía `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD`), no el navegador. | `http://127.0.0.1:8092` |
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | Superusuario de PocketBase. Lo usan `scripts/seed.js` y la ruta `/api/public-job/[slug]` para resolver la búsqueda pública por slug sin exponer `job_posts.listRule` (que está restringido al dueño). **Sin esto seteado en producción, `/b/[slug]` responde 404 siempre.** | `admin@tucv.local` / `TucvAdmin123!` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth2 de Google Cloud Console, las lee el hook `onBootstrap` de PocketBase (`pb_hooks/main.pb.js`) para habilitar "Ingresar con Google" (login único, sin contraseña). | — |
| `GOOGLE_MAPS_API_KEY` | Habilita el autocompletado de direcciones (Places API) en todos los campos de zona/dirección. La usa `/api/places-autocomplete` server-side — nunca se expone al navegador. Sin esto, esos campos siguen funcionando como texto libre. | — |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel) (credenciales de prueba para testear, de producción para cobrar de verdad). Lo usan `/api/mercadopago/checkout` (crea la preferencia de pago) y `/api/mercadopago/webhook` (verifica el pago antes de activar el plan). **Sin esto, los botones de pago muestran un error claro en vez de romper el resto del sitio.** | — |
| `MERCADOPAGO_PLAN_PRO_PRICE` | Precio del plan Pro en ARS/mes (búsquedas activas ilimitadas + auto-boost). | `9900` |
| `MERCADOPAGO_JOB_BOOST_PRICE` | Precio de destacar una búsqueda puntual en ARS (pago único, 7 días). | `4900` |
| `MERCADOPAGO_MULTI_LOCAL_PRICE` | Precio del plan Multi-sucursal/Franquicias en ARS/mes (hasta 10 búsquedas activas + auto-boost). | `39900` |
| `MERCADOPAGO_JOB_EXTEND_PRICE` | Precio de extender 15 días una búsqueda del plan gratis ya vencida, en ARS (pago único, mismo slug/QR). | `4900` |
| `GOOGLE_SITE_VERIFICATION` | Token de verificación de [Google Search Console](https://search.google.com/search-console) (agregar propiedad `tucv.ar` → método "etiqueta HTML" → copiar el `content="..."`). Sin esto seteado, no se agrega el meta tag y la propiedad queda sin verificar. | *(sin default)* |
| `BING_SITE_VERIFICATION` | Token de verificación de [Bing Webmaster Tools](https://www.bing.com/webmasters) (mismo mecanismo, o "importar desde Google Search Console" una vez verificado ahí). | *(sin default)* |

> ⚠️ **En Docker, `POCKETBASE_URL` tiene que ser `http://tucv-pb:8090`** (el nombre del servicio
> en la red interna de Docker), no `127.0.0.1` — desde adentro del contenedor `app`, `127.0.0.1`
> es el propio contenedor, no PocketBase. `.env.production.example` ya lo trae así. Si corrés
> `scripts/seed.js` a mano desde el host (fuera de Docker), ahí sí pisala con
> `POCKETBASE_URL=http://127.0.0.1:8092` (el puerto publicado al host).

> ⚠️ **`NEXT_PUBLIC_*` se hornea en el build** de la imagen Docker (no alcanza con cambiarlas en
> el `.env` de un contenedor ya buildeado — hay que volver a `docker compose build`). Ver
> `Dockerfile` / `docker-compose*.yml`.

## 3. Correr en local

**Paso 1 — PocketBase** (crea el superusuario la primera vez, si no existe):

```bash
./pocketbase/pocketbase superuser create admin@tucv.local "TucvAdmin123!" --dir=pocketbase/pb_data
pnpm pb
```

Esto sirve la API en `http://127.0.0.1:8092` y aplica las migraciones de
`pocketbase/pb_migrations/` automáticamente (no hace falta correr nada más para crear las
colecciones). El panel admin de PocketBase queda en `http://127.0.0.1:8092/_/`.

**Paso 2 — datos de ejemplo** (opcional pero recomendado la primera vez):

```bash
pnpm seed
```

Crea 1 empleador, 2 búsquedas y 10 postulantes (con algunas postulaciones ya cargadas). Es
**idempotente**: correrlo de nuevo no duplica nada. Al final imprime el email/contraseña del
empleador demo para loguearte en `/empresa/login`.

**Paso 3 — Next.js:**

```bash
pnpm dev
```

Abrí `http://localhost:3000`.

## 4. Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Corre Next.js en modo desarrollo. |
| `pnpm build` / `pnpm start` | Build de producción / lo sirve. |
| `pnpm lint` | ESLint sobre el código de la app (no sobre `pocketbase/`, que son scripts JSVM propios de PocketBase). |
| `pnpm pb` | Levanta PocketBase local en `127.0.0.1:8092`, aplicando migraciones y hooks. |
| `pnpm seed` | Carga los datos de ejemplo (1 empleador / 2 búsquedas / 10 postulantes). |

---

## 5. Esquema de PocketBase

Las colecciones viven como migraciones versionadas en `pocketbase/pb_migrations/` (se generaron
una vez contra una instancia limpia con `scripts/pb-create-collections.mjs`, que queda como
referencia — no hace falta volver a correrlo en un clon del repo).

| Colección | Qué guarda | Quién puede crear / ver / editar |
|---|---|---|
| `users` | Cuenta de login de cada **empleador** (auth built-in de PocketBase). Los postulantes NO tienen cuenta. | Registro público; cada uno ve/edita la suya. |
| `business_accounts` | Perfil del negocio (`business_name`, `phone`, `city_zone`), 1:1 con `users`. `plan` (select `free`/`pro`, default vacío = `free`): gatea los filtros de sexo/edad (además del flag global `NEXT_PUBLIC_FEATURE_FILTERS_GENDER_AGE`). No hay cobro automático todavía — el plan se sube a mano desde el admin de PocketBase. | El dueño (`user = @request.auth.id`) puede editar su propio registro, **pero no el campo `plan`**: un hook server-side (`onRecordCreateRequest`/`onRecordUpdateRequest` en `main.pb.js`) revierte cualquier cambio a `plan` que no venga de un superusuario, para que ninguna cuenta se autootorgue el plan pago. |
| `candidate_profiles` | Perfil del postulante: nombre/segundo nombre/apellido, WhatsApp, zona, fecha de nacimiento, género, foto (resize automático a 800px antes de subir), rubros, **experiencia por rubro** (`category_experience`, json `{category, experience, company, company_id, company_address, start_year, end_year, is_current, reference_name, reference_phone, reference_role}[]` — la experiencia se calcula sola a partir de los años; `company_id` referencia un `business_accounts` real cuando el postulante elige una empresa ya registrada en TuCV desde el autocomplete — es la única "red" que guardamos, una señal de confianza liviana, no un grafo social), disponibilidad, **estudios** y **referencias** como listas (`studies`/`references`, json `string[]`), `profile_slug` (URL pública `/p/[slug]`), bio, CV, consentimientos. `experience` (legacy) queda como la experiencia más alta entre los rubros, de respaldo. | Creación pública (exige `consent_save=true`). Ver/editar: solo con el link personal (`?token=` contra `edit_token`, autogenerado). Listado para empresas: solo si `consent_zone_visible=true` o si el candidato aplicó a una de sus búsquedas. El perfil público (`/p/[slug]`) se resuelve server-side (`/api/public-profile/[slug]`, superusuario) sin tocar `viewRule`. El autocomplete de empresa (`/api/search-businesses`) resuelve igual, server-side, para no abrir `business_accounts.listRule` al público. |
| `job_posts` | Cada búsqueda: rubro, dirección/zona, puesto, turno, experiencia requerida, mensaje visible, duración (15/30 días → `expires_at` calculado server-side), `slug` único para la URL pública. | Solo el dueño del negocio crea/edita/borra. La vista individual (`viewRule`) es pública, para que `/b/[slug]` funcione sin login — pero el *listado* sigue restringido al dueño (no hay directorio público de búsquedas). |
| `applications` | Postulación de un candidato a una búsqueda. `status`: nuevo / contactado / entrevista / contratado / descartado. | Creación pública si `job_post.active=true`. Ver/listar/editar: solo el dueño de la búsqueda. |
| `application_status_events` | Auditoría de cada cambio de estado de una postulación. | Se inserta **automáticamente** desde un hook server-side (`pocketbase/pb_hooks/main.pb.js`) cada vez que cambia `applications.status` — no depende de que el frontend haga la escritura extra. Solo lectura para el dueño de la búsqueda. |
| `consent_logs` | Registro de consentimiento (guardar perfil / visibilidad por zona) por postulante. | Se inserta automáticamente vía hook al crear/actualizar `candidate_profiles`. Sin acceso por API (solo superusuario). |
| `category_suggestions` | Rubros "otro" que los postulantes escriben a mano, con contador de repeticiones (`text`, `count`). Se llena sola vía hook. Sirve para decidir a mano (revisando esta colección) qué agregar a `CATEGORIES` en `lib/constants.ts` — **no hay promoción automática**, es una señal para que alguien la revise. | Sin acceso por API (solo superusuario, vía panel admin de PocketBase). |

**Filtros de sexo/edad**: se guardan (`gender`, `birth_date`/`age_manual`) y se muestran en el
panel de postulantes y en `/empresa/candidatos` detrás del feature flag
`NEXT_PUBLIC_FEATURE_FILTERS_GENDER_AGE` (por defecto `true` — apagalo si en algún momento se
decide lo contrario).

**"Buscar candidatos" (`/empresa/candidatos`)**: cualquier empresa logueada puede buscar
perfiles con `consent_zone_visible=true`, aunque nunca se hayan postulado a una de sus
búsquedas — es el directorio "gente de la zona disponible", separado de las postulaciones por
búsqueda puntual.

**Filtros del panel** (rubro/puesto, zona, experiencia, disponibilidad, referencias, estado) se
resuelven client-side sobre la lista ya traída (`expand=candidate`) — suficiente para el volumen
esperado de un MVP local; si una búsqueda tuviera cientos de postulantes convendría moverlos a
filtros server-side.

---

## 6. Rutas principales

| Ruta | Qué es |
|---|---|
| `/` | Landing. |
| `/estilos` | Galería de los 6 estilos visuales (theme tokens), con mini landing/form/card/panel de ejemplo para cada uno. |
| `/postulante/nuevo` | Alta de perfil candidato (mobile-first). Con `?applyTo=<jobPostId>` de postulación automática. |
| `/postulante/editar?id=&token=` | Edición del propio perfil (link personal generado al crear el perfil). |
| `/p/[slug]` | Perfil público de solo lectura (`tucv.ar/p/nombre-apellido`) — el candidato lo comparte como su "CV digital". Slug estable: no cambia en ediciones posteriores. |
| `/empresa/registro`, `/empresa/login` | Cuenta de negocio. |
| `/empresa/panel` | Búsquedas propias + estado + cantidad de postulantes. |
| `/empresa/busquedas/nueva` | Crear búsqueda → URL pública + QR descargable. |
| `/empresa/busquedas/[id]` | Panel de postulantes de esa búsqueda: QR/link (colapsable), filtros + acciones (ver perfil, WhatsApp, contactar, entrevista, contratado, descartado). |
| `/empresa/candidatos` | Buscar candidatos de la zona con `consent_zone_visible=true`, aunque no se hayan postulado a ninguna búsqueda propia. Mismos filtros que el panel de postulantes. |
| `/b/[negocio]/[código]` | Página pública de la búsqueda (a la que se llega por QR/link) + "postularme". Formato nuevo, más legible (`job_posts.short_code`, 6 caracteres) -- el segmento `[negocio]` es cosmético, la búsqueda real es por `short_code`. `/b/[slug]` (formato heredado, un solo segmento) sigue funcionando tal cual para links/QRs ya impresos antes de este cambio -- ambos resuelven vía la misma `getPublicJob()` (busca por `slug` O `short_code`, ver `lib/public-job.ts`). |

Navegación: hay un navbar global (`components/layout/Navbar.tsx`) que cambia según el estado de
sesión — anónimo ve "Busco trabajo / Busco empleados" (o "Mi perfil" si ya guardó uno), una
empresa logueada ve "Mis búsquedas / Buscar candidatos / Crear búsqueda / Cerrar sesión".

---

## 7. Monetización

Postulante: gratis, siempre. Ese es el activo — máxima liquidez de candidatos, nunca se les cobra.

TuCV no vende "publicar búsquedas": vende cubrir un puesto rápido con candidatos reales de
cercanía, sin CVs sueltos por mail. El modelo (implementado, vía Mercado Pago Checkout Pro):

- **Negocio Gratis** (`business_accounts.plan = "free"`): publicar búsquedas es gratis, pero
  **1 búsqueda activa a la vez** (chequeado en `JobPostForm.handleSubmit` antes de crear —
  cuenta las `job_posts` propias con `active=true` y `expires_at` futuro). Incluye QR/link
  público, panel de postulantes, y todos los filtros legítimos (rubro, zona, experiencia,
  disponibilidad, movilidad, referencias).
- **Búsqueda destacada / boost** (`payments.type = "job_boost"`, `MERCADOPAGO_JOB_BOOST_PRICE`,
  default $4.900): pago único por búsqueda, extiende `job_posts.featured_until` 7 días
  (`JOB_BOOST_DAYS` en `lib/mercadopago-pricing.ts`). Si ya estaba destacada, extiende desde el
  vencimiento existente en vez de desde ahora (no se pierden días pagos). El feed público en `/`
  (`lib/public-jobs-list.ts`) ordena destacadas primero.
- **Extender búsqueda** (`payments.type = "job_extend"`, `MERCADOPAGO_JOB_EXTEND_PRICE`, default
  $4.900, `JOB_EXTEND_DAYS = 15`): mismo mecanismo que el boost, pero suma días a
  `job_posts.expires_at` en vez de a `featured_until` — mantiene el mismo slug/QR/link ya
  impartido/compartido, no hace falta crear una búsqueda nueva. Solo tiene sentido en el plan
  gratis (7 días fijos, `lib/plan-limits.ts` → `maxDurationDays`): en Pro/Multi-sucursal, una
  búsqueda "Vencida" se puede reactivar gratis desde el panel (`ExtendJobButton.tsx` /
  `ApplicantsPanel.tsx` gatean esto por `business.plan`) porque esas cuentas ya pagan una
  suscripción — cobrarles de nuevo por reactivar sería duplicar el cobro.
- **Plan Pro** (`business_accounts.plan = "pro"`, `payments.type = "plan_pro"`,
  `MERCADOPAGO_PLAN_PRO_PRICE`, default $9.900/mes): sin límite de búsquedas activas simultáneas,
  y cada búsqueda nueva arranca destacada 7 días automáticamente, sin pagar boost aparte.
- **Multi-sucursal / Franquicias** (`business_accounts.plan = "multi_local"`,
  `payments.type = "multi_local"`, `MERCADOPAGO_MULTI_LOCAL_PRICE`, default $39.900/mes): hasta 10
  búsquedas activas simultáneas + auto-boost, igual que Pro (`lib/plan-limits.ts` centraliza el
  límite y el auto-boost por plan). Self-serve desde `/empresa/perfil` (`PlanUpgradeCard`), mismo
  checkout + webhook que Pro. Lo que la card de precios promete además del límite/auto-boost
  (varias sucursales, usuarios por local, base propia de candidatos, reporte por búsqueda)
  **todavía no está construido** — quien pague hoy obtiene el límite de 10 + auto-boost
  realmente, el resto es roadmap. Si esto genera fricción real con clientes de este tier, prioriza
  construir esas piezas antes de seguir vendiéndolas.

**Nunca sexo ni edad como filtro, ni gratis ni pago.** En CABA la Ley 6471 prohíbe que ofertas o
plataformas de búsqueda laboral restrinjan candidatos por edad, sexo o género salvo que sea
imprescindible para el puesto, y a nivel nacional aplica también la Ley 23.592 contra actos
discriminatorios. `CandidateFilterBar`/`lib/candidate-filters.ts` solo filtran por rubro, zona,
experiencia, disponibilidad, movilidad propia, disponibilidad inmediata y referencias.

Flujo de pago (checkout + webhook, compartido entre `plan_pro` y `job_boost` vía un discriminador
`type` en el body de `/api/mercadopago/checkout`):

1. El endpoint valida la sesión del negocio contra PocketBase, crea un registro en `payments`
   (`status: pending`) y una preferencia de pago en Mercado Pago.
2. El negocio paga en la página hospedada de Mercado Pago (nunca se le pide la tarjeta a TuCV).
3. `/api/mercadopago/webhook` recibe la notificación, **vuelve a consultar el estado real del
   pago a la API de Mercado Pago** (nunca confía en el body de la notificación en sí), es
   idempotente, y si está aprobado aplica el efecto correspondiente (`plan="pro"` o extender
   `featured_until`) usando credenciales de superusuario.

Sin `MERCADOPAGO_ACCESS_TOKEN` configurado, cualquier botón de pago muestra un error claro en vez
de romper — el resto del sitio sigue funcionando igual.

---

## 8. Deploy

Dos variantes de `docker-compose`, mismo patrón que otros servicios de este VPS
(`mediaupload/`):

- **`docker-compose.yml`** — standalone: `app` + `pocketbase` + **Caddy propio**. Sirve para
  probar en un VPS aislado o 100% local.
- **`docker-compose.hetzner.yml`** — se une a la red Docker externa `plausible_default` (el
  Caddy compartido que ya sirve `mediaupload`/Plausible en este mismo VPS) en vez de levantar un
  Caddy nuevo. Es el camino recomendado si `tucv.ar` se despliega en el mismo servidor que los
  demás proyectos de `/home/tomas/services/`.

```bash
# standalone
cp .env.production.example .env   # completar valores
docker compose up -d --build

# integrado al Caddy compartido existente
docker compose -f docker-compose.hetzner.yml up -d --build
```

Con `docker-compose.hetzner.yml`, además hay que agregar a mano estos bloques al Caddyfile
compartido (**`/home/tomas/services/plausible/caddy/Caddyfile`** — es infra usada por otros
servicios, no lo toques sin confirmar antes) y reiniciar ese Caddy:

```
tucv.ar, www.tucv.ar {
  reverse_proxy tucv-app:3000
  encode gzip zstd
}

pb.tucv.ar {
  reverse_proxy tucv-pb:8090
  encode gzip zstd
}
```

### Backups

Los datos de PocketBase viven en el volumen `tucv_pb_data`. Backup manual:

```bash
docker run --rm -v tucv_tucv_pb_data:/data -v $PWD:/backup \
  busybox tar czf /backup/tucv-pb-data-$(date +%F).tar.gz -C /data .
```

---

## Checklist de DNS `tucv.ar`

> ✅ **Ya está en producción** (desde 2026-07-03): `tucv.ar` y `pb.tucv.ar` resuelven al servidor,
> con certificado Let's Encrypt activo vía el Caddy compartido. Queda el checklist abajo como
> referencia de los pasos que se siguieron (y por si hay que repetirlos con otro dominio).

Pasos seguidos (dominio `.ar`, delegación vía NIC.ar):

1. **Confirmar el estado de delegación** en NIC.ar (el registrador de dominios `.ar`):
   entrá a [nic.ar](https://nic.ar) → tu cuenta → el dominio `tucv.ar` → revisá que la
   delegación esté en estado activo y que los **nameservers** apunten a donde vayas a
   gestionar el DNS (Cloudflare es lo más simple, mismo patrón que los otros dominios de este
   proyecto).
2. **Si vas a usar Cloudflare**: agregá `tucv.ar` como sitio nuevo, copiá los 2 nameservers que
   te da Cloudflare, y cargalos en NIC.ar como los nameservers del dominio. La propagación puede
   tardar horas.
3. **Una vez delegado**, en Cloudflare (o el DNS que elijas) creá:
   - `A tucv.ar` → IP pública del servidor, **DNS only** (nube gris) al principio — necesario
     para que Caddy pueda emitir el certificado Let's Encrypt sin un proxy intermedio.
   - `A www.tucv.ar` → misma IP.
   - `A pb.tucv.ar` → misma IP (subdominio dedicado a PocketBase, ver `Caddyfile`).
4. **Levantar el stack** (`docker compose up -d --build`, o agregar los bloques al Caddy
   compartido — ver sección Deploy) y mirar los logs de Caddy hasta que confirme el certificado:
   `docker compose logs -f caddy`.
5. Recién ahí, si querés, pasá el registro de `tucv.ar`/`www.tucv.ar` a **Proxied** (nube
   naranja) en Cloudflare y poné SSL/TLS en modo **Full (strict)**. `pb.tucv.ar` puede quedar
   igual (proxied o no), pero si lo proxeás revisá los límites de tamaño de subida de Cloudflare
   contra el de las fotos/CV.
6. Actualizá `NEXT_PUBLIC_BASE_URL` y `NEXT_PUBLIC_POCKETBASE_URL` en el `.env` de producción
   (`https://tucv.ar` / `https://pb.tucv.ar`) y **volvé a buildear** la imagen (son variables
   que se hornean en build time).

---

## Riesgos y límites conocidos del MVP

- El link de edición del perfil postulante (`/postulante/editar?id=&token=`) es la única forma
  de recuperar/editar el perfil — si el candidato lo pierde, no hay recuperación por
  WhatsApp/SMS en este MVP.
- `applications.createRule` no verifica que quien crea la postulación sea dueño real del
  `candidate_profiles.id` que manda (solo exige que la búsqueda esté activa). Impacto bajo (los
  ids no son públicos ni enumerables) pero es un límite conocido, no un descuido.
- `/api/public-job/[slug]` depende de `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD` server-side; si faltan
  en producción, la página pública de cualquier búsqueda (`/b/[slug]`) devuelve 404 siempre.
- Los filtros del panel de postulantes son client-side (`getFullList`); no escalan a búsquedas
  con cientos de postulantes (no es el volumen esperado del MVP).
- Pagos: no implementados (ver sección Monetización).
