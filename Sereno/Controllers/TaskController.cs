using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sereno.Data;
using Sereno.Models;

namespace Sereno.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;
        public TasksController(AppDbContext context) => _context = context;

        private Guid GetUserId() => Guid.Parse(User.Claims.First(c => c.Type == "sub").Value);

        // GET /api/tasks
        [HttpGet]
        public async Task<IActionResult> GetTasks()
        {
            var userId = GetUserId();
            var tasks = await _context.Tasks
                .Where(t => t.UserId == userId)
                .OrderBy(t => t.Order)
                .ThenBy(t => t.CreatedAt)
                .ToListAsync();

            return Ok(tasks);
        }

        // GET /api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(Guid id)
        {
            var userId = GetUserId();
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (task == null) return NotFound();

            return Ok(task);
        }

        // POST /api/tasks
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] TaskItem dto)
        {
            var userId = GetUserId();

            var task = new TaskItem
            {
                UserId = userId,
                Title = dto.Title,
                Description = dto.Description,
                TargetPomodoros = dto.TargetPomodoros > 0 ? dto.TargetPomodoros : 1,
                CompletedPomodoros = dto.CompletedPomodoros,
                IsComplete = dto.IsComplete,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Tags = string.IsNullOrWhiteSpace(dto.Tags) ? "[]" : dto.Tags,
                Order = dto.Order,
                DueDate = dto.DueDate
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }

        // PUT /api/tasks/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(Guid id, [FromBody] TaskItem dto)
        {
            var userId = GetUserId();

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (task == null) return NotFound();

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.TargetPomodoros = dto.TargetPomodoros > 0 ? dto.TargetPomodoros : 1;
            task.CompletedPomodoros = dto.CompletedPomodoros;
            task.IsComplete = dto.IsComplete;
            task.Tags = string.IsNullOrWhiteSpace(dto.Tags) ? "[]" : dto.Tags;
            task.Order = dto.Order;
            task.DueDate = dto.DueDate;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(task);
        }

        // DELETE /api/tasks/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            var userId = GetUserId();

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (task == null) return NotFound();

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PUT /api/tasks/reorder
        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderTasks([FromBody] List<Guid> orderedIds)
        {
            var userId = GetUserId();

            var tasks = await _context.Tasks
                .Where(t => t.UserId == userId && orderedIds.Contains(t.Id))
                .ToListAsync();

            for (int i = 0; i < orderedIds.Count; i++)
            {
                var task = tasks.FirstOrDefault(t => t.Id == orderedIds[i]);
                if (task != null)
                {
                    task.Order = i;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
