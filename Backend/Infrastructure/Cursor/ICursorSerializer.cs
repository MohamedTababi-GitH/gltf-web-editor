namespace ECAD_Backend.Infrastructure.Cursor;

/// <summary>
/// Defines methods for serializing and deserializing pagination cursors
/// used for continuation-based listing operations.
/// </summary>
public interface ICursorSerializer
{
    /// <summary>
    /// Attempts to deserialize an encoded cursor string into a <see cref="PaginationCursor"/> instance.
    /// </summary>
    /// <param name="raw">The encoded cursor string to parse.</param>
    /// <param name="cursor">
    /// When this method returns, contains the deserialized <see cref="PaginationCursor"/> if successful.
    /// </param>
    /// <returns>
    /// <c>true</c> if deserialization was successful; otherwise, <c>false</c>.
    /// </returns>
    bool TryDeserialize(string? raw, out PaginationCursor cursor);

    /// <summary>
    /// Serializes a <see cref="PaginationCursor"/> into a string representation
    /// suitable for use in paginated API responses.
    /// </summary>
    /// <param name="cursor">The pagination cursor to serialize.</param>
    /// <returns>
    /// A string representation of the cursor, typically encoded for safe transport (e.g., Base64-URL).
    /// </returns>
    string Serialize(PaginationCursor cursor);
}