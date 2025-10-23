namespace ECAD_Backend.Application.DTOs;

public sealed record PageResult<T>(
    IReadOnlyList<T> Items,
    string? NextCursor,
    bool HasMore);