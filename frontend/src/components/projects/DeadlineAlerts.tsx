"use client";

import { useMemo } from "react";

interface Deadline {
  label: string;
  date: Date | string | null | undefined;
}

function getDaysUntil(date: Date | string): number {
  const now = new Date();
  const target = new Date(date);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((targetDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(days: number): "overdue" | "critical" | "warning" | "upcoming" | "ok" {
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  if (days <= 14) return "upcoming";
  return "ok";
}

const urgencyConfig = {
  overdue: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    accent: "text-red-600",
    dot: "bg-red-500",
    pulse: true,
  },
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    accent: "text-red-600",
    dot: "bg-red-500",
    pulse: true,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    accent: "text-amber-600",
    dot: "bg-amber-500",
    pulse: false,
  },
  upcoming: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    accent: "text-blue-600",
    dot: "bg-blue-500",
    pulse: false,
  },
  ok: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    accent: "text-emerald-600",
    dot: "bg-emerald-500",
    pulse: false,
  },
};

function formatCountdownText(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? "1 day overdue" : `${abs} days overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

export default function DeadlineAlerts({ deadlines }: { deadlines: Deadline[] }) {
  const activeDeadlines = useMemo(() => {
    return deadlines
      .filter((d) => d.date != null)
      .map((d) => {
        const days = getDaysUntil(d.date!);
        const urgency = getUrgency(days);
        return { ...d, days, urgency };
      })
      .sort((a, b) => a.days - b.days);
  }, [deadlines]);

  if (activeDeadlines.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {activeDeadlines.map((d) => {
          const config = urgencyConfig[d.urgency];
          return (
            <div
              key={d.label}
              className={`
                flex items-center gap-2 rounded-full border px-3 py-1.5
                text-[13px] font-medium
                ${config.bg} ${config.border} ${config.text}
              `}
            >
              <span className="relative flex h-2 w-2">
                {config.pulse && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dot}`}
                  />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
              </span>
              <span>{d.label}</span>
              <span className={`font-semibold ${config.accent}`}>
                {formatCountdownText(d.days)}
              </span>
            </div>
          );
        })}
      </div>

      {activeDeadlines
        .filter((d) => d.urgency === "overdue" || d.urgency === "critical")
        .map((d) => {
          const config = urgencyConfig[d.urgency];
          return (
            <div
              key={`alert-${d.label}`}
              className={`
                flex items-start gap-3 rounded-xl border px-4 py-3
                ${config.bg} ${config.border}
              `}
            >
              <span className="mt-0.5 text-[18px]" aria-hidden>
                {d.urgency === "overdue" ? "⚠️" : "🔔"}
              </span>
              <div>
                <div className={`text-[13px] font-semibold ${config.text}`}>
                  {d.urgency === "overdue"
                    ? `${d.label} is ${Math.abs(d.days)} day${Math.abs(d.days) !== 1 ? "s" : ""} past due`
                    : `${d.label} is ${d.days === 0 ? "today" : `in ${d.days} day${d.days !== 1 ? "s" : ""}`}`}
                </div>
                <div className={`mt-0.5 text-[12px] ${config.text} opacity-80`}>
                  {d.urgency === "overdue"
                    ? "This deadline has passed. Update the project or contact your customer."
                    : "This deadline is approaching fast. Make sure you're on track."}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}