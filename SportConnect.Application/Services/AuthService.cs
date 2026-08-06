using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SportConnect.Application.DTOs.Auth;
using SportConnect.Application.Exceptions;
using SportConnect.Infrastructure.Data;
using SportConnect.Infrastructure.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Services
{
    public class AuthService
    {
        private readonly SportConnectDbContext _db;

        private readonly IJwtService _jwtService;

        private readonly UserManager<User> _userManager;

        private readonly IHttpContextAccessor _httpContextAccessor;
        public AuthService(SportConnectDbContext db, IJwtService jwtService, UserManager<User> userManager, IHttpContextAccessor httpContextAccessor)
        {
            _db = db;
            _jwtService = jwtService;
            _userManager = userManager;
            _httpContextAccessor = httpContextAccessor;

        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto)
        {
            var existingUserByEmail = await _userManager.FindByEmailAsync(dto.Email);
            if (existingUserByEmail != null)
            {
                throw new ConflictException("Пользователь с таким email уже существует");
            }

            var existingUserByName = await _userManager.FindByNameAsync(dto.UserName);
            if (existingUserByName != null)
            {
                throw new ConflictException("Пользователь с таким именем уже существует");
            }

            var newUser = new User
            {
                UserName = dto.UserName,
                Email = dto.Email
            };

            //сохранение польз в базе    
            var result = await _userManager.CreateAsync(newUser, dto.Password);

            //проверка на успешное создание пользователя
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ValidationException("Ошибка при создании пользователя: " + errors);
            }

            //генерация access-токена для входа
            var accessToken = _jwtService.GenerateAccessToken(newUser);

            //генерация refresh-токена для продления ключа
            var refreshTokenValue = _jwtService.GenerateRefreshToken();

            //сохранение refresh-токена в базу
            var refreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                UserId = newUser.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _db.RefreshTokens.Add(refreshToken);
            await _db.SaveChangesAsync();

            //возврат с access-токеном
            return new AuthResponseDto
            {
                AccessToken = accessToken,
                UserName = newUser.UserName,
                Email = newUser.Email
            };

        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto)
        {
          

            //поиск польз по почте
            var user = await _userManager.FindByEmailAsync(dto.Email);

            if (user == null)
            {
                throw new ValidationException("Неверный email или пароль");
            }

            //проверка пароля
            bool passwordCorrect = await _userManager.CheckPasswordAsync(user, dto.Password);

            if(!passwordCorrect) {
                throw new ValidationException("Неверный email или пароль");
            }

            //генерация access-токена для входа
            var accessToken = _jwtService.GenerateAccessToken(user);

            //генерация refresh-токена для продления ключа
            var refreshTokenValue = _jwtService.GenerateRefreshToken();

            //сохранение refresh-токена в базу
            var refreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _db.RefreshTokens.Add(refreshToken);
            await _db.SaveChangesAsync();

            //установка cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,       //защита от кражи
                Expires = refreshToken.ExpiresAt,
                Secure = true,         //передача только по HTTPS
                SameSite = SameSiteMode.Strict  //защита от атак с других сайтов
            };

            //помещение refresh-токен в cookie
            _httpContextAccessor.HttpContext.Response.Cookies.Append("refreshToken", refreshTokenValue, cookieOptions);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                UserName = user.UserName,
                Email = user.Email
            };
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
        {
            var token = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
            if (token == null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
            {
                throw new ValidationException("Неверный токен");
            }

            var user = await _userManager.FindByIdAsync(token.UserId.ToString());

            token.IsRevoked = true;

            //генерация access-токена для входа
            var accessToken = _jwtService.GenerateAccessToken(user);

            //генерация refresh-токена для продления ключа
            var refreshTokenValue = _jwtService.GenerateRefreshToken();

            //сохранение refresh-токена в базу
            var newRefreshToken = new RefreshToken
            {
                Token = refreshTokenValue,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _db.RefreshTokens.Add(newRefreshToken);
            await _db.SaveChangesAsync();

            //установка cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,       //защита от кражи
                Expires = newRefreshToken.ExpiresAt,
                Secure = true,         //передача только по HTTPS
                SameSite = SameSiteMode.Strict  //защита от атак с других сайтов
            };

            //помещение refresh-токен в cookie
            _httpContextAccessor.HttpContext.Response.Cookies.Append("refreshToken", refreshTokenValue, cookieOptions);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                UserName = user.UserName,
                Email = user.Email
            };
        }
    }
}
