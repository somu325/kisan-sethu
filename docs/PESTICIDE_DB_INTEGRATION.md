# Pesticide & Spray Dosage Database Integration Guide

This document defines the production database architecture and suggested PostgreSQL / SQLite schema for the KisanSetu Pesticide Knowledge System.

The application uses the **Repository Pattern** (`PesticideKnowledgeRepository`), meaning the React Native / Web frontend interacts strictly with an abstract interface. You can migrate from the local seed files or backend JSON store to PostgreSQL / MySQL without modifying a single line of UI code.

---

## 1. Relational Schema Architecture

```
+---------------+       +------------------+       +----------------------------+
|     crops     | 1---* |  crop_problems   | 1---* |  verified_recommendations  |
+---------------+       +------------------+       +----------------------------+
       |                                                         |
       |                                                         *
       | 1                                                 +-------------+
       *                                                   |   sources   |
+---------------------+                                    +-------------+
| registered_products |
+---------------------+
       | 1
       *
+---------------------+
|   product_prices    |
+---------------------+
```

---

## 2. PostgreSQL DDL Schema

```sql
-- 1. Crops Catalog
CREATE TABLE crops (
    id VARCHAR(50) PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100) NOT NULL,
    name_te VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    default_soil VARCHAR(50) DEFAULT 'red',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crop Growth Stages
CREATE TABLE crop_stages (
    id SERIAL PRIMARY KEY,
    crop_id VARCHAR(50) REFERENCES crops(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL, -- seedling, vegetative, flowering, fruiting
    stage_order INT NOT NULL
);

-- 3. Crop Pests & Diseases Catalog
CREATE TABLE crop_problems (
    id VARCHAR(50) PRIMARY KEY,
    crop_id VARCHAR(50) REFERENCES crops(id) ON DELETE CASCADE,
    name_en VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    name_te VARCHAR(150) NOT NULL,
    problem_type VARCHAR(30) NOT NULL, -- 'pest', 'disease', 'weed', 'deficiency'
    symptoms_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Banned Active Ingredients (CIB&RC Gazette)
CREATE TABLE banned_products (
    id SERIAL PRIMARY KEY,
    active_ingredient VARCHAR(100) UNIQUE NOT NULL,
    ban_type VARCHAR(50) NOT NULL, -- 'COMPLETE_BAN', 'RESTRICTED_VEGETABLES'
    cibrc_notification_no VARCHAR(100),
    gazette_date DATE,
    reason TEXT
);

-- 5. CIB&RC Registered Commercial Formulations
CREATE TABLE registered_products (
    id VARCHAR(50) PRIMARY KEY,
    trade_name VARCHAR(150) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL,
    formulation VARCHAR(50) NOT NULL, -- e.g. '25% WG', '18.5% SC'
    cibrc_reg_no VARCHAR(100),
    chemical_group VARCHAR(100), -- 'Neonicotinoid (IRAC 4A)'
    target_crop_id VARCHAR(50) REFERENCES crops(id),
    target_problem_id VARCHAR(50) REFERENCES crop_problems(id),
    approved_dose_per_litre NUMERIC(8, 3),
    approved_dose_per_acre NUMERIC(8, 2),
    dose_unit VARCHAR(10) NOT NULL, -- 'g', 'ml', 'kg', 'L'
    water_per_acre_l INT DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Current Retail Benchmark Prices
CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES registered_products(id) ON DELETE CASCADE,
    mandi_or_district VARCHAR(100) NOT NULL,
    price_per_unit NUMERIC(8, 2) NOT NULL, -- e.g. Rs 2.80 per gram
    unit VARCHAR(10) NOT NULL, -- 'g', 'ml'
    as_of DATE NOT NULL
);

-- 7. Verified Official Recommendations (Double-Cited)
CREATE TABLE verified_recommendations (
    id SERIAL PRIMARY KEY,
    composite_key VARCHAR(150) UNIQUE NOT NULL, -- 'chilli:thrips:chemical:andhra_pradesh'
    crop_id VARCHAR(50) REFERENCES crops(id),
    problem_id VARCHAR(50) REFERENCES crop_problems(id),
    treatment_mode VARCHAR(20) NOT NULL, -- 'chemical', 'organic'
    state VARCHAR(50) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL,
    formulation VARCHAR(50) NOT NULL,
    trade_name VARCHAR(150),
    chemical_group VARCHAR(100) NOT NULL,
    dose_per_litre NUMERIC(8, 3),
    dose_per_acre NUMERIC(8, 2),
    dose_unit VARCHAR(10) NOT NULL,
    water_per_acre_l INT NOT NULL,
    spray_interval_days VARCHAR(50),
    max_sprays INT DEFAULT 2,
    phi_days INT, -- Pre-harvest interval (days)
    reentry_period_hours INT DEFAULT 24,
    mode_of_action_group TEXT NOT NULL,
    safety_precautions TEXT NOT NULL,
    organic_alternative TEXT,
    evidence_quote TEXT NOT NULL,
    source_url TEXT NOT NULL,
    publisher VARCHAR(200) NOT NULL,
    published_or_accessed_date DATE NOT NULL,
    secondary_source_url TEXT,
    secondary_publisher VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Farmer Feedback & Report Audit Log
CREATE TABLE farmer_recommendation_reports (
    id SERIAL PRIMARY KEY,
    crop_id VARCHAR(50),
    problem_id VARCHAR(50),
    treatment_mode VARCHAR(20),
    reported_issue TEXT NOT NULL,
    expected_advice TEXT,
    client_ip_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX idx_verified_recs_key ON verified_recommendations(composite_key);
CREATE INDEX idx_registered_ai ON registered_products(active_ingredient);
CREATE INDEX idx_banned_ai ON banned_products(active_ingredient);
```

---

## 3. Connecting to the Existing App

1. Set `PESTICIDE_DATA_SOURCE=api` in your frontend `.env` (or environment variables).
2. Point `VITE_BACKEND_URL` to your FastAPI server:
   ```env
   VITE_BACKEND_URL=http://127.0.0.1:8000
   ```
3. In the FastAPI backend (`backend/app/pesticide/retriever.py`), swap `self._load_verified_store()` to query PostgreSQL:
   ```python
   async def lookup_verified_store(self, crop: str, problem: str, mode: str, state: str):
       query = "SELECT * FROM verified_recommendations WHERE composite_key = $1 AND is_active = TRUE"
       return await db.fetch_one(query, f"{crop}:{problem}:{mode}:{state}")
   ```
4. All existing validation, dosage calculations, safety checklists, and UI components will work without modification.
