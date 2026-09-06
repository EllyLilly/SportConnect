using Microsoft.EntityFrameworkCore;
using SportConnect.Infrastructure.Entities;

namespace SportConnect.Infrastructure.Data.Seeding;

public static class SportSeeder
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Sport>().HasData(
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), Name = "Футбол", Color = "#708D81" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), Name = "Волейбол", Color = "#B56576" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), Name = "Баскетбол", Color = "#E56B6F" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000004"), Name = "Теннис", Color = "#EAAC8B" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000005"), Name = "Настольный теннис", Color = "#F4D58D" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000006"), Name = "Бег", Color = "#DD6E42" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000007"), Name = "Фитнес", Color = "#6D597A" },
            new Sport { Id = Guid.Parse("10000000-0000-0000-0000-000000000008"), Name = "Прогулка", Color = "#4F6D7A" }
        );
    }
}
