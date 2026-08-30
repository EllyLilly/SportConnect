using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.DTOs.Telegram
{
    public class GenerateTelegramCodeDto
    {
        public string Code { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
    }
}
