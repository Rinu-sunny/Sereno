using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Sereno.Data;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORS CONFIGURATION ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://sereno-rho.vercel.app",
                "http://localhost:5001")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- 2. ASYMMETRIC AUTHENTICATION ---
var jwtIssuer = builder.Configuration["https://ehdwihmbalkflpvqtvcy.supabase.co/auth/v1"];
var jwksUrl = $"{jwtIssuer}/.well-known/jwks.json";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true
        };

        // Automatically fetch public keys from Supabase
        options.ConfigurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            jwksUrl,
            new OpenIdConnectConfigurationRetriever());
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- 3. PIPELINE ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.Use(async (context, next) =>
{
    Console.WriteLine($"REQUEST HIT: {context.Request.Method} {context.Request.Path} | Origin: {context.Request.Headers["Origin"]}");
    await next();
});
// CORS must be before Authentication
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/cors-test", () => "ok").RequireCors("AllowFrontend");
app.MapControllers();

app.Run();

