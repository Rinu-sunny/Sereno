using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    [Table("user_settings")]
    public class UserSetting
    {
        /// <summary>
        /// Primary key and foreign key to User.
        /// </summary>
        [Key]
        [Column("user_id")]
        [Required]
        public Guid UserId { get; set; }

        /// <summary>
        /// Duration of work sessions in minutes.
        /// </summary>
        [Required]
        [Column("work_duration")]
        [Range(1, 180)]
        public int WorkDuration { get; set; } = 25;

        /// <summary>
        /// Duration of short breaks in minutes.
        /// </summary>
        [Required]
        [Column("short_break_duration")]
        [Range(1, 60)]
        public int ShortBreakDuration { get; set; } = 5;

        /// <summary>
        /// Duration of long breaks in minutes.
        /// </summary>
        [Required]
        [Column("long_break_duration")]
        [Range(1, 180)]
        public int LongBreakDuration { get; set; } = 15;

        /// <summary>
        /// Number of work sessions before a long break.
        /// </summary>
        [Required]
        [Column("long_break_interval")]
        [Range(1, 10)]
        public int PomodorosBeforeLongBreak { get; set; } = 4;

        /// <summary>
        /// UI theme preference ("light" or "dark").
        /// </summary>
        [Required]
        [Column("theme")]
        [MaxLength(20)]
        public string Theme { get; set; } = "light";

        /// <summary>
        /// Alarm sound preference identifier.
        /// </summary>
        [Required]
        [Column("alarm_sound")]
        [MaxLength(50)]
        public string AlarmSound { get; set; } = "default";

        /// <summary>
        /// Enable or disable notifications.
        /// </summary>
        [Required]
        [Column("notifications_enabled")]
        public bool NotificationsEnabled { get; set; } = true;

        /// <summary>
        /// Timestamp when the settings were created.
        /// </summary>
        [Required]
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the settings were last updated.
        /// </summary>
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
