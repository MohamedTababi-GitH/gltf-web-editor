using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace ECAD_Backend.Infrastructure.Cursor;

public sealed class Base64JsonCursorSerializer : ICursorSerializer
{
    private sealed class Payload
    {
        public int V { get; set; } = 1;      // versioned for future-proofing
        public string? Ct { get; set; }      // Azure continuation token
        public string? Last { get; set; }    // last emitted blob name
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

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
        catch { /* fall through to legacy */ }

        // Legacy: treat raw string as Azure token only
        cursor = new PaginationCursor(raw, null);
        return true;
    }

    public string Serialize(PaginationCursor cursor)
    {
        var payload = new Payload { V = 1, Ct = cursor.AzureCt, Last = cursor.LastName };
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        return WebEncoders.Base64UrlEncode(bytes);
    }
}