namespace ECAD_Backend.Infrastructure.Cursor;

/// <summary>
/// Represents a pagination cursor used to continue listing operations
/// across multiple pages of results in storage or data queries.
/// </summary>
/// <param name="AzureCt">
/// The Azure continuation token returned by the underlying storage provider.
/// </param>
/// <param name="LastName">
/// The name of the last processed item, used to resume enumeration in ordered listings.
/// </param>
public readonly record struct PaginationCursor(string? AzureCt, string? LastName);