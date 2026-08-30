using SportConnect.Infrastructure.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Application.Abstractions
{
    public interface INotificationQueue
    {
        void Enqueue(NotificationLog notification);
        Task<NotificationLog?> DequeueAsync(CancellationToken ct = default);
    }
}
