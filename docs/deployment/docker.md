# Docker and deployment notes

`docker-compose.yml` starts PostgreSQL 16, Redis 7 and MinIO for local development. The Next.js and NestJS processes run on the host with `pnpm dev`; the Compose file is not a production deployment manifest. Named volumes preserve local database and object data across container restarts. `docker compose down` leaves volumes intact; avoid `down -v` on any environment with valuable data.

For production, provide unique secrets through the deployment secret store, configure HTTPS and reverse proxying, set `WEB_ORIGIN` and `API_INTERNAL_URL`, and restrict direct API/database/Redis/MinIO exposure. The API rejects missing production `DATABASE_URL`, `REDIS_URL`, MinIO connection credentials and `WEB_ORIGIN`. Set `MINIO_USE_SSL=true` when connecting over TLS. Back up PostgreSQL and MinIO together, then test restores before migration rollout.

Deploy migrations before serving code that requires their columns. For the employee public ID migration, read `docs/architecture/database.md` and take a consistent database backup first. Do not run the demo seed in production; it explicitly refuses production mode and populated databases.
