using System;
using System.Collections.Generic;

namespace HRMS.Infrastructure.Helpers
{
    public static class HolidayHelper
    {
        private static readonly HashSet<DateTime> PublicHolidays = new HashSet<DateTime>
        {
            // 2024 Holidays
            new DateTime(2024, 1, 1),   // New Year
            new DateTime(2024, 2, 8),   // Tet Starts
            new DateTime(2024, 2, 9),
            new DateTime(2024, 2, 10),
            new DateTime(2024, 2, 11),
            new DateTime(2024, 2, 12),
            new DateTime(2024, 2, 13),
            new DateTime(2024, 2, 14),  // Tet Ends
            new DateTime(2024, 4, 18),  // Hung Kings
            new DateTime(2024, 4, 30),  // Victory Day
            new DateTime(2024, 5, 1),   // Labor Day
            new DateTime(2024, 9, 2),   // National Day
            new DateTime(2024, 9, 3),

            // 2025 Holidays
            new DateTime(2025, 1, 1),   // New Year
            new DateTime(2025, 1, 27),  // Tet Starts (tentative)
            new DateTime(2025, 1, 28),
            new DateTime(2025, 1, 29),
            new DateTime(2025, 1, 30),
            new DateTime(2025, 1, 31),
            new DateTime(2025, 2, 1),
            new DateTime(2025, 2, 2),   // Tet Ends
            new DateTime(2025, 4, 7),   // Hung Kings
            new DateTime(2025, 4, 30),  // Victory Day
            new DateTime(2025, 5, 1),   // Labor Day
            new DateTime(2025, 9, 2),   // National Day
            new DateTime(2025, 9, 3)
        };

        public static bool IsPublicHoliday(DateTime date)
        {
            return PublicHolidays.Contains(date.Date);
        }

        public static bool IsWorkingDay(DateTime date)
        {
            // Exclude Sunday and Public Holidays
            if (date.DayOfWeek == DayOfWeek.Sunday) return false;
            if (IsPublicHoliday(date)) return false;
            return true;
        }
    }
}
