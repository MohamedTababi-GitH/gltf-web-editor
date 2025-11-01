namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents a paginated result set containing items of type T.
/// </summary>
/// <typeparam name="T">The type of items in the result set.</typeparam>
public sealed record PageResultDto<T>(
    IReadOnlyList<T> Items, // Gets the collection of items for the current page.
    string? NextCursor,     // Gets the cursor for retrieving the next page.
    bool HasMore,           // Gets a value indicating whether there are more items available beyond the current page.
    int TotalCount = 0);    // Gets the total number of items across all pages.