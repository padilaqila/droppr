/**
 * reminders-helper.ts
 * Utility for parsing, calculating, and formatting project reminders.
 */

export type ReminderScheduleType = "daily" | "weekly" | "once";

export interface DayOfWeekOption {
  id: string; // "mon", "tue", "wed", "thu", "fri", "sat", "sun"
  label: string; // "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"
  dayIndex: number; // 1 = Monday, 7 = Sunday (standard ISO)
}

export const DAYS_OF_WEEK: DayOfWeekOption[] = [
  { id: "mon", label: "Sen", dayIndex: 1 },
  { id: "tue", label: "Sel", dayIndex: 2 },
  { id: "wed", label: "Rab", dayIndex: 3 },
  { id: "thu", label: "Kam", dayIndex: 4 },
  { id: "fri", label: "Jum", dayIndex: 5 },
  { id: "sat", label: "Sab", dayIndex: 6 },
  { id: "sun", label: "Min", dayIndex: 0 }, // JS Date Sunday is 0
];

const DAY_NAME_MAP: Record<string, string> = {
  mon: "Senin",
  tue: "Selasa",
  wed: "Rabu",
  thu: "Kamis",
  fri: "Jumat",
  sat: "Sabtu",
  sun: "Minggu",
};

/**
 * Calculates next ISO trigger timestamp based on user's local schedule
 */
export function calculateNextTrigger(
  scheduleType: ReminderScheduleType,
  timeString: string = "07:00", // "HH:mm"
  selectedDays: string[] = ["mon"],
  specificDate: string = "" // "YYYY-MM-DD"
): string {
  const [hoursStr, minsStr] = timeString.split(":");
  const hours = parseInt(hoursStr || "7", 10);
  const minutes = parseInt(minsStr || "0", 10);

  const now = new Date();

  if (scheduleType === "daily") {
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    // If time has already passed today, schedule for tomorrow
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.toISOString();
  }

  if (scheduleType === "weekly") {
    if (!selectedDays || selectedDays.length === 0) {
      // Fallback: tomorrow at target time
      const fallback = new Date(now);
      fallback.setDate(fallback.getDate() + 1);
      fallback.setHours(hours, minutes, 0, 0);
      return fallback.toISOString();
    }

    // Convert selected days to JS day numbers (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const targetDayNumbers = selectedDays
      .map((d) => DAYS_OF_WEEK.find((item) => item.id === d)?.dayIndex)
      .filter((n): n is number => n !== undefined);

    let soonestTrigger: Date | null = null;

    for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + dayOffset);
      candidate.setHours(hours, minutes, 0, 0);

      const dayOfWeek = candidate.getDay(); // 0 to 6
      if (targetDayNumbers.includes(dayOfWeek)) {
        if (candidate.getTime() > now.getTime()) {
          soonestTrigger = candidate;
          break;
        }
      }
    }

    if (soonestTrigger) {
      return soonestTrigger.toISOString();
    }

    // Fallback +7 days
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(hours, minutes, 0, 0);
    return nextWeek.toISOString();
  }

  if (scheduleType === "once") {
    if (!specificDate) {
      // Default tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);
      return tomorrow.toISOString();
    }

    const [year, month, day] = specificDate.split("-").map(Number);
    const candidate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return candidate.toISOString();
  }

  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Builds the frequency string stored in database
 * Examples:
 * - "daily@07:00"
 * - "weekly:mon,thu@07:00"
 * - "once:2026-09-15@07:00"
 */
export function encodeFrequency(
  scheduleType: ReminderScheduleType,
  timeString: string = "07:00",
  selectedDays: string[] = ["mon"],
  specificDate: string = ""
): string {
  const safeTime = timeString.trim() || "07:00";
  if (scheduleType === "daily") {
    return `daily@${safeTime}`;
  }
  if (scheduleType === "weekly") {
    const days = selectedDays.length > 0 ? selectedDays.join(",") : "mon";
    return `weekly:${days}@${safeTime}`;
  }
  if (scheduleType === "once") {
    const dateStr = specificDate.trim() || new Date().toISOString().split("T")[0];
    return `once:${dateStr}@${safeTime}`;
  }
  return `daily@${safeTime}`;
}

/**
 * Decodes the frequency string from database into component state
 */
