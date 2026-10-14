# Local setup

Use Node 24, pnpm 10.34.4 and Docker Compose. Copy `.env.example` to `.env` and replace the JWT secret if the environment is shared. The example credentials and demo accounts are strictly local.

```sh
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:seed` only works on an empty non-production database; it never clears existing records. Skip it when connecting to an existing database. In WSL, `docker.exe compose` can replace `docker compose` if only Docker Desktop's Windows CLI is exposed. Open `http://localhost:3000` for the portal and `http://localhost:4000/docs` for Swagger. The demo credentials are in the root README.

The web app calls the API through its same-origin proxy. `API_INTERNAL_URL` is the URL the Next.js process uses to reach NestJS. `WEB_ORIGIN` is the expected browser origin for CORS. Keep the values aligned when using non-default ports or a reverse proxy.
