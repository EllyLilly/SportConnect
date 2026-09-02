using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using SportConnect.API.Hubs;
using SportConnect.API.Jobs;
using SportConnect.API.Middleware;
using SportConnect.API.Realtime;
using SportConnect.API.Validators;
using SportConnect.Application.Abstractions;
using SportConnect.Application.Services;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}

var connectionString = builder.Configuration.GetConnectionString("SportConnectConnection");

// Ѕаза данных
builder.Services.AddDbContext<SportConnectDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
        npgsqlOptions.UseNetTopologySuite()));

// Redis Cache
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "sportconnect:cache:";
    });
    Log.Information("Redis cache configured");
}
else
{
    builder.Services.AddDistributedMemoryCache();
    Log.Warning("Redis connection string not found. Using in-memory cache.");
}

// Identity
builder.Services.AddIdentity<User, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<SportConnectDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
});

// JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    // JWT из query string дл€ WebSocket (SignalR)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/meeting"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

// —ервисы
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<CurrentUserService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<MeetingService>();
builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<IMeetingRealtimeNotifier, SignalRMeetingRealtimeNotifier>();
builder.Services.AddScoped<MeetingLifecycleService>();
builder.Services.AddScoped<TelegramService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddSingleton<INotificationQueue, NotificationQueue>();
builder.Services.AddHostedService<NotificationBackgroundService>();
builder.Services.AddHostedService<MeetingLifecycleBackgroundService>();
builder.Services.AddHostedService<TelegramBotBackgroundService>();
builder.Services.AddValidatorsFromAssemblyContaining<CreateMeetingValidator>();
builder.Services.AddValidatorsFromAssemblyContaining<UpdateProfileValidator>();
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "SportConnect API",
        Version = "v1",
        Description = "API дл€ платформы SportConnect Ч организаци€ спонтанных спортивных встреч."
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "¬ведите JWT-токен в формате: Bearer {токен}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // XML-комментарии
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// SignalR + Redis Backplane
redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnection))
{
    builder.Services.AddSignalR()
        .AddStackExchangeRedis(redisConnection, options =>
        {
            options.Configuration.ChannelPrefix = "SportConnect";
        });
    Log.Information("SignalR Redis backplane configured");
}
else
{
    builder.Services.AddSignalR();
    Log.Warning("Redis connection string not found. SignalR running without backplane.");
}

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json; charset=utf-8";
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            message = "—лишком много запросов. ѕопробуйте позже.",
            statusCode = 429
        });
        await context.HttpContext.Response.WriteAsync(json, cancellationToken);
    };

    // —оздание встречи: 5 в час на пользовател€
    options.AddPolicy("CreateMeeting", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));

    // Join: 10 в минуту на пользовател€
    options.AddPolicy("JoinMeeting", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // ќбщий API: 100 в минуту на IP
    options.AddPolicy("GeneralApi", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            }));
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString: connectionString!,
        name: "PostgreSQL",
        timeout: TimeSpan.FromSeconds(5))
    .AddRedis(
        redisConnectionString: redisConnection ?? "localhost:6379",
        name: "Redis",
        timeout: TimeSpan.FromSeconds(5),
        failureStatus: null); // редис необ€зателен Ч не рон€ет ready

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        diagnosticContext.Set("UserId", userId ?? "anonymous");
        diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
    };
});

app.MapHub<MeetingHub>("/hubs/meeting");
app.MapControllers();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // зависимости не провер€ютс€, только жив ли процесс
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description
            })
        };
        await context.Response.WriteAsJsonAsync(result);
    }
});

app.Run();
