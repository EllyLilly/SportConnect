using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.DTOs.Auth
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
    }
}
