> This onboarding is tailored for the **backend** service that powers the ECAD 3D Model Viewer (stateless REST API on Azure, Blob Storage for models & metadata). New contributors should be able to clone, run, test, and ship in under an hour.

---

## TL;DR (10‑minute setup)

1) **Install** .NET 8 SDK and a C# IDE (Rider or VS Code + C# Dev Kit).

2) **Clone** the repo and open the backend project (folder typically named `Backend` or similar).

3) **Run**: `dotnet run` → open **Swagger** at `http://localhost:5184/swagger/index.html`.

4) **Smoke test**: Use Swagger to **upload** a small `.glb/.gltf` and **list**/download it.

5) **Coding**: new endpoints go under `Controllers` + services in `Application/…`, storage in `Infrastructure/…`.

---

## 1) What this service does

- **Purpose**: Exposes REST endpoints for the web client to **upload**, **store**, **list**, **fetch**, and **inspect metadata** of 3D models (`.glb/.gltf`).
- **Stateless**: No server‑side sessions; persistence via **Azure Blob Storage** only.
- **OpenAPI**: Swagger UI is enabled by default for quick testing.

> The high‑level workflow: **Upload → Store → List → View → Interact → (optional) Diff → Save / Store**.

---

## 2) System requirements

- **OS**: Windows, macOS, or Linux
- **Runtime**: .NET 8 SDK
- **IDE**: Rider / VS Code
- **Tools**: Git, Azure CLI (optional), Docker Desktop (optional for container runs)

---

## 3) Project layout (conventions)

```
Backend/
  Application/
    DTOs/
    Interfaces/
    Services/
    Mappers/
  Domain/ 
  Infrastructure/
  UnitTests/
  Web/
  
  Controllers/
  Program.cs           
  appsettings.json
  appsettings.Development.json
  launchSettings.json
```

