namespace ECAD_Backend.Infrastructure.Cursor;

public interface ICursorSerializer
{
    bool TryDeserialize(string? raw, out PaginationCursor cursor);
    string Serialize(PaginationCursor cursor);
}