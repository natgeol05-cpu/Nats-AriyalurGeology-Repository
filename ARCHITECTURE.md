# Ariyalur Geology Website — Architecture & Visual Diagrams

This document contains visual diagrams for the Ariyalur Geology website system,
covering system architecture, data flow, deployment pipeline, database schema,
CI/CD workflow, and request flow.

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Users"
        U1[👤 Visitor / Geology Student]
        U2[👤 Admin / Fossil Submitter]
    end

    subgraph "Frontend — GitHub Pages / Vercel"
        FE1[index.html\nHome & Navigation]
        FE2[AriyalurFossilsGallery.html\nFossil Gallery]
        FE3[UploadFossilImageAndDetails.html\nUpload Form]
        FE4[Registration Form\nVisitor Sign-up]
        FE5[Static Pages\n43 HTML files]
    end

    subgraph "Backend API — Vercel Serverless"
        API1[POST /api/register\nRegistration Handler]
        API2[POST /api/fossils\nFossil Details Handler]
        API3[POST /api/upload\nImage Upload Handler]
        API4[GET  /health\nHealth Check]
        MW1[CORS Middleware]
        MW2[Rate Limiter]
        MW3[Helmet Security]
    end

    subgraph "Database — Supabase (PostgreSQL)"
        DB1[(registrations\ntable)]
        DB2[(fossil_details\ntable)]
        ST1[🪣 fossil-images\nStorage Bucket]
    end

    subgraph "External Services"
        GH[GitHub Repository\nnatswebsite.com]
        VC[Vercel CDN\nGlobal Edge Network]
        SB[Supabase Cloud\nPostgres + Storage]
    end

    U1 --> FE1
    U1 --> FE2
    U2 --> FE3
    U2 --> FE4

    FE1 --> VC
    FE2 --> VC
    FE3 --> API3
    FE4 --> API1

    GH -->|deploy| VC
    VC --> FE1

    API1 --> MW1 --> MW2 --> DB1
    API2 --> MW1 --> MW2 --> DB2
    API3 --> MW1 --> MW2 --> ST1

    SB --> DB1
    SB --> DB2
    SB --> ST1

    style FE3 fill:#f0f7ff,stroke:#0366d6
    style API1 fill:#e6ffed,stroke:#28a745
    style DB1 fill:#fff8c5,stroke:#d9a40c
    style ST1 fill:#fff8c5,stroke:#d9a40c
```

---

## 2. Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Registration Flow"
        R1([User fills\nRegistration Form])
        R2{Form\nValidation}
        R3[POST /api/register\nJSON body]
        R4{Backend\nValidation}
        R5[(Insert into\nregistrations)]
        R6([Success /\nError Response])

        R1 --> R2
        R2 -->|Invalid| R1
        R2 -->|Valid| R3
        R3 --> R4
        R4 -->|Invalid| R6
        R4 -->|Valid| R5
        R5 --> R6
    end

    subgraph "Fossil Upload Flow"
        F1([User fills\nFossil Details Form])
        F2{File &\nForm Validation}
        F3[POST /api/upload\nmultipart/form-data]
        F4[Upload image to\nSupabase Storage]
        F5[Get public\nimage URL]
        F6[POST /api/fossils\nwith image URL]
        F7[(Insert into\nfossil_details)]
        F8([Success /\nError Response])

        F1 --> F2
        F2 -->|Invalid| F1
        F2 -->|Valid| F3
        F3 --> F4
        F4 --> F5
        F5 --> F6
        F6 --> F7
        F7 --> F8
    end

    subgraph "Gallery Display Flow"
        G1([User visits\nFossils Gallery])
        G2[GET /api/fossils\nquery params]
        G3[(SELECT from\nfossil_details)]
        G4[Build JSON\nresponse]
        G5([Render gallery\ncards with images])

        G1 --> G2
        G2 --> G3
        G3 --> G4
        G4 --> G5
    end
```

---

## 3. Deployment Pipeline