- **Application/**: business logic and service abstractions (unit‑testable).
- **Infrastructure/**: frameworks & I/O (Azure Blob SDK, middleware, options binding, etc.).
- **Controllers/**: thin transport layer, validate → delegate to services → shape responses.

---

## 4) Running the API locally

### Using `dotnet run`

```bash
dotnet restore
dotnet build
DOTNET_ENVIRONMENT=Development dotnet run
```

- **Swagger**: `http://localhost:5184/swagger`
- **HTTPS**: `https://localhost:7274/swagger`
- These ports come from `launchSettings.json` and may differ if you change profiles.

### Using Docker (optional)

A `Container (Dockerfile)` launch profile is present. Typical pattern:

```bash
docker build -t ecad-backend .
docker run -p 8080:8080 -p 8081:8081 ecad-backend
# then open http://localhost:8080/swagger
```

---

## 5) Configuration & secrets

We use standard **ASP.NET configuration** precedence: `appsettings.json` → `appsettings.{Environment}.json` → Environment variables → User Secrets.

### Storage settings

```json
{
  "Storage": {
    "ConnectionString": "<connection string OR SAS container URL>",
    "ContainerModels": "data"
  }
}
```

- **ConnectionString** can be a full connection string **or** a **SAS URL to the models container** (e.g., `https://<account>.blob.core.windows.net/data?<SAS>`). The Blob client factory handles both.
- **ContainerModels** is the blob container name for 3D assets (default `data`).

### Do not commit secrets

- Never commit real keys/SAS tokens to Git. Use one of:
    - **User Secrets** (local only):
      ```bash
      dotnet user-secrets init
      dotnet user-secrets set "Storage:ConnectionString" "<your non-prod secret>"
      ```
    - **Environment variables**:
        - Windows PowerShell: `$Env:Storage__ConnectionString="..."`
        - bash/zsh: `export Storage__ConnectionString="..."`
    - **Azure App Settings** in the deployed App Service (for prod/staging).

> If you must place a temporary SAS for a demo, ensure it **expires soon** and rotate it after use.

---

## 6) Middleware & error handling

- A **global exception handler** returns consistent problem responses; avoid `try/catch` in controllers unless you add context and rethrow.
- Enable/disable middleware exclusively in `Program.cs` (don’t scatter pipeline config).
- Prefer returning **ProblemDetails** for 4xx/5xx; include a stable error code for the frontend.

---

## 7) Storage access (Azure Blob)

- Access is centralized via an injected `BlobContainerClient` and storage service(s) under `Infrastructure/Storage`.
- **Foldering**: use virtual prefixes per tenant/user/model as needed, do not rely on real folders.
- Store **small metadata** as blob metadata or sidecar JSON blobs; keep the API stateless.
- When uploading:
    - Validate content type/extension (`.glb`, `.gltf`).
    - Generate deterministic blob names or GUID‑based names.
    - Consider size limits and return 413 on oversize.

---

## 8) API surface (current & planned)

> Keep controllers thin; put validations and transforms in dedicated services.

Typical endpoints (names may vary—align with the current controllers):

- `POST /models` — upload a model (multipart/form‑data or direct stream)
- `GET /models` — list models (+ paging via cursor)
- `GET /models/{id}` — download model file
- `GET /models/{id}/meta` — fetch metadata (name, size, timestamp, hash, etc.)
- `DELETE /models/{id}` — delete model

**Response shapes** should be documented in Swagger with clear examples. Return 4xx with actionable messages on validation errors.

---

## 9) Coding standards

- **Nullability** enabled, async end‑to‑end, `CancellationToken` on I/O paths.
- Validate inputs using **FluentValidation** or minimal custom validators.
- Keep **DTOs** separate from storage entities; map via a small mapper layer.
- Unit‑test services with **storage mocked**; integration tests can run against **Azurite** (Docker) or a short‑lived SAS.

---

## 10) Testing

```bash
dotnet test
```

- Add **unit tests** under `Tests/` mirroring `Application/` packages.
- For integration tests, prefer **Azurite**:

```bash
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite
# use UseDevelopmentStorage=true or the Azurite endpoint in your config
```

---

## 11) CI/CD (outline)

- **CI**: restore, build, test; publish artifacts.
- **CD**: deploy to Azure App Service; set `Storage:ConnectionString` as an **App Setting** (not in code).
- Gate release on tests + basic health probe (`/health` if available).

---

## 12) Troubleshooting

- **Swagger doesn’t open** → check you’re using the correct profile/port; confirm `launchSettings.json`.
- **401/403 to Blob** → SAS expired or missing permission (`rwl` at least for read/write/list; `d` for delete when needed).
- **Large file upload fails** → verify Kestrel/body size limits and reverse proxy size limits.
- **CORS** errors in frontend → add allowed origins in API CORS policy for dev.
- **MIME type missing** → set proper `ContentType` on upload; some viewers rely on it.

---

## 13) Contributing workflow

1. Create a feature branch.
2. Keep PRs small (<300 LOC where possible) with tests.
3. Describe schema/contract changes in the PR and add Swagger examples.
4. Update this onboarding if you change setup steps.

---

## 14) Useful commands

```bash
# Restore
dotnet restore

# Build
dotnet build -c Debug

# Run with explicit environment
dotnet run --launch-profile https

# Format
dotnet format

# Tests
dotnet test --logger "trx;LogFileName=TestResults.trx"
```

---

## 15) Appendix — Example `appsettings.Development.json`

> Replace placeholders with your own non‑prod values. Do **not** commit secrets.

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "Storage": {
    "ConnectionString": "https://<account>.blob.core.windows.net/data?<SAS>",
    "ContainerModels": "data"
  }
}
```

---

## 16) Appendix — Health & readiness (optional)

- Add `/health` and `/readiness` endpoints if not present yet; wire into Azure probe.
- Use them to verify Blob connectivity (optional, beware of probe cost/latency).

---

**Last updated:** {{ set this when you edit }}

