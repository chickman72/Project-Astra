"use client";

import { useMemo, useState } from "react";
import type { RemixRecord, RemixVariation } from "@/app/actions";
import { CalendarClock } from "lucide-react";

interface ScheduleCalendarProps {
  remixes: RemixRecord[];
  onSelectScheduledItem?: (remixId: string, variationId: string) => void;
}

interface ScheduledItem {
  date: Date;
  remixId: string;
  variationId: string;
  platform: RemixVariation["platform"];
  angle: RemixVariation["angle"];
  content: string;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0);

const formatMonth = (value: Date) =>
  value.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function ScheduleCalendar({ remixes, onSelectScheduledItem }: ScheduleCalendarProps) {
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const scheduledItems = useMemo(() => {
    const items: ScheduledItem[] = [];
    remixes.forEach((remix) => {
      remix.variations.forEach((variation) => {
        if (!variation.scheduledFor) return;
        const date = new Date(variation.scheduledFor);
        if (Number.isNaN(date.getTime())) return;
        items.push({
          date,
          remixId: remix.id,
          variationId: variation.id,
          platform: variation.platform,
          angle: variation.angle,
          content: variation.content,
        });
      });
    });
    return items;
  }, [remixes]);

  const monthStart = startOfMonth(activeMonth);
  const monthEnd = endOfMonth(activeMonth);
  const startWeekday = monthStart.getDay();
  const totalDays = monthEnd.getDate();

  const days: Date[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), i - startWeekday + 1));
  }
  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }

  const itemsForDay = (date: Date) =>
    scheduledItems.filter((item) => sameDay(item.date, date));

  const selectedItems = selectedDate ? itemsForDay(selectedDate) : [];
  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scheduled posts</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setActiveMonth(
                new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1)
              )
            }
            className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-sm font-medium text-gray-700">{formatMonth(activeMonth)}</span>
          <button
            onClick={() =>
              setActiveMonth(
                new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1)
              )
            }
            className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const inMonth = date.getMonth() === monthStart.getMonth();
          const dayItems = itemsForDay(date);
          const isSelected = selectedDate && sameDay(selectedDate, date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`rounded-lg border p-2 min-h-[70px] transition-colors ${
                inMonth ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
              } ${isSelected ? "ring-2 ring-blue-500" : "hover:bg-blue-50"}`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{date.getDate()}</span>
              </div>
              {dayItems.length > 0 && (
                <div className="text-sm font-semibold text-blue-700">
                  {dayItems.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">{selectedLabel}</p>
          {selectedItems.length === 0 && (
            <p className="text-sm text-gray-500">No posts scheduled.</p>
          )}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <button
                  key={`${item.remixId}-${item.variationId}`}
                  onClick={() => onSelectScheduledItem?.(item.remixId, item.variationId)}
                  className="w-full text-left border border-gray-200 rounded-lg p-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                >
                  <p className="text-xs text-gray-500 mb-1">
                    {item.platform.toUpperCase()} - {item.angle}
                  </p>
                  <p className="line-clamp-3">{item.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
