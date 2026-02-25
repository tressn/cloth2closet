export type TimezoneOption = { value: string; label: string };

export const TIMEZONES: TimezoneOption[] = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },

  { value: "America/Phoenix", label: "Arizona (US)" },
  { value: "America/Anchorage", label: "Alaska (US)" },
  { value: "Pacific/Honolulu", label: "Hawaii (US)" },

  { value: "America/Toronto", label: "Toronto (Canada)" },
  { value: "America/Vancouver", label: "Vancouver (Canada)" },
  { value: "America/Halifax", label: "Atlantic Time (Canada)" },

  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },

  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (Central Europe)" },
  { value: "Europe/Berlin", label: "Berlin (Central Europe)" },
  { value: "Europe/Madrid", label: "Madrid (Central Europe)" },
  { value: "Europe/Rome", label: "Rome (Central Europe)" },
  { value: "Europe/Warsaw", label: "Warsaw (Central Europe)" },
  { value: "Europe/Athens", label: "Athens (Eastern Europe)" },
  { value: "Europe/Istanbul", label: "Istanbul" },

  { value: "Africa/Lagos", label: "Lagos (West Africa)" },
  { value: "Africa/Accra", label: "Accra (Ghana)" },
  { value: "Africa/Nairobi", label: "Nairobi (East Africa)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (South Africa)" },
  { value: "Africa/Cairo", label: "Cairo (Egypt)" },

  { value: "Asia/Dubai", label: "Dubai (UAE)" },
  { value: "Asia/Riyadh", label: "Riyadh (Saudi Arabia)" },
  { value: "Asia/Jerusalem", label: "Jerusalem (Israel)" },

  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Karachi", label: "Pakistan" },
  { value: "Asia/Dhaka", label: "Bangladesh" },

  { value: "Asia/Bangkok", label: "Bangkok (Thailand)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Shanghai", label: "Shanghai (China)" },
  { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
  { value: "Asia/Seoul", label: "Seoul (Korea)" },

  { value: "Australia/Sydney", label: "Sydney (Australia)" },
  { value: "Australia/Perth", label: "Perth (Australia)" },
  { value: "Pacific/Auckland", label: "Auckland (New Zealand)" },
];

export const TIMEZONE_SET = new Set(TIMEZONES.map((t) => t.value));