# Connecting Nearby Markets to a Production Database (Supabase / PostgreSQL)

This document provides the PostgreSQL / Supabase schema, spatial indexing setup, and repository integration guide to connect the **Nearby Markets** module to a live database without modifying any UI components.

---

## 1. PostgreSQL / Supabase Table DDL

Run the following SQL in your database (e.g. Supabase SQL Editor or standard PostgreSQL 14+):

```sql
-- Enable PostGIS for high-performance spatial indexing (optional but recommended)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the market_places table
CREATE TABLE IF NOT EXISTS public.market_places (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('APMC', 'MANDI')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    district VARCHAR(128),
    state VARCHAR(128),
    phone VARCHAR(64),
    opening_hours VARCHAR(128),
    commodities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_markets_type ON public.market_places(type);
CREATE INDEX IF NOT EXISTS idx_markets_district ON public.market_places(district);
CREATE INDEX IF NOT EXISTS idx_markets_state ON public.market_places(state);

-- Text search index across name, district, state
CREATE INDEX IF NOT EXISTS idx_markets_search ON public.market_places 
USING gin(to_tsvector('english', name || ' ' || COALESCE(district, '') || ' ' || COALESCE(state, '')));
```

---

## 2. Spatial "Nearby" Query (Lat/Lng + Radius)

### Option A: Using Standard SQL (Haversine Formula - No PostGIS needed)

```sql
CREATE OR REPLACE FUNCTION get_nearby_markets(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 100,
    filter_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id VARCHAR,
    name VARCHAR,
    type VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    district VARCHAR,
    state VARCHAR,
    phone VARCHAR,
    opening_hours VARCHAR,
    commodities TEXT[],
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.type,
        m.latitude,
        m.longitude,
        m.address,
        m.district,
        m.state,
        m.phone,
        m.opening_hours,
        m.commodities,
        ROUND((
            6371 * acos(
                LEAST(1.0, GREATEST(-1.0, 
                    cos(radians(user_lat)) * cos(radians(m.latitude)) * 
                    cos(radians(m.longitude) - radians(user_lng)) + 
                    sin(radians(user_lat)) * sin(radians(m.latitude))
                ))
            ) * 1.22
        )::numeric, 1)::DOUBLE PRECISION AS distance_km
    FROM public.market_places m
    WHERE (filter_type IS NULL OR m.type = filter_type)
      AND (
          6371 * acos(
              LEAST(1.0, GREATEST(-1.0, 
                  cos(radians(user_lat)) * cos(radians(m.latitude)) * 
                  cos(radians(m.longitude) - radians(user_lng)) + 
                  sin(radians(user_lat)) * sin(radians(m.latitude))
              ))
          ) * 1.22
      ) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Switching Implementations in Code

The architecture uses a clean repository boundary (`MarketRepository`).

1. Set the environment variable in `.env`:
   ```bash
   VITE_MARKET_DATA_SOURCE=api
   VITE_API_URL=https://your-supabase-or-fastapi-backend.com/v1/markets
   ```

2. The factory in `src/data/marketDataSource.ts` automatically instantiates `ApiMarketRepository`.

3. In `src/data/apiMarketRepository.ts`, replace the stubbed `fetch()` calls with:
   ```typescript
   // Example Supabase JS Client integration:
   const { data, error } = await supabase.rpc('get_nearby_markets', {
     user_lat: lat,
     user_lng: lng,
     radius_km: radiusKm,
     filter_type: type ?? null
   });
   return data as (MarketPlace & { distanceKm: number })[];
   ```

Zero UI components need to be modified when transitioning from mock data to the production database.
