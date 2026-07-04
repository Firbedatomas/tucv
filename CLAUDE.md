# Reglas de este proyecto (tucv)

## Git y deploy

- Este repo se pushea a `github.com/Firbedatomas/tucv` (rama `main`). A
  partir de 2026-07-04, pedido explícito del usuario: después de terminar
  un cambio real (no cada edit suelto, sino un chunk de trabajo terminado y
  verificado), hacer commit y push a GitHub sin tener que pedírmelo cada
  vez -- no hace falta preguntar antes de pushear a este repo en particular.
- `scripts/deploy.sh` reconstruye el contenedor `tucv-app` a partir del
  código que esté en el disco de ESTE servidor en ese momento -- no hace
  `git pull` de GitHub. Por eso el disco local y GitHub quedan
  sincronizados en la medida en que se pushee siempre después de cada
  cambio real: `deploy.sh` corta el deploy si hay cambios sin commitear/
  pushear (ver el chequeo al principio del script), así nunca queda algo en
  producción que no esté también en GitHub.
