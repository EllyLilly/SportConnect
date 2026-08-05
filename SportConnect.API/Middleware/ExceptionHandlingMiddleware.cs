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
                context.Response.StatusCode = ex.StatusCode;
                context.Response.ContentType = "application/json";
                var errorResponse = new { message = ex.Message, statusCode = ex.StatusCode };
                var json = JsonSerializer.Serialize(errorResponse);
                await context.Response.WriteAsync(json);
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Unhandled exception");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.ContentType = "application/json";
                var errorResponse = new { message = "Внутренняя ошибка сервера", statusCode = 500 };
                var json = JsonSerializer.Serialize(errorResponse);
                await context.Response.WriteAsync(json);
            }
        }
    }
}
