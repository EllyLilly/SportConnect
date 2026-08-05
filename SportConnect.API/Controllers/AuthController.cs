using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using SportConnect.Application.DTOs.Auth;
using SportConnect.Application.Services;

namespace SportConnect.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {

        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        //POST /api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto dto)
        {
            var response = await _authService.RegisterAsync(dto);
            return Ok(response);
        }

        //POST /api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto dto)
        {
            var response = await _authService.LoginAsync(dto);
            return Ok(response);
        }

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

    }
}
