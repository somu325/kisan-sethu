# KisanSetu Shared Infrastructure Architecture

## 1. System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native App (Frontend)                     │
│               - Voice Assistant (Phase 1 Nearest Mandi)                │
│               - Nearby Markets / APMC Map View                         │
│               - Pesticide & Dosage Calculator                          │
│               - ApiMarketRepository (with Offline Mock Fallback)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (No API Keys in App)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     KisanSetu Backend Server (Express)                 │
│               - Input Validation (Zod)                                 │
│               - Rate Limiting, Security (Helmet, CORS)                 │
│               - Structured Logging (Pino, redacted secrets)            │
│               - Routes: /markets, /conversations, /feedback, /admin    │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               ▼                                          ▼
┌──────────────────────────────┐        ┌────────────────────────────────┐
│   Common Database Layer      │        │     Swappable LLM Layer        │
│   (server/src/db/)           │        │     (server/src/llm/)          │
├──────────────────────────────┤        ├────────────────────────────────┤
│ - Query Builder: Knex        │        │ - Gateway: generate, stream,   │
│ - Providers:                 │        │   generateStructured, embed    │
│   * SQLite (Local/Testing)   │        │ - Providers: Gemini, OpenAI,   │
│   * PostgreSQL (Cloud SQL)   │        │   Anthropic                    │
│   * Firestore (Stub)         │        │ - Dynamic Routing & Budget:    │
│ - Repositories:              │        │   * 80% Token Budget Scale-Down│
│   * MarketRepository         │        │   * Circuit Breaker (3 errors) │
│   * PesticideKnowledgeRepo   │        │   * Exponential Backoff        │
│   * ConversationRepository   │        │   * Global Daily Cost Cap      │
│   * LlmUsageRepository       │        │   * Response Cache (TTL)       │
│   * UserRepository           │        │ - Usage Tracking (llm_usage)   │
└──────────────┬───────────────┘        └──────────────┬─────────────────┘
               │                                       │
               │                        ┌──────────────┴─────────────────┐
               │                        │   Retrieval & Verification     │
               │                        │   - Independent Domain Allow   │
               │                        │     (*.gov.in, icar, angrau)   │
               │                        │   - Quote match & Banned check │
               │                        │   - Abstain by default         │
               │                        └────────────────────────────────┘
               ▼
┌──────────────────────────────┐
│       Database Engines       │
│  - Local: SQLite file        │
│  - Cloud: Google Cloud SQL   │
│    (PostgreSQL / PostGIS)    │
└──────────────────────────────┘
```

---

## 2. How to Run Locally

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Step-by-Step Setup
1. **Clone repository & checkout branch**:
   ```bash
   git checkout feat/common-db-and-llm-infrastructure
   ```
2. **Install dependencies**:
   ```bash
   # From root:
   npm install --prefix server
   npm install --prefix frontend
   ```
3. **Initialize Local SQLite Database**:
   ```bash
   # Run migrations:
   npm run db:migrate

   # Seed ~30 sample APMC & Mandi markets and pesticide recommendations:
   npm run db:seed
   ```
4. **Start the Backend Server**:
   ```bash
   npm run server
   # Server listens on http://localhost:8080
   # Health check: http://localhost:8080/health
   ```
5. **Start the Frontend App**:
   ```bash
   npm run dev
   # App runs on http://localhost:3000
   ```
6. **Running on Physical Device / Android Emulator**:
   - Set `VITE_API_URL=http://<YOUR_LAN_IP>:8080` in `frontend/.env` (or `http://10.0.2.2:8080` for Android Studio emulator).
   - Ensure your phone and development machine are connected to the same Wi-Fi network.

---

## 3. How to Switch to Google Cloud SQL (PostgreSQL)

Switching from the local SQLite engine to Google Cloud SQL requires **zero code modifications**, only environment variable changes:

1. Provision a PostgreSQL 15+ instance in Google Cloud SQL.
2. In your production environment (e.g. Cloud Run environment variables or Secret Manager):
   ```bash
   DB_PROVIDER=postgres
   DATABASE_URL=postgres://kisansetu_user:DB_SECRET_PASSWORD@10.x.x.x:5432/kisansetu?sslmode=require
   ```
3. Run migrations against Cloud SQL:
   ```bash
   npm run db:migrate
   ```

---

## 4. How to Add a New LLM Provider

The LLM layer is designed with strict provider inversion of control:
1. Create a provider file in `server/src/llm/providers/<provider_name>.ts` implementing the `LLMProvider` interface (`server/src/llm/types.ts`).
2. Register the provider instance in `server/src/llm/router/selector.ts`:
   ```typescript
   this.providers.set('<provider_name>', new MyCustomProvider());
   ```
3. Add model identifiers, token limits, and pricing in `server/src/llm/registry/models.config.ts`.
4. Configure fallback chains in `server/src/llm/registry/routing.config.ts`.
5. Add the corresponding API key in `.env` and `server/src/config.ts`.

---

## 5. How to Change Model Tiers, Quotas & Budgets

- **Tiers & Capabilities**: Edit `server/src/llm/registry/models.config.ts`. You can switch models between `'fast'`, `'balanced'`, and `'advanced'`, or toggle `enabled: false`.
- **Task Routing**: Edit `server/src/llm/registry/routing.config.ts` to reorder fallback priority chains per task (e.g., attempt Gemini Flash first, fallback to GPT-4o-mini, then Claude Haiku).
- **Daily Spend Cap**: Set `LLM_DAILY_COST_CAP_USD` in `.env`. When the aggregate cost from `llm_usage` exceeds this threshold, all LLM calls safely decline and fallback to deterministic local templates.

---

## 6. How to Import Real Market Data

To import real commodity and market datasets from Agmarknet or data.gov.in:
1. Export your dataset as CSV with columns:
   `name,type,latitude,longitude,district,state,address,phone,opening_hours,commodities`
2. Run the import command:
   ```bash
   npm run db:import:markets -- path/to/markets.csv
   ```
3. Records are automatically indexed and tagged `is_sample = false`.

---

## 7. Google Cloud Deployment Architecture (Cloud Run + Secret Manager)

### Deploying the Server to Google Cloud Run
1. Build and push container to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/kisansetu-server:latest server/
   ```
2. Store API keys and database credentials in Google Secret Manager:
   ```bash
   gcloud secrets create db-url --data-file=-
   gcloud secrets create gemini-api-key --data-file=-
   ```
3. Deploy to Cloud Run with Cloud SQL connector:
   ```bash
   gcloud run deploy kisansetu-server \
     --image gcr.io/PROJECT_ID/kisansetu-server:latest \
     --platform managed \
     --region asia-south1 \
     --allow-unauthenticated \
     --add-cloudsql-instances PROJECT_ID:asia-south1:kisansetu-db \
     --set-env-vars DB_PROVIDER=postgres \
     --set-secrets DATABASE_URL=db-url:latest,GEMINI_API_KEY=gemini-api-key:latest
   ```
