using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SportConnect.Core.Entities;


namespace SportConnect.Core.DTOs.Meetings
{
    public class MeetingListItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime ScheduledAt { get; set; }
        public MeetingStatus Status { get; set; }
        public string SportName { get; set; } = string.Empty;
        public string SportColor { get; set; } = string.Empty;
        public int ParticipantsCount { get; set; }
        public int MaxParticipants { get; set; }
    }
}
