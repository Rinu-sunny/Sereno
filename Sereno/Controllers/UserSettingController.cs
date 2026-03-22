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

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                var userId = GetUserId();
                var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
                if (settings == null) return NotFound();
                return Ok(settings);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetSettings Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UserSetting dto)
        {
            try
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
            catch (Exception ex)
            {
                Console.WriteLine($"[UpdateSettings Error] {ex.Message}");
                return StatusCode(500, new { error = ex.Message, type = ex.GetType().Name });
            }
        }

        private int ValidateDuration(int input, int defaultValue)
        {
            if (input < 1) return defaultValue;
            if (input > 180) return defaultValue; // limit max 3 hours for sanity
            return input;
        }
    }
}



