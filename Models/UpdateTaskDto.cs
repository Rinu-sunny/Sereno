// In Sereno/Models/UpdateTaskDto.cs (or Sereno/DTOs/UpdateTaskDto.cs)
namespace Sereno.Models // Or Sereno.DTOs
{
    public class UpdateTaskDto
    {
        // Make properties nullable to indicate they are optional
        public string? Title { get; set; }
        public string? Description { get; set; }
        public int? TargetPomodoros { get; set; }
        public int? CompletedPomodoros { get; set; }
        public bool? IsComplete { get; set; } // This will receive the toggle value
        public string? Tags { get; set; }
        public int? Order { get; set; }
        public DateTime? DueDate { get; set; }
        // Exclude fields that shouldn't be updated directly via API:
        // UserId, CreatedAt, UpdatedAt
    }
}