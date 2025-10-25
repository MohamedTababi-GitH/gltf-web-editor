using Azure.Storage.Blobs;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure.Cursor;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;
using Microsoft.Extensions.Options;
using ECAD_Backend.Middleware;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

// Options: bind once
services.Configure<BlobOptions>(builder.Configuration.GetSection("Storage"));

// Cursor serializer (stateless)
services.AddSingleton<ICursorSerializer, Base64JsonCursorSerializer>();

builder.Services.AddProblemDetails();

// Add specific exception handlers
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();

// adding Global exception handeler
builder.Services.AddExceptionHandler<GlobalExceptionHandler>(); // Keep this last
// Blob container factory: supports either a SAS container URL or a real connection string
services.AddSingleton<BlobContainerClient>(sp =>
{
    var opts = sp.GetRequiredService<IOptions<BlobOptions>>().Value;
    if (string.IsNullOrWhiteSpace(opts.ConnectionString))
        throw new InvalidOperationException("Storage:ConnectionString is required.");

    // If it's a SAS URL to a *container*, construct the client from the Uri directly.
    if (opts.ConnectionString.TrimStart().StartsWith("http", StringComparison.OrdinalIgnoreCase))
    {
        // Ex: https://account.blob.core.windows.net/data?<SAS>
        return new BlobContainerClient(new Uri(opts.ConnectionString));
    }

    // Otherwise treat it as an account connection string and use the configured container name.
    var containerName = string.IsNullOrWhiteSpace(opts.ContainerModels) ? "data" : opts.ContainerModels;
    var serviceClient = new BlobServiceClient(opts.ConnectionString);
    return serviceClient.GetBlobContainerClient(containerName);
});

// App services
services.AddScoped<IModelStorage, AzureBlobModelStorage>();
services.AddScoped<IModelService, ModelService>();

// MVC / Swagger / CORS
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins("http://localhost:5173", "https://localhost:3000")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors("frontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Enable Global exception handler
app.UseExceptionHandler();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();