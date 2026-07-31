using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NetTopologySuite.Geometries;

namespace SportConnect.Infrastructure.Entities
{
    public class Meeting : BaseEntity
    {
        public string Title { get; set; }
        public string? Description { get; set; }
        public Guid SportId { get; set; }
        public Sport Sport { get; set; }
        public Guid CreatorId { get; set; }
        public User Creator { get; set; }
        public NetTopologySuite.Geometries.Point Location { get; set; }
        public DateTime MeetingTime { get; set; } = DateTime.UtcNow;
        public int MinParticipants { get; set; }
        public int MaxParticipants { get; set; }
        public string Status { get; set; } = "Идет набор";
        public ICollection<MeetingParticipant> Participants { get; set; } = new List<MeetingParticipant>();

    }
}
