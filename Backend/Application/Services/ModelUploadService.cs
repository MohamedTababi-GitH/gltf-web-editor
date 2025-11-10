using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for validating and processing 3D model uploads.
/// Responsible for verifying model structure (GLB/GLTF), ensuring all referenced resources are included,
/// sanitizing file names, assigning metadata, and delegating file storage.
/// 
/// This service does not handle model metadata management or state persistence —
/// those are managed by <see cref="IModelService"/> and <see cref="IModelStateService"/> respectively.
/// </summary>
public class ModelUploadService(IModelStorage storage) : IModelUploadService
{
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

    /// <summary>
    /// Extracts external resource file URIs from a GLTF JSON string,
    /// including buffers and images, excluding embedded data URIs.
    /// </summary>
    private static List<string> ExtractReferencedUrisFromGltfJson(string gltfJson)
    {
        var uris = new List<string>();

        // very lightweight scan
        using var doc = System.Text.Json.JsonDocument.Parse(gltfJson);

        // 1. buffers[*].uri
        if (doc.RootElement.TryGetProperty("buffers", out var buffersElem) &&
            buffersElem.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var b in buffersElem.EnumerateArray())
            {
                if (b.TryGetProperty("uri", out var uriProp) &&
                    uriProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var uriVal = uriProp.GetString();
                    if (!string.IsNullOrWhiteSpace(uriVal) &&
                        !uriVal.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                        uris.Add(uriVal);
                }
            }
        }

        // 2. images[*].uri
        if (doc.RootElement.TryGetProperty("images", out var imagesElem) &&
            imagesElem.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var img in imagesElem.EnumerateArray())
            {
                if (img.TryGetProperty("uri", out var uriProp) &&
                    uriProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var uriVal = uriProp.GetString();
                    if (!string.IsNullOrWhiteSpace(uriVal) &&
                        !uriVal.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                        uris.Add(uriVal);
                }
            }
        }

        return uris;
    }

    /// <summary>
    /// Validates that all provided file streams are non-null, readable, and contain data.
    /// </summary>
    /// <param name="files">
    /// A collection of file entries, where each tuple contains the file name and its associated content stream.
    /// </param>
    /// <exception cref="BadRequestException">
    /// Thrown when any stream is null, unreadable, or empty.
    /// </exception>
    /// <remarks>
    /// This method performs lightweight validation of uploaded file streams before processing:
    /// <list type="bullet">
    /// <item><description>Ensures each stream is not <see langword="null"/> and can be read.</description></item>
    /// <item><description>Checks for zero-length <see cref="MemoryStream"/> instances.</description></item>
    /// <item><description>Performs a minimal content read on non-memory streams to confirm non-emptiness.</description></item>
    /// </list>
    /// The method resets stream positions when possible to avoid affecting downstream consumers.
    /// </remarks>
    private static void ValidateFileStreams(IReadOnlyCollection<(string FileName, Stream Content)> files)
    {
        foreach (var (fileName, content) in files)
        {
            if (content == null || !content.CanRead)
            {
                throw new BadRequestException(
                    $"The content of the file '{fileName}' is empty or unreadable. Please provide a valid file.");
            }

            // Empty MemoryStream
            if (content is MemoryStream ms && ms.Length == 0)
            {
                throw new BadRequestException(
                    $"The content of the file '{fileName}' is empty. Please provide a valid file.");
            }

            // Non-MemoryStream: try minimal content check
            if (content is not MemoryStream)
            {
                if (content.CanSeek)
                {
                    var originalPos = content.Position;
                    int b = content.ReadByte();
                    if (b == -1)
                    {
                        throw new BadRequestException(
                            $"The content of the file '{fileName}' is empty. Please provide a valid file.");
                    }

                    content.Position = originalPos;
                }
            }
        }
    }

    /// <summary>
    /// Sanitizes a file name by removing directory parts and limiting its length.
    /// </summary>
    /// <param name="s">The input string to sanitize.</param>
    /// <returns>A cleaned and safe file name string.</returns>
    static string Sanitize(string s)
    {
        s = s.Replace("/", "").Replace("\\", "").Trim();
        s = s.Replace("..", "");
        return s.Length > 120 ? s[..120] : s;
    }

