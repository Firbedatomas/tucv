# ===========================================================================
# PocketBase DEDICADA de TuCV (aislada de consultoria/mediaupload/frambuesa).
# Imagen self-contained desde el binario oficial. Migrations + hooks se
# copian de la app; los datos viven en el volumen /pb_data.
# ===========================================================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates unzip wget

ARG PB_VERSION=0.29.2
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
  && unzip /tmp/pb.zip -d /usr/local/bin/ \
  && rm /tmp/pb.zip \
  && chmod +x /usr/local/bin/pocketbase

WORKDIR /pb
COPY pocketbase/pb_migrations ./pb_migrations
COPY pocketbase/pb_hooks ./pb_hooks

EXPOSE 8090
VOLUME /pb_data

# El proxy/TLS lo maneja el Caddy externo; acá solo HTTP interno.
ENTRYPOINT ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
