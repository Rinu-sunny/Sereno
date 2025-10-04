using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    public class UserStreaks
    {
        /// <summary>
        /// Primary key and foreign key to User.
        /// </summary>
        [Key]
        [Column("user_id")]
        [Required]
        public Guid UserId { get; set; }

        /// <summary>
        /// Current consecutive streak count.
        /// </summary>
        [Required]
        [Column("current_streak")]
        public int CurrentStreak { get; set; } = 0;

        /// <summary>
        /// Longest streak ever achieved.
        /// </summary>
        [Required]
        [Column("longest_streak")]
        public int LongestStreak { get; set; } = 0;

        /// <summary>
        /// The last date the user was active (UTC date only).
        /// </summary>
        [Column("last_active_date")]
        public DateTime? LastActiveDate { get; set; }
    }
}
