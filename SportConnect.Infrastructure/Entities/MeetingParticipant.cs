using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class MeetingParticipant : BaseEntity
    {
        public Guid MeetingId { get; set; }
        public Meeting? Meeting { get; set; }
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public DateTime JoinedAt { get; set; }
    }
}
