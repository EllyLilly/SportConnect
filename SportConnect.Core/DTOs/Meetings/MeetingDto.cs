using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Core.DTOs.Meetings
{
    public class MeetingDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime ScheduledAt { get; set; }
        public int MinParticipants { get; set; }
        public int MaxParticipants { get; set; }
        public MeetingStatus Status { get; set; }
        public SkillLevel RequiredSkillLevel { get; set; }
        public SkillLevel AuthorSkillLevel { get; set; }
        public string[]? Inventory { get; set; }
        public Guid SportId { get; set; }
        public string SportName { get; set; } = string.Empty;
        public string SportColor { get; set; } = string.Empty;
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public int ParticipantsCount { get; set; }
        public List<MeetingParticipantDto> Participants { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public bool CanEdit { get; set; }
        public bool CanJoin { get; set; }
        public bool CanLeave { get; set; }
        public int TimeUntilStartMinutes { get; set; }
    }
}
