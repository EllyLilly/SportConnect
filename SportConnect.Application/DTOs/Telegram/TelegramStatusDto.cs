using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.DTOs.Telegram
{
    public class TelegramStatusDto
    {
        public bool IsConnected { get; set; }
        public DateTime? ConnectedAt { get; set; }
    }
}
