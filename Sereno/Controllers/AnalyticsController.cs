using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sereno.Data;
using System.Text.Json;


namespace Sereno.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AnalyticsController(AppDbContext context) => _context = context;

        private Guid GetUserId() => Guid.Parse(User.Claims.First(c => c.Type == "sub").Value);

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
            var userId = GetUserId();
            var end = (endDate ?? DateTime.UtcNow).Date;
            var start = end.AddDays(-6);

            var rows = await _context.AnalyticsDaily
                .Where(a => a.UserId == userId && a.Date >= start && a.Date <= end)
                .OrderBy(a => a.Date)
                .ToListAsync();

            return Ok(new {
                range = new { start, end },
                totalFocus = rows.Sum(r => r.TotalFocusMinutes),
                totalBreak = rows.Sum(r => r.TotalBreakMinutes),
                tasksCompleted = rows.Sum(r => r.TasksCompleted),
                streak = rows.LastOrDefault()?.StreakCount ?? 0,
                perDay = rows
            });
        }

        // ✅ Monthly report
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthly([FromQuery] int months = 1)
        {
            var userId = GetUserId();
            var end = DateTime.UtcNow.Date;
            var start = end.AddMonths(-Math.Max(1, months) + 1);

            var rows = await _context.AnalyticsDaily
                .Where(a => a.UserId == userId && a.Date >= start && a.Date <= end)
                .OrderBy(a => a.Date)
                .ToListAsync();

            return Ok(new {
                range = new { start, end },
                totalFocus = rows.Sum(r => r.TotalFocusMinutes),
                totalBreak = rows.Sum(r => r.TotalBreakMinutes),
                tasksCompleted = rows.Sum(r => r.TasksCompleted),
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
