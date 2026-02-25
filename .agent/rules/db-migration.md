# Database Migration Rules

## File Location
All SQL migration files must be placed in `api/database/`.

## Naming Convention
Migration files follow a strict numbered prefix format:
```
{NN}_{short_description}.sql
```
- `NN`: Two-digit sequential number starting from `00`
- `short_description`: snake_case, concise description of the change

### Current files:
- `00_init.sql` — Base schema (tables, enums, functions, triggers, seed data)
- `01_add_payment_fields.sql` — PayOS + Lemon Squeezy payment fields
- `02_add_missing_tables.sql` — constants, webhook_logs, conversion_rates, otp_verifications

### Rules:
1. New migrations must use the **next available number** (e.g., `03_xxx.sql`)
2. Never modify existing migration files — always create a new one
3. Use `IF NOT EXISTS` / `IF EXISTS` for idempotent operations when possible
4. Each migration file must have a header comment with description and date

## Execution Order
When resetting DB from scratch, run files in numerical order:
```bash
docker exec -i ocr_postgres psql -U ocr_admin -d ocr_universe -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i ocr_postgres psql -U ocr_admin -d ocr_universe < api/database/00_init.sql
docker exec -i ocr_postgres psql -U ocr_admin -d ocr_universe < api/database/01_add_payment_fields.sql
docker exec -i ocr_postgres psql -U ocr_admin -d ocr_universe < api/database/02_add_missing_tables.sql
# ... continue with any new migration files
docker exec -it ocr_api npx prisma generate
docker restart ocr_api
```

## Prisma Sync
After adding new tables/columns, update `api/prisma/schema.prisma` to match, then run `npx prisma generate` to regenerate the TypeScript client.
