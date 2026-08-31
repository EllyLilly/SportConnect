using Serilog;
using SportConnect.Application.Exceptions;
using System.Net;
using System.Text.Json;

namespace SportConnect.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;

        public ExceptionHandlingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (AppException ex)
            {
                Log.Error(ex, "Application error: {Message}", ex.Message);
                await WriteProblemDetailsAsync(context, ex.StatusCode, ex.Message);
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Unhandled exception");
                await WriteProblemDetailsAsync(context, (int)HttpStatusCode.InternalServerError, "Внутренняя ошибка сервера");
            }
        }

        private static async Task WriteProblemDetailsAsync(HttpContext context, int statusCode, string detail)
        {
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/problem+json; charset=utf-8";

            var traceId = context.TraceIdentifier;

            var problemDetails = new
            {
                type = $"https://httpstatuses.com/{statusCode}",
                title = GetTitle(statusCode),
                status = statusCode,
                detail = detail,
                traceId = traceId
            };

            var json = JsonSerializer.Serialize(problemDetails);
            await context.Response.WriteAsync(json);
        }

        private static string GetTitle(int statusCode) => statusCode switch
        {
            400 => "Bad Request",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "Not Found",
            409 => "Conflict",
            429 => "Too Many Requests",
            _ => "Internal Server Error"
        };
    }
}
