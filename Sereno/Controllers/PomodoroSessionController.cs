using System.Text.Json;
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
    public class PomodoroSessionController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PomodoroSessionController(AppDbContext context)
        {
            _context = context;
        }

        private Guid GetUserId() => Guid.Parse(User.Claims.First(c => c.Type == "sub").Value);

        [HttpGet]
        public async Task<IActionResult> GetSessions()
        {
            var userId = GetUserId();
            var sessions = await _context.PomodoroSessions
                .Include(s => s.Task)
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.StartedAt)
                .ToListAsync();
            return Ok(sessions);
        }

        [HttpPost("start")]
        public async Task<IActionResult> StartSession([FromQuery] Guid? taskId, [FromQuery] string? type)
        {
            var userId = GetUserId();
            var today = DateTime.UtcNow.Date;

            var userSettings = await _context.UserSettings.FirstOrDefaultAsync(u => u.UserId == userId);
            int beforeLongBreak = userSettings?.PomodorosBeforeLongBreak ?? 4;

            // Auto-decide session type if not provided
            if (string.IsNullOrEmpty(type) || type == "break")
            {
                var completedWork = await _context.PomodoroSessions
                    .Where(s => s.UserId == userId && s.Type == "work" && s.Status == "completed" && s.StartedAt >= today)
                    .CountAsync();

                type = (completedWork > 0 && completedWork % beforeLongBreak == 0) ? "long_break" : "short_break";
            }

            var sessionNumber = await _context.PomodoroSessions
                .Where(s => s.UserId == userId && s.StartedAt >= today)
                .CountAsync();

            var session = new PomodoroSession
            {
                UserId = userId,
                TaskId = taskId,
                Type = type,
                Status = "running",
                StartedAt = DateTime.UtcNow,
                SessionNumber = sessionNumber + 1,
                CreatedAt = DateTime.UtcNow
            };

            _context.PomodoroSessions.Add(session);
            await _context.SaveChangesAsync();
            return Ok(session);
        }

        [HttpPost("pause/{id}")]
        public async Task<IActionResult> PauseSession(Guid id)
        {
            var userId = GetUserId();
            var session = await _context.PomodoroSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (session == null) return NotFound();

            session.Status = "paused";
            await _context.SaveChangesAsync();
            return Ok(session);
        }

        [HttpPost("skip/{id}")]
        public async Task<IActionResult> SkipSession(Guid id)
        {
            var userId = GetUserId();
            var session = await _context.PomodoroSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (session == null) return NotFound();

            session.Status = "skipped";
            session.EndedAt = DateTime.UtcNow;
            session.DurationMinutes = (int)(session.EndedAt.Value - session.StartedAt).TotalMinutes;
            await _context.SaveChangesAsync();
            return Ok(session);
        }

        [HttpPost("complete/{id}")]
        public async Task<IActionResult> CompleteSession(Guid id)
        {
            var userId = GetUserId();
            var session = await _context.PomodoroSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (session == null) return NotFound();

            session.Status = "completed";
            session.EndedAt = DateTime.UtcNow;
            session.DurationMinutes = (int)(session.EndedAt.Value - session.StartedAt).TotalMinutes;

            var today = DateTime.UtcNow.Date;
            var analytics = await _context.AnalyticsDaily
                .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

            if (analytics == null)
            {
                analytics = new AnalyticsDaily
                {
                    UserId = userId,
                    Date = today,
                    TotalSessions = 0,
                    TotalFocusMinutes = 0,
                    TotalBreakMinutes = 0,
                    TasksCompleted = 0,
                    TasksCompletedPerTag = "{}",
                    StreakCount = 0,
                    CreatedAt = DateTime.UtcNow
                };
                _context.AnalyticsDaily.Add(analytics);
            }

            analytics.TotalSessions++;
            if (session.Type == "work")
                analytics.TotalFocusMinutes += session.DurationMinutes;
            else
                analytics.TotalBreakMinutes += session.DurationMinutes;

            analytics.UpdatedAt = DateTime.UtcNow;

            if (session.TaskId.HasValue)
            {
                var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == session.TaskId && t.UserId == userId);
                if (task != null)
                {
                    task.CompletedPomodoros++;
                    if (task.CompletedPomodoros >= task.TargetPomodoros)
                    {
                        task.IsComplete = true;
                        analytics.TasksCompleted++;

                        try
                        {
                            var tagsDict = new Dictionary<string, int>();
                            if (!string.IsNullOrWhiteSpace(analytics.TasksCompletedPerTag))
                                tagsDict = JsonSerializer.Deserialize<Dictionary<string, int>>(analytics.TasksCompletedPerTag) ?? new();

                            if (!string.IsNullOrWhiteSpace(task.Tags))
                            {
                                using var doc = JsonDocument.Parse(task.Tags);
                                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                                {
                                    foreach (var el in doc.RootElement.EnumerateArray())
                                    {
                                        string label = el.ValueKind == JsonValueKind.Object && el.TryGetProperty("label", out var p) ? p.GetString() ?? "untagged"
                                            : el.ValueKind == JsonValueKind.String ? el.GetString() ?? "untagged" : "untagged";

                                        if (tagsDict.ContainsKey(label)) tagsDict[label]++;
                                        else tagsDict[label] = 1;
                                    }
                                }
                            }

                            analytics.TasksCompletedPerTag = JsonSerializer.Serialize(tagsDict);
                        }
                        catch { }

                        _context.Tasks.Remove(task);
                    }
                }
            }

            var streak = await _context.UserStreaks.FirstOrDefaultAsync(s => s.UserId == userId);
            if (streak == null)
            {
                streak = new UserStreaks
                {
                    UserId = userId,
                    CurrentStreak = 1,
                    LongestStreak = 1,
                    LastActiveDate = today
                };
                _context.UserStreaks.Add(streak);
            }
            else
            {
                if (!streak.LastActiveDate.HasValue || streak.LastActiveDate.Value.Date < today.AddDays(-1))
                {
                    streak.CurrentStreak = 1;
                }
                else if (streak.LastActiveDate.Value.Date == today.AddDays(-1))
                {
                    streak.CurrentStreak++;
                }

                streak.LastActiveDate = today;
                if (streak.CurrentStreak > streak.LongestStreak)
                    streak.LongestStreak = streak.CurrentStreak;
            }

            analytics.StreakCount = streak.CurrentStreak;

            await _context.SaveChangesAsync();
            return Ok(session);
        }
    }
}

