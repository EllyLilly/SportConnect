using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class TelegramConnection
    {
        public Guid UserId { get; set; }
        public long ChatId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
    }
}
