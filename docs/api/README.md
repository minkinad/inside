# API contract notes

NestJS serves REST endpoints under `/api`; Swagger is at `/docs`. The Next.js application calls them through `/api/inside/*` using an HttpOnly session cookie. Direct API clients use a bearer token and must implement their own secure token storage. Protected routes re-check the employee's current role from PostgreSQL.

## Employee IDs

Employee JSON has `publicId`, for example `employee/10000000001`. Employee profile and avatar URLs use two path segments: `GET /api/people/employee/10000000001` and `GET /api/people/employee/10000000001/avatar`. Admin update and career creation use `/api/admin/people/employee/{number}` and `/api/admin/people/employee/{number}/career`. Org `managerId` values are public IDs. Clients cannot pass `publicId` during employee creation or update. CUIDs remain server-side foreign keys. Existing internal-ID employee URLs are not part of the new public contract.

## Implemented areas

| Area | Main routes |
| --- | --- |
| Identity | `POST /api/auth/login`, `GET /api/auth/me`, preferences, password and self-photo |
| People/Organization | `GET /api/people`, public-ID profile/avatar, `GET /api/org` |
| Community | post list/detail/create, image, comments and reactions |
| Culture | celebrations, reactions/comments and events |
| Benefits | eligibility-filtered `GET /api/benefits` |
| Brand | authorized list, upload and download |
| Administration | summary, people, units, events, benefits and post moderation |

Public IDs are locators, not authorization evidence. Admin routes require the current ADMIN role. Protected brand files and uploaded images stream through the API, not direct MinIO URLs. `401` means no valid session; `403` means insufficient role or a rejected web origin; `400` means invalid input; `404` hides inaccessible or absent records. The web proxy returns `503` when the API is temporarily unreachable.
