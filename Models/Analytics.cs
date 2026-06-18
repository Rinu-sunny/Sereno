using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    [Table("analytics_daily")]
    public class AnalyticsDaily
    {
        /// <summary>
        /// The user associated with the analytics record.
        /// Part of the composite key.
        /// </summary>
        [Key]
        [Column("user_id")] // <-- Fix 1: Added missing property
        public Guid UserId { get; set; }

        /// <summary>
        /// The date for which analytics are recorded (date part only).
        /// Part of the composite key.
        /// </summary>
        [Key]
        [Column("date", TypeName = "date")] // <-- Fix 2: Combined attributes, removed duplicate
        public DateTime Date { get; set; }

        /// <summary>
        /// Total pomodoro sessions completed for the day.
        /// </summary>
        [Required]
        [Column("total_sessions")] // <-- Fix 3: Added column name
        public int TotalSessions { get; set; } = 0;

        /// <summary>
        /// Total focus (work) minutes for the day.
        /// </summary>
        [Required]
        [Column("total_focus_minutes")] // <-- Fix 4: Added column name
        public int TotalFocusMinutes { get; set; } = 0;

        /// <summary>
        /// Total break minutes for the day.
        /// </summary>
        [Required]
        [Column("total_break_minutes")] // <-- Fix 5: Added column name
        public int TotalBreakMinutes { get; set; } = 0;

        /// <summary>
        /// Total tasks fully completed on this day.
        /// </summary>
        [Required]
        [Column("tasks_completed")] // <-- Fix 6: Added column name
        public int TasksCompleted { get; set; } = 0;

        /// <summary>
        /// JSON string mapping tags to counts of tasks completed with that tag.
        /// </summary>
[Required]
[Column("tasks_completed_per_tag", TypeName = "jsonb")]
public string TasksCompletedPerTag { get; set; } = "{}";

        /// <summary>
        /// Current streak count on this day.
        /// </summary>
        [Required]
        [Column("streak_count")] // <-- Fix 8: Added column name
        public int StreakCount { get; set; } = 0;

        /// <summary>
        /// Date/time when this record was created.
        /// </summary>
        [Required]
        [Column("created_at")] // <-- Fix 9: Added column name
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Date/time when this record was last updated.
        /// </summary>
        [Column("updated_at")] // <-- Fix 10: Added column name
        public DateTime? UpdatedAt { get; set; }
    }
}