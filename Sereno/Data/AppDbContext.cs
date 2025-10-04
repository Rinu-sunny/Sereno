using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;
using Sereno.Models;

namespace Sereno.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<PomodoroSession> PomodoroSessions { get; set; }
        public DbSet<UserSetting> UserSettings { get; set; }
        public DbSet<AnalyticsDaily> AnalyticsDaily { get; set; }
        public DbSet<UserStreaks> UserStreaks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Composite primary key for AnalyticsDaily (UserId + Date)
            modelBuilder.Entity<AnalyticsDaily>()
                .HasKey(a => new { a.UserId, a.Date });

            // Configure Date property to Date only (if supported)
            modelBuilder.Entity<AnalyticsDaily>()
                .Property(a => a.Date)
                .HasColumnType("date");

            // Convert TaskItem.Tags (JSON string) to List<string> or List<Tag> in code (optional)
            modelBuilder.Entity<TaskItem>()
                .Property(t => t.Tags)
                .HasConversion(
                    v => v ?? "[]", // Store empty array string if null
                    v => string.IsNullOrWhiteSpace(v) ? "[]" : v);

            // Convert AnalyticsDaily.TasksCompletedPerTag (JSON string) similarly
            modelBuilder.Entity<AnalyticsDaily>()
                .Property(a => a.TasksCompletedPerTag)
                .HasConversion(
                    v => v ?? "{}",
                    v => string.IsNullOrWhiteSpace(v) ? "{}" : v);

            // Configure PomodoroSession.Status and Type as strings (assuming enums as strings)
            modelBuilder.Entity<PomodoroSession>()
                .Property(p => p.Status)
                .HasMaxLength(20)
                .IsRequired();

            modelBuilder.Entity<PomodoroSession>()
                .Property(p => p.Type)
                .HasMaxLength(20)
                .IsRequired();

            // Relationship: PomodoroSession optionally linked to Task, with cascade delete disabled to prevent task deletion on session delete
            modelBuilder.Entity<PomodoroSession>()
                .HasOne(p => p.Task)
                .WithMany(t => t.PomodoroSessions)
                .HasForeignKey(p => p.TaskId)
                .OnDelete(DeleteBehavior.Restrict);

            // Indexes to improve query performance on UserId for user-specific data
            modelBuilder.Entity<TaskItem>()
                .HasIndex(t => t.UserId);

            modelBuilder.Entity<PomodoroSession>()
                .HasIndex(p => p.UserId);

            modelBuilder.Entity<UserSetting>()
                .HasIndex(u => u.UserId)
                .IsUnique();

            modelBuilder.Entity<UserStreaks>()
                .HasIndex(s => s.UserId)
                .IsUnique();
        }
    }
}

