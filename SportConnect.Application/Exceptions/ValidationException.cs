using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Exceptions
{
    public class ValidationException : AppException
    {
        public ValidationException(string message) : base(message, 400) { }
    }
}