    /// <summary>
    /// Validates and uploads a new 3D model (and its companion assets) into blob storage.
    /// </summary>
    /// <param name="requestDto">
    /// The upload request containing:
    /// <list type="bullet">
    /// <item><description><c>Alias</c> – user-facing name of the model (validated)</description></item>
    /// <item><description><c>OriginalFileName</c> – the main .glb/.gltf filename used as the "entry" file</description></item>
    /// <item><description><c>Files</c> – the entry model plus any referenced resources (bin, textures, etc.)</description></item>
    /// <item><description><c>Categories</c>, <c>Description</c> – optional metadata for discoverability</description></item>
    /// </list>
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UploadResultDto"/> including:
    /// <list type="bullet">
    /// <item><description><c>Message</c> – human-readable status</description></item>
    /// <item><description><c>Alias</c> – the alias that was applied</description></item>
    /// <item><description><c>BlobName</c> – the fully qualified blob path of the main entry file</description></item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// Behavior:
    /// <list type="number">
    /// <item><description>Generates a new <c>assetId</c> (a folder prefix) for this upload.</description></item>
    /// <item><description>Ensures the entry file is .glb or .gltf, and if it's .gltf, validates that all referenced external files are present.</description></item>
    /// <item><description>Uploads all provided files to <c>{assetId}/</c> with appropriate content types and blob metadata.</description></item>
    /// <item><description>Marks the "entry" file with alias, categories, description, and flags it as <c>isNew=true</c> and <c>isFavourite=false</c>.</description></item>
    /// </list>
    /// </remarks>
    /// <exception cref="BadRequestException">
    /// Thrown when the request is missing required files or the main entry file can't be found in the upload batch.
    /// </exception>
    /// <exception cref="ValidationException">
    /// Thrown when business rules fail (invalid alias, unsupported extension, missing dependencies for .gltf, etc.).
    /// </exception>
    public async Task<UploadResultDto> UploadAsync(UploadModelRequestDto requestDto,
        CancellationToken cancellationToken)
    {
        if (requestDto is null)
            throw new BadRequestException("The upload requestDto is empty. Please provide a valid requestDto.");

        if (requestDto.Files is null || requestDto.Files.Count == 0)
            throw new BadRequestException(
                "No files were provided in the upload requestDto. Please select a file to upload.");

        // Validate that all files are readable and non-empty
        ValidateFileStreams(requestDto.Files);

        // Validate alias once (applies only to an entry file)
        if (string.IsNullOrWhiteSpace(requestDto.Alias))
            throw new ValidationException("A name for the model is required. Please provide one.");
        if (!AliasRegex.IsMatch(requestDto.Alias))
            throw new ValidationException(
                "The name can only contain letters, numbers, and underscores. Please choose a different Name.");

        // Validate the entry file name
        if (string.IsNullOrWhiteSpace(requestDto.OriginalFileName))
            throw new ValidationException("The original file name is missing. Please ensure the file has a name.");

        var entryFileName = Path.GetFileName(requestDto.OriginalFileName);
        var entryExt = Path.GetExtension(entryFileName).ToLowerInvariant();

        if (entryExt != ".glb" && entryExt != ".gltf")
            throw new ValidationException("Original file must be a .glb or .gltf file.");

        // Ensure the entry file is present in Files
        var entryTuple = requestDto.Files.FirstOrDefault(f =>
            string.Equals(Path.GetFileName(f.FileName), entryFileName, StringComparison.OrdinalIgnoreCase));

        if (entryTuple.FileName is null)
            throw new BadRequestException(
                $"The main model file '{entryFileName}' is missing from the uploaded files. Please include it and try again.");

        // Extra validation ONLY for .gltf models: ensure required external files exist
        if (entryExt == ".gltf")
        {
            // 1. Read the .gltf content into memory so we can inspect references
            string gltfText;
            using (var reader = new StreamReader(entryTuple.Content, leaveOpen: true))
            {
                gltfText = await reader.ReadToEndAsync(cancellationToken);
            }

            entryTuple.Content.Position = 0; // rewind after reading so we can still upload it later

            // 2. Very light/rough dependency scan:
            //    - look for "uri": "something.bin"
            //    - look for "uri": "textures/diffuse.png"
            // We’ll grab anything that looks like an external file.
            var referencedFiles = ExtractReferencedUrisFromGltfJson(gltfText);

            // 3. Check that each referenced file name is present in requestDto.Files
            var uploadedFileNames = requestDto.Files
                .Select(f => Path.GetFileName(f.FileName))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missing = referencedFiles
                .Where(refFile => !uploadedFileNames.Contains(Path.GetFileName(refFile)))
                .ToList();

            if (missing.Count > 0)
            {
                throw new BadRequestException(
                    $"The uploaded .gltf file references external resources that were not provided: {string.Join(", ", missing)}. " +
                    "Please include all required .bin/texture files and try again.");
            }
        }

        var safeBase = Sanitize(Path.GetFileNameWithoutExtension(entryFileName));
        var assetId = Guid.NewGuid().ToString("N");

        // Upload all files under the same {assetId}/ folder
        foreach (var (fileNameRaw, content) in requestDto.Files)
        {
            if (content is null)
                throw new BadRequestException(
                    $"The content of the file '{fileNameRaw}' is empty. Please provide a valid file.");

            var fileName = Path.GetFileName(fileNameRaw);
            var ext = Path.GetExtension(fileName).ToLowerInvariant();

            // Allow only specific companion files
            bool isEntry = string.Equals(fileName, entryFileName, StringComparison.OrdinalIgnoreCase);
            bool isAllowed = isEntry || ext is ".bin" or ".png" or ".jpg" or ".jpeg" or ".webp" or ".ktx2";

            if (!isAllowed)
                throw new ValidationException(
                    $"The file type of '{fileName}' is not supported. Please upload a valid file type.");

            var blobName = $"{assetId}/{fileName}";
            var contentType = ext switch
            {
                ".glb" => "model/gltf-binary",
                ".gltf" => "model/gltf+json",
                ".bin" => "application/octet-stream",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                ".ktx2" => "image/ktx2",
                _ => "application/octet-stream"
            };

            // Metadata: alias ONLY on the entry .glb/.gltf
            var metadata = new Dictionary<string, string>
            {
                ["basename"] = fileName,
                ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O"),
                ["assetId"] = assetId
            };

            if (isEntry)
            {
                metadata["alias"] = requestDto.Alias;

                if (requestDto.Categories is { Count: > 0 })
                    metadata["categories"] = string.Join(",", requestDto.Categories.Select(c => c.Trim()));

                if (!string.IsNullOrWhiteSpace(requestDto.Description))
                    metadata["description"] = requestDto.Description.Trim();

                metadata["isFavourite"] = "false";
                metadata["isNew"] = "true";
            }

            await storage.UploadAsync(blobName, content, contentType, metadata, cancellationToken);
        }
        
        if (!string.IsNullOrWhiteSpace(requestDto.BaselineJson))
        {
            // Validate JSON
            try
            {
                System.Text.Json.JsonDocument.Parse(requestDto.BaselineJson);
            }
            catch (System.Text.Json.JsonException)
            {
                throw new ValidationException("BaselineJson must be valid JSON.");
            }

            // Enforce size ceiling (1 MB)
            var baselineBytes = System.Text.Encoding.UTF8.GetBytes(requestDto.BaselineJson);
            if (baselineBytes.Length > 1_000_000)
                throw new ValidationException("BaselineJson is too large.");

            // Upload (overwrite if exists)
            var baselineBlob = $"{assetId}/baseline/baseline.json";
            using var ms = new MemoryStream(baselineBytes);

            var baselineMetadata = new Dictionary<string, string>
            {
                ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O"),
                ["assetId"] = assetId,
                ["isBaselineFile"] = "true"
            };

            await storage.UploadOrOverwriteAsync(
                blobName: baselineBlob,
                content: ms,
                contentType: "application/json",
                metadata: baselineMetadata,
                ct: cancellationToken);
        }


        return new UploadResultDto
        {
            Message = "Uploaded successfully.",
            Alias = requestDto.Alias,
            BlobName = $"{assetId}/{safeBase}{entryExt}"
        };
    }
}