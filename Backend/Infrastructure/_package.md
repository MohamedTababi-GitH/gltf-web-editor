# Infrastructure
Technical adapters (Azure, DB, FileSystem).
- Storage: AzureBlobModelStorage implements IModelStorage (I/O only).
- Options: BlobOptions for DI-bound configuration.
- No business rules, no controllers.
  Namespaces:
- ECAD_Backend.Infrastructure.Storage
- ECAD_Backend.Infrastructure.Options