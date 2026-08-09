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
    public class Meeting
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Address { get; set; }
        public NetTopologySuite.Geometries.Point Location { get; set; } = null!;
        public DateTime ScheduledAt { get; set; }
        public int MinParticipants { get; set; }
        public int MaxParticipants { get; set; }
        public MeetingStatus Status { get; set; } = MeetingStatus.Recruiting;
        public SkillLevel RequiredSkillLevel { get; set; } = SkillLevel.Any;
        public string[]? Inventory { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        public Guid SportId { get; set; }
        public Sport Sport { get; set; } = null!;

        public Guid AuthorId { get; set; }
        public User Author { get; set; } = null!;

        public ICollection<MeetingParticipant> Participants { get; set; } = new List<MeetingParticipant>();

    }
}
