using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sereno.Models
{
    [Table("tasks")]
    public class TaskItem
    {
         public ICollection<PomodoroSession> PomodoroSessions { get; set; } = new List<PomodoroSession>();
        /// <summary>
        /// Primary key for the Task.
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to the User owning this task.
        /// </summary>
        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        /// <summary>
        /// Title of the task.
        /// </summary>
        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Optional detailed description.
        /// </summary>
        [Column("description")]
        public string? Description { get; set; }

        /// <summary>
        /// Target number of pomodoros to complete this task.
        /// </summary>
        [Required]
        [Column("target_pomodoros")]
        [Range(1, int.MaxValue, ErrorMessage = "TargetPomodoros must be at least 1.")]
        public int TargetPomodoros { get; set; } = 1;

        /// <summary>
        /// Number of pomodoros completed so far.
        /// </summary>
        [Required]
        [Column("completed_pomodoros")]
        [Range(0, int.MaxValue)]
        public int CompletedPomodoros { get; set; } = 0;

        /// <summary>
        /// Whether the task is marked complete.
        /// </summary>
        [Required]
        [Column("is_complete")]
        public bool IsComplete { get; set; } = false;

        /// <summary>
        /// Date and time when the task was created.
        /// </summary>
        [Required]
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Tags associated with the task stored as JSON array string.
        /// Example: [{"label":"study","color":"#ff0"}]
        /// </summary>
[Required]
[Column("tags", TypeName = "jsonb")]
public string Tags { get; set; } = "[]";

        /// <summary>
        /// Ordering index for sorting tasks.
        /// </summary>
        [Required]
        [Column("order")]
        public int Order { get; set; } = 0;

        /// <summary>
        /// Optional due date for the task.
        /// </summary>
        [Column("due_date")]
        public DateTime? DueDate { get; set; }

        /// <summary>
        /// Date and time when the task was last updated.
        /// </summary>
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}

