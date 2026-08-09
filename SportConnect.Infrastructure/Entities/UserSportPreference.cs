using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class UserSportPreference
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = null;
        public Guid SportId { get; set; }
        public Sport Sport { get; set; } = null;
    }
}
