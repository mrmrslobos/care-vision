"use client";

import { BookOpen, CalendarDays, Check, Film, Tv } from "lucide-react";
import { useState } from "react";
import type { CalendarData, CalendarItem, CalendarSource } from "@/lib/types";
import { dayKey, dayLabel } from "../format";
import { Card, Poster } from "../ui";
import { useService } from "../useService";

const SOURCES: { id: CalendarSource; label: string; icon: typeof Tv }[] = [
  { id: "sonarr", label: "TV", icon: Tv },
  { id: "radarr", label: "Movies", icon: Film },
  { id: "bookshelf", label: "Books", icon: BookOpen },
];

// Movie/book release dates are calendar dates stored as UTC midnight —
// read them in UTC so they don't slide a day in western timezones.
function localDate(item: CalendarItem) {
  const d = new Date(item.date);
  return item.allDay ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
}

export function CalendarCard({ links }: { links: Partial<Record<CalendarSource, string | null>> }) {
  const state = useService<CalendarData>("calendar", 5 * 60_000);
  const [hidden, setHidden] = useState<Set<CalendarSource>>(new Set());

  const toggle = (s: CalendarSource) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <Card title="Coming up" icon={<CalendarDays size={16} />} accent="var(--series-1)" state={state} className="span-full">
      {(d) => {
        const active = SOURCES.filter((s) => d.sources.some((x) => x.source === s.id));
        const visible = d.items.filter((i) => !hidden.has(i.source));
        const groups = new Map<string, { date: Date; items: CalendarItem[] }>();
        for (const item of visible) {
          const date = localDate(item);
          const key = dayKey(date);
          if (!groups.has(key)) groups.set(key, { date, items: [] });
          groups.get(key)!.items.push(item);
        }
        const days = [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
        const todayKey = dayKey(new Date());

        return (
          <div className="calendar">
            <div className="filters" role="group" aria-label="Filter calendar">
              {active.map((s) => {
                const info = d.sources.find((x) => x.source === s.id)!;
                const count = d.items.filter((i) => i.source === s.id).length;
                const on = !hidden.has(s.id);
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip chip-${s.id}`}
                    aria-pressed={on}
                    onClick={() => toggle(s.id)}
                    title={info.error ?? (info.queue ? `${info.queue} downloading` : undefined)}
                  >
                    <i className="chip-dot" aria-hidden />
                    <Icon size={13} aria-hidden />
                    {s.label}
                    <span className="chip-count">{info.ok ? count : "!"}</span>
                  </button>
                );
              })}
              <span className="filters-links">
                {active.map((s) =>
                  links[s.id] ? (
                    <a key={s.id} href={links[s.id]!} target="_blank" rel="noreferrer">
                      {s.id[0].toUpperCase() + s.id.slice(1)}
                    </a>
                  ) : null,
                )}
              </span>
            </div>

            {days.length === 0 ? (
              <div className="card-empty">Nothing scheduled.</div>
            ) : (
              <ol className="agenda">
                {days.map(({ date, items }) => {
                  const key = dayKey(date);
                  return (
                    <li key={key} className={`agenda-day${key === todayKey ? " is-today" : ""}${date < new Date() && key !== todayKey ? " is-past" : ""}`}>
                      <div className="agenda-date">
                        <span className="agenda-dow">{dayLabel(date)}</span>
                        <span className="agenda-dm">
                          {date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <ul className="agenda-items">
                        {items.map((item) => (
                          <li key={item.id} className={`event event-${item.source}`}>
                            <Poster src={item.image} title={item.title} className="poster-sm" />
                            <div className="event-text">
                              <div className="event-title">{item.title}</div>
                              <div className="event-sub">{item.subtitle}</div>
                            </div>
                            <div className="event-side">
                              <span className="event-kind">
                                {item.allDay
                                  ? item.kind
                                  : new Date(item.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                              </span>
                              {item.hasFile ? (
                                <span className="event-have" title="Downloaded" aria-label="Downloaded" role="img">
                                  <Check size={12} strokeWidth={3} aria-hidden />
                                </span>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      }}
    </Card>
  );
}
