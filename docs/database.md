# Database Infrastructure

CareerGPT requires a robust RDBMS to handle continuous state changes within the Competency Graph.

## Production
- **Engine**: PostgreSQL 15+
- **Driver**: `psycopg2-binary`
- **Pooling**: SQLAlchemy is configured for 10 connections with an overflow of 20. Connection timeout is strictly set to 15 seconds.

## Backups & Recovery
- Managed PostgreSQL providers (Supabase, Neon) automatically perform daily physical backups and Point-In-Time-Recovery (PITR).
- If self-hosting, use `pg_dump` via a cron-job to export schema and data. Ensure `user_profiles`, `competency_nodes`, and `interview_answers` are replicated.

## Migrations
- Currently handled via SQLAlchemy `create_all()`.
- (Planned Alembic) The schema evolution relies on strict additive migrations to prevent downtime.
