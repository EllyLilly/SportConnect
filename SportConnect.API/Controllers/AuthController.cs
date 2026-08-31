using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SportConnect.Application.DTOs.Auth;
using SportConnect.Application.Services;
using SportConnect.Infrastructure.Entities;
using System.Security.Claims;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {

        private readonly AuthService _authService;
        private readonly UserManager<User> _userManager;

        public AuthController(AuthService authService, UserManager<User> userManager)
        {
            _authService = authService;
            _userManager = userManager;
        }

        /// <summary>
        /// Регистрация нового пользователя
        /// </summary>
        /// <response code="200">Успешная регистрация, возвращает токены</response>
        /// <response code="400">Ошибка валидации или пользователь уже существует</response>
        //POST /api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto dto)
        {
            var response = await _authService.RegisterAsync(dto);
            return Ok(response);
        }

        /// <summary>
        /// Вход в систему
        /// </summary>
        /// <response code="200">Успешный вход, возвращает токены</response>
        /// <response code="401">Неверный email или пароль</response>
        //POST /api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto dto)
        {
            var response = await _authService.LoginAsync(dto);
            return Ok(response);
        }

        /// <summary>
        /// Обновление access-токена по refresh-токену из cookie
        /// </summary>
        /// <response code="200">Новый access-токен</response>
        /// <response code="401">Refresh-токен не найден или недействителен</response>
        //POST /api/auth/refresh
        [HttpPost("refresh")]
        public async Task<ActionResult<AuthResponseDto>> Refresh()
        {
            //refresh-токен читается из cookie, которая устанавливается при логине
            var refreshToken = Request.Cookies["refreshToken"];


            //если cookie нет — пользователь не авторизован
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized("Refresh-токен не найден");
            }

            var response = await _authService.RefreshTokenAsync(refreshToken);
            return Ok(response);
        }

        /// <summary>
        /// Получить информацию о текущем пользователе
        /// </summary>
        /// <response code="200">Данные пользователя</response>
        /// <response code="401">Пользователь не авторизован</response>
        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<AuthResponseDto>> Me()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (userId == null)
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized();

            return Ok(new AuthResponseDto
            {
                Id = user.Id,
                AccessToken = "",
                UserName = user.UserName ?? "",
                Email = user.Email ?? ""
            });
        }

    }
}
