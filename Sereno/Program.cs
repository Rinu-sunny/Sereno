using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Sereno.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- 1. ADD CORS POLICY HERE ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        policy =>
        {
            // Make sure this URL matches your frontend (check Terminal 2)
            policy.WithOrigins(
                      "http://localhost:8080",  // Your frontend
                      "https://localhost:5001" // Your backend (just in case)
                  ) 
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});
// -----------------------------

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication setup (This part is correct)
var jwtSecret = builder.Configuration["Authentication:SupabaseJwtSecret"];
var jwtIssuer = builder.Configuration["Authentication:SupabaseIssuer"];
if (string.IsNullOrEmpty(jwtSecret) || string.IsNullOrEmpty(jwtIssuer))
{
    throw new InvalidOperationException("Auth secrets are not configured in appsettings.json");
}
var supabaseSecurityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // Keep this line
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = supabaseSecurityKey,
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Swagger setup (This part is correct)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Sereno API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { /* ... swagger details ... */ });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { /* ... swagger details ... */ });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();

// --- 2. ADD CORS MIDDLEWARE HERE ---
// It MUST be after UseRouting() and BEFORE UseAuthentication()/UseAuthorization()
app.UseCors();
// ----------------------------------

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();