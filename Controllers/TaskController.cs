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

        private Guid GetUserId()
        {
            try
            {
                var subClaim = User.Claims.FirstOrDefault(c => c.Type == "sub");
                if (subClaim == null)
                    throw new InvalidOperationException("No 'sub' claim found in JWT token");
                
                if (!Guid.TryParse(subClaim.Value, out var userId))
                    throw new FormatException($"Invalid GUID format in 'sub' claim: {subClaim.Value}");
                
                return userId;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetUserId Error] {ex.Message}");
                throw;
            }
        }

        // GET /api/tasks
        [HttpGet]
        public async Task<IActionResult> GetTasks()
        {
            try
            {
                var userId = GetUserId();
                var tasks = await _context.Tasks
                    .Where(t => t.UserId == userId)
                    .OrderBy(t => t.Order)
                    .ThenBy(t => t.CreatedAt)
                    .ToListAsync();

                return Ok(tasks);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetTasks Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        // GET /api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
                if (task == null) return NotFound();

                return Ok(task);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetTask Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        // POST /api/tasks
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] TaskItem dto)
        {
            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateTask Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        // PUT /api/tasks/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(Guid id, [FromBody] TaskItem dto)
        {
            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[UpdateTask Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        // DELETE /api/tasks/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            try
            {
                var userId = GetUserId();

                var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
                if (task == null) return NotFound();

                _context.Tasks.Remove(task);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DeleteTask Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        // PUT /api/tasks/reorder
        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderTasks([FromBody] List<Guid> orderedIds)
        {
            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[ReorderTasks Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }
    }
}
