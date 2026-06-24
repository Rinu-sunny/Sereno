using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Sereno.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORS CONFIGURATION ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
                origin.EndsWith(".vercel.app") ||
                origin == "http://localhost:5173" ||
                origin == "http://localhost:5001")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- 2. DATABASE ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- 3. JWT AUTHENTICATION (Supabase HS256 symmetric key) ---
var jwtSecret = builder.Configuration["Authentication:SupabaseJwtSecret"];
var jwtIssuer = "https://ehdwihmbalkflpvqtvcy.supabase.co/auth/v1";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecret!)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// --- 4. PIPELINE ---
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

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/cors-test", () => "ok").RequireCors("AllowFrontend");
app.MapControllers();

app.Run();