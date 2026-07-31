using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class Message : BaseEntity
    {
        public string Content { get; set; }
        public Guid SenderId { get; set; }
        public User? Sender  { get; set; }
        public Guid MeetingId   { get; set; }
        public Meeting? Meeting { get; set; }
        public DateTime SentAt { get; set; }
    }
}
