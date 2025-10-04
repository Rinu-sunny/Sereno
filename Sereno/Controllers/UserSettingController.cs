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
    public class UserSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public UserSettingsController(AppDbContext context) => _context = context;

        private Guid GetUserId() => Guid.Parse(User.Claims.First(c => c.Type == "sub").Value);

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var userId = GetUserId();
            var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            if (settings == null) return NotFound();
            return Ok(settings);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UserSetting dto)
        {
            var userId = GetUserId();

            var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                // Initialize new settings with validation and defaults
                var newSettings = new UserSetting
                {
                    UserId = userId,
                    WorkDuration = ValidateDuration(dto.WorkDuration, 25),
                    ShortBreakDuration = ValidateDuration(dto.ShortBreakDuration, 5),
                    LongBreakDuration = ValidateDuration(dto.LongBreakDuration, 15),
                    PomodorosBeforeLongBreak = dto.PomodorosBeforeLongBreak > 0 ? dto.PomodorosBeforeLongBreak : 4,
                    Theme = string.IsNullOrWhiteSpace(dto.Theme) ? "light" : dto.Theme,
                    AlarmSound = string.IsNullOrWhiteSpace(dto.AlarmSound) ? "default" : dto.AlarmSound,
                    NotificationsEnabled = dto.NotificationsEnabled,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.UserSettings.Add(newSettings);
                await _context.SaveChangesAsync();

                return Ok(newSettings);
            }

            // Update existing settings with validation
            settings.WorkDuration = ValidateDuration(dto.WorkDuration, settings.WorkDuration);
            settings.ShortBreakDuration = ValidateDuration(dto.ShortBreakDuration, settings.ShortBreakDuration);
            settings.LongBreakDuration = ValidateDuration(dto.LongBreakDuration, settings.LongBreakDuration);
            settings.PomodorosBeforeLongBreak = dto.PomodorosBeforeLongBreak > 0 ? dto.PomodorosBeforeLongBreak : settings.PomodorosBeforeLongBreak;
            settings.Theme = string.IsNullOrWhiteSpace(dto.Theme) ? settings.Theme : dto.Theme;
            settings.AlarmSound = string.IsNullOrWhiteSpace(dto.AlarmSound) ? settings.AlarmSound : dto.AlarmSound;
            settings.NotificationsEnabled = dto.NotificationsEnabled;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(settings);
        }

        private int ValidateDuration(int input, int defaultValue)
        {
            if (input < 1) return defaultValue;
            if (input > 180) return defaultValue; // limit max 3 hours for sanity
            return input;
        }
    }
}



