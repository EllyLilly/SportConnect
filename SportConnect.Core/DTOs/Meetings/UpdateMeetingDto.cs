using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Core.DTOs.Meetings
{
    public class UpdateMeetingDto
    {
        public Guid SportId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime ScheduledAt { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Address { get; set; }
        public int MinParticipants { get; set; }
        public int MaxParticipants { get; set; }
        public SkillLevel RequiredSkillLevel { get; set; }
        public string[]? Inventory { get; set; }
    }
}
