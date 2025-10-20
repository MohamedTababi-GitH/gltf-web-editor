using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;
using ECAD_Backend.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// adding Global exception handeler
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();
builder.Services.AddExceptionHandler<NotFoundExceptionHandler>();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>(); // Keep this last
builder.Services.AddProblemDetails(); ;


//CORS for frontend dev host(adjust if needed)
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins("http://localhost:5173", "https://localhost:3000")
    .AllowAnyHeader().AllowAnyMethod()));

// bind option
builder.Services.Configure<BlobOptions>(builder.Configuration.GetSection("Storage"));
// register storage service
builder.Services.AddScoped<IModelStorage, AzureBlobModelStorage>();
builder.Services.AddScoped<IModelService, ModelService>();

var app = builder.Build();

app.UseCors("frontend");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Enable Global exception handler
app.UseExceptionHandler();

app.UseDefaultFiles();

// Enable static files (React build in wwwroot)
app.UseStaticFiles();

// Optional: enable routing middleware
app.UseRouting();



app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();
