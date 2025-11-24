ECAD Backend – Developer Onboarding

Backend for the ECAD 3D Model Viewer — a stateless .NET 8 REST API using Azure Blob Storage for 3D models and metadata.
This guide helps new developers clone, run, test, and contribute quickly.

⸻

# Setup
1.	Install .NET 8 SDK and an IDE (Rider or VS Code + C# Dev Kit). (See OS Section for more detail)
2.	Clone the repo and open the backend solution (Backend/).
3.	Configure storage in appsettings.Development.json (see below).
4.	Run locally:

```bash
dotnet restore && dotnet run
```
5. Open Swagger http://localhost:5184/swagger/index.html
6. Test by uploading a simple model and listing it

**Requirements:**
-	.NET 8 SDK
-	Git

## OS
### macOS
```bash
# 1. Install dependencies
brew install --cask dotnet-sdk
brew install git
brew install --cask visual-studio-code

# 2. (Optional) Install Azurite for local blob testing
brew install azurite
azurite --silent &   # runs on ports 10000–10002

# 3. Verify
dotnet --version


git clone https://github.com/MohamedTababi-GitH/gltf-web-editor.git
cd Backend
dotnet restore
dotnet run
# Open: http://localhost:5184/swagger
```

### windows
```bash
# 1. Install .NET 8 SDK
winget install Microsoft.DotNet.SDK.8

# 2. Install Git
winget install Git.Git

# 3. (Optional) Install Azurite (requires Node.js)
npm install -g azurite
azurite --silent &

git clone https://github.com/MohamedTababi-GitH/gltf-web-editor.git
cd Backend
dotnet restore
dotnet run
# Open: http://localhost:5184/swagger
```
# Configuration

Create or update your appsettings.Development.json:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Storage": {
    "ConnectionString": "replace_with_connection_string",
    "ContainerModels": "data"
  }
}
```
Never commit real secrets or production connection strings.

# Layout
```
Application/      # Business logic, DTOs, Mappers, Interfaces, services
Domain/           # Core entities, domain models
Infrastructure/   # Azure Blob storage logic, exceptions, options, cursor
Web/              # ASP.NET Core host, Controllers, middleware
UnitTests/        
```
-	Controllers are thin → Services handle validation & orchestration
-	Storage logic lives in Infrastructure/Storage/
-	DTOs define clean API boundaries

# Run & Tests
Local run
```bash
dotnet restore
dotnet build
dotnet run
```

- Swagger UI:  http://localhost:5184/swagger
- Adjust ports in launchSettings.json if needed

**Tests**
```
dotnet test
```

**Common dev commands**
```bash
# Restore deps
dotnet restore

# Build + format
dotnet build -c Debug
dotnet format

# Run in HTTPS profile
dotnet run --launch-profile https

# Run all tests
dotnet test --logger "trx;LogFileName=TestResults.trx"
```

# CI/CD via GitHub Actions
-	CI: On every push → restore, build, test, and verify Swagger generation.
-	CD: On main branch → publish to Azure App Service automatically using configured secrets: AZURE_WEBAPP_PUBLISH_PROFILE & STORAGE_CONNECTION_STRING

Pipelines are defined in .github/workflows/*.yml.
Developers don’t deploy manually — just push and wait for green builds

For more details please contact Full Stack Lead @Mohammed_Tababi (Caesar)

# Troubleshooting
- Swagger is not loading — Check port/profile in launchSettings.json
- Blob auth errors — Verify SAS or connection string (rwl + d permissions)
- Upload too large — Check body size limits (25MB)
- CORS errors — Update allowed origins in Program.cs
- Models aren't listed — Contact Frontend Lead @Manav_Dave for the env file

In case there is a specific error, please contact Backend Team lead — @Nikolai_Ivanov
# Contributing
1.	Create a feature branch.
2.	Keep PRs small and testable.
3.	Update Swagger examples for new endpoints.
4.	If setup steps change, update this file.

---
Last updated: 5.11.2025

Maintainer: @Nikolai_Ivanov