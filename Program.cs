using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Sereno.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- 1. ADD CORS POLICY ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            // IMPORTANT: Replace the URL below with your actual Vercel Frontend URL
            policy.WithOrigins("https://sereno-u1sb.onrender.com") 
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication setup
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
        options.MapInboundClaims = false;
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

// Swagger setup
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Sereno API", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();

// --- 2. APPLY CORS MIDDLEWARE ---
// Must be after UseRouting() and before UseAuthentication()
app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();