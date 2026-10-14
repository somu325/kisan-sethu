# KisanSetu Common Database Layer

This directory provides a **provider-swappable database abstraction** for KisanSetu. The business logic only accesses data through repository interfaces, ensuring zero coupling to specific database vendors or engines.

---

## 1. Supported Providers

| Provider | `DB_PROVIDER` | `DATABASE_URL` Example | Typical Use |
| :--- | :--- | :--- | :--- |
| **SQLite** | `sqlite` | `./data/kisansetu.db` | Local development, offline QA, unit testing |
| **PostgreSQL** | `postgres` | `postgres://user:pass@host:5432/dbname` | Google Cloud SQL, Supabase, Neon, AlloyDB |
| **Firestore** | `firestore` | *(Architectural stub)* | Document-store alternative (GCP) |

### Switching to Google Cloud SQL (PostgreSQL)
To switch the application from SQLite to Google Cloud SQL or Supabase in staging/production, **change only these environment variables** (zero code modifications needed):
```bash
DB_PROVIDER=postgres
DATABASE_URL=postgres://kisansetu_user:SECRET_PASSWORD@10.x.x.x:5432/kisansetu?sslmode=require
```

---

## 2. CLI Commands

Run from the `server/` directory:
- `npm run db:migrate`: Executes pending schema migrations (`001_initial_schema.ts`).
- `npm run db:rollback`: Rolls back the last migration batch.
- `npm run db:seed`: Seeds the database with ~30 sample APMC/Mandi locations and verified dosage recommendations.
- `npm run db:reset`: Drops all tables, re-runs migrations, and re-seeds.
- `npm run db:import:markets -- <file.csv>`: Imports real Agmarknet / data.gov.in market records from CSV.

---

## 3. Schema & Spatial Design

### Nearby Market Search (`getNearby`)
The spatial query operates in two stages:
1. **SQL Bounding Box Index Scan**:
   Computes a bounding box `[lat - delta, lat + delta]` and `[lng - delta, lng + delta]` using the composite index `idx_markets_lat_lng`.
2. **Deterministic Haversine Calculation**:
   Computes exact geodesic distances in kilometers in code, filters to `<= radiusKm`, and sorts ascending by proximity.

### Future Upgrade Path to PostGIS
When deploying on PostgreSQL with the PostGIS extension enabled:
1. Add `GEOMETRY(Point, 4326)` column:
   ```sql
   ALTER TABLE markets ADD COLUMN geom GEOMETRY(Point, 4326);
   UPDATE markets SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
   CREATE INDEX idx_markets_geom ON markets USING GIST (geom);
   ```
2. Replace bounding box with `ST_DWithin`:
   ```sql
   SELECT *, ST_Distance(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000 AS distance_km
   FROM markets
   WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters);
   ```
   *Because business code calls `MarketRepository.getNearby`, the PostGIS optimization can be implemented inside `KnexMarketRepository` without touching any API routes, mobile app code, or voice assistant logic.*