```mermaid
flowchart TD
    DEV([Developer\npushes code])
    GH[GitHub Repository\nmain branch]

    subgraph "CI Pipeline — GitHub Actions"
        C1[Checkout code]
        C2[Install dependencies\nnpm ci]
        C3[Run linter\nnpm run lint]
        C4[Run tests\nnpm test]
        C5{All checks\npassed?}
    end

    subgraph "CD Pipeline — Vercel"
        D1[Vercel detects push]
        D2[Build frontend\nstatic assets]
        D3[Deploy backend\nserverless functions]
        D4[Run smoke tests]
        D5{Deploy\nsucceeded?}
        D6[Promote to\nproduction]
        D7[Rollback to\nprevious version]
    end

    LIVE([Live Website\nnatswebsite.com])

    DEV --> GH
    GH --> C1
    C1 --> C2 --> C3 --> C4 --> C5
    C5 -->|No| FAIL([❌ Notify developer\nBuild failed])
    C5 -->|Yes| D1
    D1 --> D2 --> D3 --> D4 --> D5
    D5 -->|No| D7 --> FAIL2([⚠️ Rollback complete\nInvestigate logs])
    D5 -->|Yes| D6 --> LIVE

    style LIVE fill:#e6ffed,stroke:#28a745,color:#000
    style FAIL fill:#ffeef0,stroke:#d73a49,color:#000
    style FAIL2 fill:#fff8c5,stroke:#d9a40c,color:#000
```

---

## 4. Database Schema Diagram

```mermaid
erDiagram
    REGISTRATIONS {
        uuid   id              PK  "auto-generated"
        text   full_name           "required"
        text   email               "required, unique"
        text   phone               "optional"
        text   institution         "optional"
        text   purpose             "optional"
        timestamptz created_at     "default: now()"
    }

    FOSSIL_DETAILS {
        uuid   id              PK  "auto-generated"
        text   fossil_name         "required"
        text   scientific_name     "optional"
        text   period              "e.g. Cretaceous"
        text   location            "e.g. Ariyalur, Tamil Nadu"
        text   description         "detailed description"
        text   image_url           "Supabase Storage URL"
        text   submitted_by        "submitter name/email"
        text   status              "pending | approved | rejected"
        timestamptz created_at     "default: now()"
        timestamptz updated_at     "auto-updated"
    }

    FOSSIL_IMAGES {
        uuid   id              PK  "auto-generated"
        uuid   fossil_id       FK  "→ FOSSIL_DETAILS.id"
        text   storage_path        "bucket/path/filename"
        text   public_url          "CDN-accessible URL"
        text   mime_type           "image/jpeg, image/png"
        int    file_size_bytes     "uploaded file size"
        timestamptz uploaded_at    "default: now()"
    }

    FOSSIL_DETAILS ||--o{ FOSSIL_IMAGES : "has"
```

> **Supabase SQL to create these tables** — run in the Supabase SQL Editor:
>
> ```sql
> -- Registrations
> CREATE TABLE registrations (
>   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   full_name    TEXT NOT NULL,
>   email        TEXT NOT NULL UNIQUE,
>   phone        TEXT,
>   institution  TEXT,
>   purpose      TEXT,
>   created_at   TIMESTAMPTZ DEFAULT NOW()
> );
>
> -- Fossil details
> CREATE TABLE fossil_details (
>   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   fossil_name     TEXT NOT NULL,
>   scientific_name TEXT,
>   period          TEXT,
>   location        TEXT,
>   description     TEXT,
>   image_url       TEXT,
>   submitted_by    TEXT,
>   status          TEXT DEFAULT 'pending',
>   created_at      TIMESTAMPTZ DEFAULT NOW(),
>   updated_at      TIMESTAMPTZ DEFAULT NOW()
> );
>
> -- Fossil images (optional extended tracking)
> CREATE TABLE fossil_images (
>   id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   fossil_id        UUID REFERENCES fossil_details(id) ON DELETE CASCADE,
>   storage_path     TEXT NOT NULL,
>   public_url       TEXT NOT NULL,
>   mime_type        TEXT,
>   file_size_bytes  INT,
>   uploaded_at      TIMESTAMPTZ DEFAULT NOW()
> );
>
> -- Row-Level Security (recommended)
> ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;
> ALTER TABLE fossil_details ENABLE ROW LEVEL SECURITY;
> ALTER TABLE fossil_images  ENABLE ROW LEVEL SECURITY;
> ```

