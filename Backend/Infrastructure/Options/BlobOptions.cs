namespace ECAD_Backend.Infrastructure.Options;

/// <summary>
/// This class represents the configuration options (settings) for connecting to Azure Blob Storage.
/// It's a simple "POCO" (Plain Old CLR Object) — no logic, just data.
///ASP.NET Core automatically binds this to our appsettings.json or user secrets.
///</summary>

public class BlobOptions
{
    ///<summary>
    /// The full connection string to your Azure Storage account.
    /// You usually keep this in a secret or environment variable.
    /// Example: "DefaultEndpointsProtocol=https;AccountName=NikolaiIvanov;AccountKey=abc123;EndpointSuffix=core.windows.net"
    ///</summary>
    public string? ConnectionString { get; set; }
    
    ///<summary>
    /// The name of the blob container that holds our model files
    /// Each container in Azure Storage acts like a top-level folder.
    /// This allows us to separate different types of data (e.g., "models", "thumbnails", "logs", etc).
    ///</summary>
    public string? ContainerModels { get; set; }
}