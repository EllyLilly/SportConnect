using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Core.DTOs.Meetings
{
    public class MeetingHistoryItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SportName { get; set; } = string.Empty;
        public string SportColor { get; set; } = string.Empty;
        public MeetingStatus Status { get; set; }
        public DateTime ScheduledAt { get; set; }
        public int ParticipantsCount { get; set; }
        public int MaxParticipants { get; set; }
        public bool IsReadOnly { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string ResultLabel => Status switch
        {
            MeetingStatus.Completed => "Состоялась",
            MeetingStatus.Cancelled => "Отменена",
            _ => ""
        };
    }
}
