# Application
Use-case/business logic (Spring "service" layer).
- Interfaces: interfaces used by services (e.g., IModelService) and ports (IModelStorage).
- DTOs: request/response types for services (no ASP.NET types).
- Services: orchestrate validation, naming, metadata, and call Infrastructure via abstractions.
  Namespaces:
- ECAD_Backend.Application.Abstractions
- ECAD_Backend.Application.DTOs
- ECAD_Backend.Application.Services