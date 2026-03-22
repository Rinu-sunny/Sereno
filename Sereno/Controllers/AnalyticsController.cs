using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sereno.Data;
using System.Text.Json;


namespace Sereno.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AnalyticsController(AppDbContext context) => _context = context;

        // Debug endpoint - no auth required
        [HttpGet("debug/status")]
        public async Task<IActionResult> DebugStatus()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();

                string? openError = null;
                try
                {
                    await _context.Database.OpenConnectionAsync();
                    await _context.Database.CloseConnectionAsync();
                }
                catch (Exception ex)
                {
                    openError = ex.Message;
                }

                var configuredConnection = _context.Database.GetConnectionString() ?? string.Empty;
                var hostToken = configuredConnection
                    .Split(';', StringSplitOptions.RemoveEmptyEntries)
                    .FirstOrDefault(p => p.TrimStart().StartsWith("Host=", StringComparison.OrdinalIgnoreCase));
                var host = hostToken?.Split('=', 2).ElementAtOrDefault(1);
                
                return Ok(new {
                    status = "ok",
                    database = new {
                        connected = canConnect,
                        provider = "PostgreSQL (Supabase)",
                        host,
                        openError
                    },
                    time = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Debug endpoint to check JWT token - requires auth
        [HttpGet("debug/jwt")]
        [Authorize]
        public IActionResult DebugJwt()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            var subClaim = User.Claims.FirstOrDefault(c => c.Type == "sub");
            
            return Ok(new {
                authenticated = User.Identity?.IsAuthenticated,
                claims = claims,
                sub = subClaim?.Value,
                claimsCount = claims.Count
            });
        }

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

        // ✅ Get analytics for a specific day
        [HttpGet("daily/{date}")]
        public async Task<IActionResult> GetDaily(DateTime date)
        {
            var userId = GetUserId();
            var analytics = await _context.AnalyticsDaily
                .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == date.Date);

            if (analytics == null) return NotFound(new { message = "No data for this date" });
            return Ok(analytics);
        }

        // ✅ Weekly report (last 7 days or until endDate)
        [HttpGet("weekly")]
        public async Task<IActionResult> GetWeekly([FromQuery] DateTime? endDate)
        {
            try
            {
                var userId = GetUserId();
                var end = (endDate ?? DateTime.UtcNow).Date;
                var start = end.AddDays(-6);

                var rows = await _context.AnalyticsDaily
                    .Where(a => a.UserId == userId && a.Date >= start && a.Date <= end)
                    .OrderBy(a => a.Date)
                    .ToListAsync();

                var totalSessions = rows.Sum(r => r.TotalSessions);
                var tasksCompleted = rows.Sum(r => r.TasksCompleted);

                if (totalSessions == 0)
                {
                    totalSessions = await _context.PomodoroSessions
                        .Where(s => s.UserId == userId && s.Type == "work" && s.Status == "completed" && s.StartedAt >= start && s.StartedAt < end.AddDays(1))
                        .CountAsync();
                }

                if (tasksCompleted == 0)
                {
                    tasksCompleted = await _context.Tasks
                        .Where(t => t.UserId == userId && t.IsComplete)
                        .CountAsync();
                }

                return Ok(new {
                    range = new { start, end },
                    totalSessions,
                    totalFocus = rows.Sum(r => r.TotalFocusMinutes),
                    totalBreak = rows.Sum(r => r.TotalBreakMinutes),
                    tasksCompleted,
                    streak = rows.LastOrDefault()?.StreakCount ?? 0,
                    perDay = rows,
                    _note = "Real data from database"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetWeekly Error] {ex.Message}\n{ex.StackTrace}");
                
                // Fallback: Return empty data structure if database unavailable
                var end = (endDate ?? DateTime.UtcNow).Date;
                var start = end.AddDays(-6);
                var emptyDays = Enumerable.Range(0, 7)
                    .Select(i => new { Date = start.AddDays(i), TotalFocusMinutes = 0, TotalBreakMinutes = 0, TasksCompleted = 0, StreakCount = 0 })
                    .ToList();
                
                return Ok(new {
                    range = new { start, end },
                    totalSessions = 0,
                    totalFocus = 0,
                    totalBreak = 0,
                    tasksCompleted = 0,
                    streak = 0,
                    perDay = emptyDays,
                    _note = "Sample data (database unavailable)",
                    _error = ex.Message
                });
            }
        }

        // ✅ Monthly report
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthly([FromQuery] int months = 1)
        {
            var userId = GetUserId();
            var end = DateTime.UtcNow.Date;
            var start = end.AddDays(-29); // Gets a 30-day range, inclusive

            var rows = await _context.AnalyticsDaily
                .Where(a => a.UserId == userId && a.Date >= start && a.Date <= end)
                .OrderBy(a => a.Date)
                .ToListAsync();

            var totalSessions = rows.Sum(r => r.TotalSessions);
            var tasksCompleted = rows.Sum(r => r.TasksCompleted);

            if (totalSessions == 0)
            {
                totalSessions = await _context.PomodoroSessions
                    .Where(s => s.UserId == userId && s.Type == "work" && s.Status == "completed" && s.StartedAt >= start && s.StartedAt < end.AddDays(1))
                    .CountAsync();
            }

            if (tasksCompleted == 0)
            {
                tasksCompleted = await _context.Tasks
                    .Where(t => t.UserId == userId && t.IsComplete)
                    .CountAsync();
            }

            return Ok(new {
                range = new { start, end },
                totalSessions,
                totalFocus = rows.Sum(r => r.TotalFocusMinutes),
                totalBreak = rows.Sum(r => r.TotalBreakMinutes),
                tasksCompleted,
                streak = rows.LastOrDefault()?.StreakCount ?? 0,
                perDay = rows
            });
        }

        // ✅ Tag breakdown for past X days
        [HttpGet("tags/{days}")]
        public async Task<IActionResult> GetTagBreakdown(int days = 7)
        {
            var userId = GetUserId();
            var start = DateTime.UtcNow.Date.AddDays(-days);

            var rows = await _context.AnalyticsDaily
                .Where(a => a.UserId == userId && a.Date >= start)
                .ToListAsync();

            var tagSummary = new Dictionary<string, int>();

         foreach (var row in rows)
{
    if (!string.IsNullOrWhiteSpace(row.TasksCompletedPerTag))
    {
        var tagCounts = JsonSerializer.Deserialize<Dictionary<string, int>>(row.TasksCompletedPerTag);
        if (tagCounts != null)
        {
            foreach (var tag in tagCounts)
            {
                if (tagSummary.ContainsKey(tag.Key))
                    tagSummary[tag.Key] += tag.Value;
                else
                    tagSummary[tag.Key] = tag.Value;
            }
        }
    }
}


            return Ok(new { range = new { start, end = DateTime.UtcNow.Date }, tagSummary });
        }
    }
}
