using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SportConnect.Infrastructure.Data.Seeding;
using SportConnect.Infrastructure.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SportConnect.Infrastructure.Data
{
    public class SportConnectDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
    {
        public SportConnectDbContext() { }
        public SportConnectDbContext (DbContextOptions<SportConnectDbContext> options) : base(options) { }

        public DbSet<Meeting> Meetings { get; set; }
        public DbSet<Sport> Sports { get; set; }
        public DbSet<MeetingParticipant> MeetingParticipants { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<UserSportPreference> UserSportPreferences { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            SportSeeder.Seed(builder);

            base.OnModelCreating(builder);

            // --- UserSportPreference ---
            builder.Entity<UserSportPreference>()
                .HasKey(usp => new { usp.UserId, usp.SportId });

            builder.Entity<UserSportPreference>()
                .HasOne(usp => usp.User)
                .WithMany(u => u.SportPreferences)
                .HasForeignKey(usp => usp.UserId);

            builder.Entity<UserSportPreference>()
                .HasOne(usp => usp.Sport)
                .WithMany()
                .HasForeignKey(usp => usp.SportId);

            // --- Meeting ---
            builder.Entity<Meeting>()
                .HasKey(m => m.Id);

            builder.Entity<Meeting>()
                .Property(m => m.Location)
                .HasColumnType("geography (Point, 4326)");

            builder.Entity<Meeting>()
                .HasOne(m => m.Sport)
                .WithMany()
                .HasForeignKey(m => m.SportId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Meeting>()
                .HasOne(m => m.Author)
                .WithMany()
                .HasForeignKey(m => m.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Meeting>()
                .HasIndex(m => m.IsDeleted);

            builder.Entity<Meeting>()
                .HasIndex(m => m.Status);

            builder.Entity<Meeting>()
                .HasIndex(m => m.ScheduledAt);

            builder.Entity<Meeting>()
                .HasIndex(m => new { m.IsDeleted, m.Status, m.ScheduledAt });

            builder.Entity<Meeting>()
                .HasIndex(m => m.Location)
                .HasMethod("GIST");

            // Global query filter - не возвращаем удаленные
            builder.Entity<Meeting>()
                .HasQueryFilter(m => !m.IsDeleted);

            builder.Entity<MeetingParticipant>()
                .HasKey(mp => new { mp.MeetingId, mp.UserId });

            builder.Entity<MeetingParticipant>()
                .HasOne(mp => mp.Meeting)
                .WithMany(m => m.Participants)
                .HasForeignKey(mp => mp.MeetingId);

            builder.Entity<MeetingParticipant>()
                .HasOne(mp => mp.User)
                .WithMany()
                .HasForeignKey(mp => mp.UserId);

            // Partial unique index - только для активных (не удаленных) записей
            builder.Entity<MeetingParticipant>()
                .HasIndex(mp => new { mp.MeetingId, mp.UserId })
                .IsUnique()
                .HasFilter("IsDeleted = false");

            builder.Entity<MeetingParticipant>()
                .HasIndex(mp => mp.MeetingId);

            // Global query filter
            builder.Entity<MeetingParticipant>()
                .HasQueryFilter(mp => !mp.IsDeleted);

            builder.Entity<Message>()
                .HasKey(m => m.Id);

            builder.Entity<Message>()
                .HasOne(m => m.Meeting)
                .WithMany()
                .HasForeignKey(m => m.MeetingId);

            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.UserId);

            // Global query filter
            builder.Entity<Message>()
                .HasQueryFilter(m => !m.IsDeleted);
        }
    }
}