export function decodeFrequency(frequencyStr: string | null | undefined): {
  scheduleType: ReminderScheduleType;
  timeString: string;
  selectedDays: string[];
  specificDate: string;
} {
  const raw = (frequencyStr || "daily@07:00").trim();

  // Legacy fallback: "daily", "weekly", "once"
  if (raw === "daily") {
    return { scheduleType: "daily", timeString: "07:00", selectedDays: [], specificDate: "" };
  }
  if (raw === "weekly") {
    return { scheduleType: "weekly", timeString: "07:00", selectedDays: ["mon"], specificDate: "" };
  }
  if (raw === "once") {
    return { scheduleType: "once", timeString: "07:00", selectedDays: [], specificDate: "" };
  }

  const [pattern, timePart] = raw.split("@");
  const timeString = timePart || "07:00";

  if (pattern.startsWith("daily")) {
    return {
      scheduleType: "daily",
      timeString,
      selectedDays: [],
      specificDate: "",
    };
  }

  if (pattern.startsWith("weekly:")) {
    const daysRaw = pattern.replace("weekly:", "");
    const selectedDays = daysRaw.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      scheduleType: "weekly",
      timeString,
      selectedDays: selectedDays.length > 0 ? selectedDays : ["mon"],
      specificDate: "",
    };
  }

  if (pattern.startsWith("once:")) {
    const specificDate = pattern.replace("once:", "").trim();
    return {
      scheduleType: "once",
      timeString,
      selectedDays: [],
      specificDate,
    };
  }

  return {
    scheduleType: "daily",
    timeString: "07:00",
    selectedDays: [],
    specificDate: "",
  };
}

/**
 * Human-friendly Indonesian display of reminder schedule
 */
export function formatReminderSchedule(frequencyStr: string | null | undefined): string {
  const { scheduleType, timeString, selectedDays, specificDate } = decodeFrequency(frequencyStr);

  if (scheduleType === "daily") {
    return `Setiap Hari @ ${timeString} WIB`;
  }

  if (scheduleType === "weekly") {
    if (selectedDays.length === 0 || selectedDays.length === 7) {
      return `Setiap Hari @ ${timeString} WIB`;
    }
    const dayNames = selectedDays.map((d) => DAY_NAME_MAP[d] || d).join(", ");
    return `Setiap ${dayNames} @ ${timeString} WIB`;
  }

  if (scheduleType === "once") {
    if (!specificDate) {
      return `Sekali @ ${timeString} WIB`;
    }
    const parts = specificDate.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dateFormatted = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return `${dateFormatted} @ ${timeString} WIB`;
    }
    return `${specificDate} @ ${timeString} WIB`;
  }

  return `Jadwal @ ${timeString} WIB`;
}

/**
 * Checks if a reminder is scheduled for today
 */
export function isReminderActiveToday(frequencyStr: string | null | undefined): boolean {
  if (!frequencyStr) return false;
  const { scheduleType, selectedDays, specificDate } = decodeFrequency(frequencyStr);

  if (scheduleType === "daily") {
    return true;
  }

  const now = new Date();
  const todayDayNumber = now.getDay(); // 0 is Sunday, 1 is Monday ...

  if (scheduleType === "weekly") {
    const targetDayNumbers = selectedDays
      .map((d) => DAYS_OF_WEEK.find((item) => item.id === d)?.dayIndex)
      .filter((n): n is number => n !== undefined);
    return targetDayNumbers.includes(todayDayNumber);
  }

  if (scheduleType === "once" && specificDate) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return specificDate === todayStr;
  }

  return false;
}

/**
 * Checks if an active reminder's scheduled time has passed for today (overdue)
 */
export function isReminderPastDue(
  frequencyStr: string | null | undefined,
  nextTriggerAt?: string | null
): boolean {
  if (!frequencyStr) return false;

  // If next_trigger_at is provided and explicitly in the past
  if (nextTriggerAt) {
    const triggerTime = new Date(nextTriggerAt).getTime();
    if (triggerTime < Date.now()) {
      return true;
    }
  }

  // Check based on decoded schedule for today
  if (!isReminderActiveToday(frequencyStr)) return false;

  const { timeString } = decodeFrequency(frequencyStr);
  const [hoursStr, minsStr] = (timeString || "07:00").split(":");
  const schedHours = parseInt(hoursStr || "7", 10);
  const schedMins = parseInt(minsStr || "0", 10);

  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const schedTotalMins = schedHours * 60 + schedMins;

  return currentTotalMins > schedTotalMins;
}

