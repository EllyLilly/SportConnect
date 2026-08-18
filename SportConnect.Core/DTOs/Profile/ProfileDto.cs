using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Core.DTOs.Profile
{
    public class ProfileDto
    {
        public string Email { get; set; } = string.Empty;
        public string? UserName { get; set; }
        public int RadiusMeters { get; set; }
        public SkillLevel SkillLevel { get; set; }
        public List<Guid> SportIds { get; set; } = new();
    }
}
