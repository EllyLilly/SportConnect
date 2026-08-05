using Microsoft.EntityFrameworkCore;
using SportConnect.Infrastructure.Entities;

namespace SportConnect.Infrastructure.Data.Seeding;

public static class SportSeeder
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Sport>().HasData(
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), Name = "Футбол", Color = "#4CAF50" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), Name = "Волейбол", Color = "#2196F3" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), Name = "Баскетбол", Color = "#FF9800" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000004"), Name = "Теннис", Color = "#9C27B0" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000005"), Name = "Настольный теннис", Color = "#00BCD4" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000006"), Name = "Бег", Color = "#FF5722" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000007"), Name = "Фитнес", Color = "#E91E63" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000008"), Name = "Прогулка", Color = "#795548" }
        );
    }
}
