using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.UseAuthorization();

app.MapControllers();

app.Run();
