namespace ECAD_Backend.Application.DTOs.ResultDTO;

public sealed record PageResult<T>(
    IReadOnlyList<T> Items,
    string? NextCursor,
    bool HasMore,
    int TotalCount = 0);