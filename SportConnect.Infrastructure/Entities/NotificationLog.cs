using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class NotificationLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public Guid? MeetingId { get; set; }
        public string Type { get; set; } = "Telegram";
        public string Status { get; set; } = "Pending"; // Pending, Sent, Failed
        public string? ErrorMessage { get; set; }
        public string? Content { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
    }
}
