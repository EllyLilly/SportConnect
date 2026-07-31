using SportConnect.Core.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Entities
{
    public class Sport : BaseEntity
    {
        public string Name { get; set; }
        public string? Icon { get; set; }
        public string? Color { get; set; }
    }
}