---

## 5. CI/CD Workflow Visualization

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH  as GitHub
    participant GA  as GitHub Actions
    participant VC  as Vercel
    participant SB  as Supabase
    participant USR as End User

    DEV->>GH: git push origin main
    GH->>GA: Trigger workflow (push event)
    GA->>GA: actions/checkout@v4
    GA->>GA: npm ci (install deps)
    GA->>GA: npm run lint
    GA->>GA: npm test (Jest 69 tests)

    alt Tests Pass
        GA->>VC: Deploy trigger (webhook)
        VC->>VC: Build static frontend
        VC->>VC: Deploy serverless functions
        VC->>VC: Run smoke tests
        VC->>GH: Update deployment status ✅
        GH-->>DEV: ✅ Deployment successful
    else Tests Fail
        GA->>GH: Update status ❌
        GH-->>DEV: ❌ Build failed — check logs
    end

    USR->>VC: GET natswebsite.com
    VC-->>USR: Static HTML (CDN edge)

    USR->>VC: POST /api/register
    VC->>SB: INSERT INTO registrations
    SB-->>VC: { id: "uuid..." }
    VC-->>USR: { success: true }

    USR->>VC: POST /api/upload (multipart)
    VC->>SB: Upload to fossil-images bucket
    SB-->>VC: public URL
    VC->>SB: INSERT INTO fossil_details
    SB-->>VC: { id: "uuid..." }
    VC-->>USR: { success: true, url: "..." }
```

---

## 6. Request Flow Diagram

```mermaid
flowchart LR
    subgraph "Client Browser"
        B1[HTML Form]
        B2[JavaScript fetch()]
        B3[Response handler]
    end

    subgraph "Vercel Edge Network"
        E1[CDN / Edge Cache]
        E2[Serverless Function\nCold Start ~ 200ms]
        E3[Warm Function\nResponse ~ 50ms]
    end

    subgraph "Backend Middleware Stack"
        M1[Helmet\nSecurity headers]
        M2[CORS\nOrigin validation]
        M3[Rate Limiter\n100 req/15min]
        M4[JSON Parser\nbody-parser]
        M5[Route Handler]
        M6[Error Handler]
    end

    subgraph "Supabase"
        S1[PostgREST API]
        S2[PostgreSQL DB]
        S3[Storage API]
        S4[S3-compatible CDN]
    end

    B1 -->|submit| B2
    B2 -->|HTTPS request| E1
    E1 -->|static asset| B3
    E1 -->|API route| E2
    E2 --> M1 --> M2 --> M3 --> M4 --> M5
    M5 -->|DB query| S1 --> S2
    M5 -->|file upload| S3 --> S4
    S2 -->|result| M5
    S4 -->|public URL| M5
    M5 --> E3
    M6 -->|on error| E3
    E3 -->|JSON response| B3
    B3 -->|update UI| B1

    style E2 fill:#fff8c5,stroke:#d9a40c
    style S2 fill:#f0f7ff,stroke:#0366d6
```

---

## Architecture Decision Records

| Decision | Choice | Reason |
|----------|--------|--------|
| Cloud DB | **Supabase (PostgreSQL)** | Free tier, built-in REST API, storage included, real-time subscriptions |
| Frontend | **GitHub Pages + Vercel** | Already deployed, CDN, free, no server management |
| Backend  | **Node.js/Express on Vercel** | Serverless, scales to zero, integrates with Vercel frontend |
| Storage  | **Supabase Storage** | Co-located with DB, built-in CDN, RLS policies |
| Auth     | **Supabase RLS** | Row-level security without a separate auth service |
| CI/CD    | **GitHub Actions** | Native to GitHub, free for public repos |
