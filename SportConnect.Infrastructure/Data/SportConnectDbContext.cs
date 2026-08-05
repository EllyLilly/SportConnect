using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
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

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Meeting>()
                .Property(m => m.Location)
                .HasColumnType("geography (Point, 4326)");

            // Meeting → Sport
            builder.Entity<Meeting>()
                .HasOne<Sport>(m => m.Sport)
                .WithMany()
                .HasForeignKey(m => m.SportId)
                .OnDelete(DeleteBehavior.Restrict);

            // Meeting → Creator
            builder.Entity<Meeting>()
                .HasOne(m => m.Creator)
                .WithMany()
                .HasForeignKey(m => m.CreatorId)
                .OnDelete(DeleteBehavior.Restrict);

            // MeetingParticipant → Meeting
            builder.Entity<MeetingParticipant>()
                .HasOne(mp => mp.Meeting)
                .WithMany(m => m.Participants)
                .HasForeignKey(mp => mp.MeetingId);

            // MeetingParticipant → User
            builder.Entity<MeetingParticipant>()
                .HasOne(mp => mp.User)
                .WithMany()
                .HasForeignKey(mp => mp.UserId);

            builder.Entity<MeetingParticipant>()
                .HasIndex(mp => new { mp.MeetingId, mp.UserId })
                .IsUnique();

            // Message → Meeting
            builder.Entity<Message>()
                .HasOne(m => m.Meeting)
                .WithMany()
                .HasForeignKey(m => m.MeetingId);

            // Message → Sender
            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId);

        }
    }
}
