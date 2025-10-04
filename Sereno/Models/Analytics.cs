using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    public class AnalyticsDaily
    {
        /// <summary>
        /// The user associated with the analytics record.
        /// Part of the composite key.
        /// </summary>
        [Key]
        public Guid UserId { get; set; }

        /// <summary>
        /// The date for which analytics are recorded (date part only).
        /// Part of the composite key.
        /// </summary>
        [Key]
        [Column(TypeName = "date")]
        public DateTime Date { get; set; }

        /// <summary>
        /// Total pomodoro sessions completed for the day.
        /// </summary>
        [Required]
        public int TotalSessions { get; set; } = 0;

        /// <summary>
        /// Total focus (work) minutes for the day.
        /// </summary>
        [Required]
        public int TotalFocusMinutes { get; set; } = 0;

        /// <summary>
        /// Total break minutes for the day.
        /// </summary>
        [Required]
        public int TotalBreakMinutes { get; set; } = 0;

        /// <summary>
        /// Total tasks fully completed on this day.
        /// </summary>
        [Required]
        public int TasksCompleted { get; set; } = 0;

        /// <summary>
        /// JSON string mapping tags to counts of tasks completed with that tag.
        /// Example: {"work":3,"study":2}
        /// </summary>
        [Required]
        public string TasksCompletedPerTag { get; set; } = "{}";

        /// <summary>
        /// Current streak count on this day.
        /// </summary>
        [Required]
        public int StreakCount { get; set; } = 0;

        /// <summary>
        /// Date/time when this record was created.
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Date/time when this record was last updated.
        /// Nullable.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
    }
}
