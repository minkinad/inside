# ADR 0001: Public employee identifiers

Status: accepted, 2026-10-16.

Employee URLs must use a stable, readable `employee/` plus 11 digits. Existing internal keys already anchor many foreign keys. Replacing those primary keys would create unnecessary migration risk.

We retain `Employee.id` internally and add `Employee.publicId`. PostgreSQL allocates its numeric suffix through a non-cycling sequence and enforces uniqueness, format and immutability. API and web links use `publicId`; JWTs and foreign keys continue to use the internal key. Authorization always comes from the JWT guard and current database role, never from the public ID.

This adds one indexed column and a lookup when a public ID must be converted to an internal FK. It avoids cross-table rewrites and preserves existing content relationships. Old internal-ID profile bookmarks require deliberate redirection if compatibility becomes a product requirement; the new route is `/people/employee/{number}`.
