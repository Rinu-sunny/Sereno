using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    public class PomodoroSession
    {
        /// <summary>
        /// Primary key for Pomodoro Session.
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to User.
        /// </summary>
        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        /// <summary>
        /// Foreign key to Task (optional).
        /// </summary>
        [Column("task_id")]
        public Guid? TaskId { get; set; }

        /// <summary>
        /// Type of session: "work", "short_break", or "long_break".
        /// </summary>
        [Required]
        [Column("type")]
        [MaxLength(20)]
        public string Type { get; set; } = "work";

        /// <summary>
        /// Duration in minutes of the session.
        /// </summary>
        [Required]
        [Column("duration_minutes")]
        public int DurationMinutes { get; set; } = 0;

        /// <summary>
        /// DateTime when session started (UTC).
        /// </summary>
        [Required]
        [Column("started_at")]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// DateTime when session ended (UTC), nullable if ongoing.
        /// </summary>
        [Column("ended_at")]
        public DateTime? EndedAt { get; set; }

        /// <summary>
        /// Current status of the session: "pending", "running", "paused", "completed", or "skipped".
        /// </summary>
        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// The sequential number of this session for the day or user.
        /// </summary>
        [Required]
        [Column("session_number")]
        public int SessionNumber { get; set; } = 0;

        /// <summary>
        /// Timestamp when the record was created.
        /// </summary>
        [Required]
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property to linked Task
        public TaskItem? Task { get; set; }
    }
}
