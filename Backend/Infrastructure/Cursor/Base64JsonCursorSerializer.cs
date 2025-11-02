using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace ECAD_Backend.Infrastructure.Cursor;

/// <summary>
/// Provides functionality for serializing and deserializing pagination cursors
/// using a compact Base64-URL encoded JSON format.
/// </summary>
/// <remarks>
/// This serializer encodes Azure continuation tokens and related metadata
/// into a versioned JSON payload for forward compatibility.
/// </remarks>
public sealed class Base64JsonCursorSerializer : ICursorSerializer
{
    /// <summary>
    /// Internal representation of a serialized pagination cursor payload.
    /// Includes versioning for backward compatibility.
    /// </summary>
    private sealed class Payload
    {
        /// <summary>
        /// Gets or sets the payload version number.
        /// </summary>
        public int V { get; set; } = 1; // versioned for future-proofing

        /// <summary>
        /// Gets or sets the Azure continuation token.
        /// </summary>
        public string? Ct { get; set; } // Azure continuation token

        /// <summary>
        /// Gets or sets the name of the last emitted blob.
        /// </summary>
        public string? Last { get; set; } // last emitted blob name
    }


    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Attempts to deserialize an encoded cursor string into a <see cref="PaginationCursor"/> instance.
    /// </summary>
    /// <param name="raw">The encoded cursor string.</param>
    /// <param name="cursor">When this method returns, contains the deserialized cursor if successful.</param>
    /// <returns><c>true</c> if deserialization succeeded; otherwise, <c>false</c>.</returns>
    public bool TryDeserialize(string? raw, out PaginationCursor cursor)
    {
        cursor = default;
        if (string.IsNullOrWhiteSpace(raw)) return false;

        // Try opaque Base64Url JSON first
        try
        {
            var json = System.Text.Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(raw));
            var p = JsonSerializer.Deserialize<Payload>(json, JsonOptions);
            if (p is not null && p.V >= 1)
            {
                cursor = new PaginationCursor(p.Ct, p.Last);
                return true;
            }
        }
        catch
        {
            /* fall through to legacy */
        }

        // Legacy: treat raw string as Azure token only
        cursor = new PaginationCursor(raw, null);
        return true;
    }

    /// <summary>
    /// Serializes a <see cref="PaginationCursor"/> into a Base64-URL encoded JSON string.
    /// </summary>
    /// <param name="cursor">The cursor to serialize.</param>
    /// <returns>A Base64-URL encoded string representing the serialized cursor.</returns>
    public string Serialize(PaginationCursor cursor)
    {
        var payload = new Payload { V = 1, Ct = cursor.AzureCt, Last = cursor.LastName };
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        return WebEncoders.Base64UrlEncode(bytes);
    }
}