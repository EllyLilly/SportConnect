using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class User : IdentityUser<Guid>
    {
        public int RadiusMeters { get; set; } = 3000;
        public string? SkillLevel { get; set; }
    }
}
