"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import {
  DAY_ORDER,
  pickDefaultActiveDay,
  type PublicScheduleDay,
  type PublicSchedulePayload,
} from "@/lib/public-schedule";

function formatTimeRange(startTime: string, endTime: string) {
  return `${format(parseISO(startTime), "h:mm a")} – ${format(parseISO(endTime), "h:mm a")}`;
}

export function EmbedScheduleView({
  tenant,
  theme = "light",
  hideBookButton = false,
  bookUrlOverride,
}: {
  tenant: string;
  theme?: "light" | "dark" | "reset";
  hideBookButton?: boolean;
  bookUrlOverride?: string;
}) {
  const [data, setData] = useState<PublicSchedulePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>(DAY_ORDER[0]);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/public/${tenant}/schedule`);
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load schedule");
        return;
      }

      setData(json);
      setActiveDay(pickDefaultActiveDay(json.days as PublicScheduleDay[]));
    }

    void load();
  }, [tenant]);

  const dayClasses = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.days.find((day) => day.day === activeDay)?.classes ?? [];
  }, [activeDay, data]);

  const bookUrl = bookUrlOverride || data?.bookUrl;

  return (
    <div className={`gymsynk-embed gymsynk-embed--${theme}`} data-theme={theme}>
      <style>{`
        .gymsynk-embed {
          --embed-bg: #faf8f4;
          --embed-surface: #ffffff;
          --embed-text: #111111;
          --embed-muted: #666666;
          --embed-border: #e8e4dc;
          --embed-accent: #111111;
          --embed-accent-text: #ffffff;
          font-family: var(--font-montserrat), "Montserrat", ui-sans-serif, system-ui, sans-serif;
          color: var(--embed-text);
          background: var(--embed-bg);
          padding: 1rem;
          box-sizing: border-box;
        }
        .gymsynk-embed *, .gymsynk-embed *::before, .gymsynk-embed *::after {
          box-sizing: border-box;
        }
        .gymsynk-embed--dark {
          --embed-bg: #111111;
          --embed-surface: #1a1a1a;
          --embed-text: #f5f5f5;
          --embed-muted: #aaaaaa;
          --embed-border: #333333;
          --embed-accent: #ffffff;
          --embed-accent-text: #111111;
        }
        .gymsynk-embed--reset {
          --embed-bg: #f3efe6;
          --embed-surface: #ffffff;
          --embed-text: #111111;
          --embed-muted: #5c5c5c;
          --embed-border: #ddd6c8;
          --embed-accent: #111111;
          --embed-accent-text: #ffffff;
        }
        .gymsynk-embed__header {
          margin-bottom: 1rem;
        }
        .gymsynk-embed__title {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0 0 0.25rem;
        }
        .gymsynk-embed__subtitle {
          margin: 0;
          color: var(--embed-muted);
          font-size: 0.875rem;
        }
        .gymsynk-embed__tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .gymsynk-embed__tab {
          border: 1px solid var(--embed-border);
          background: var(--embed-surface);
          color: var(--embed-text);
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .gymsynk-embed__tab.is-active {
          background: var(--embed-accent);
          color: var(--embed-accent-text);
          border-color: var(--embed-accent);
        }
        .gymsynk-embed__panel {
          background: var(--embed-surface);
          border: 1px solid var(--embed-border);
          padding: 1rem;
        }
        .gymsynk-embed__day-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0 0 0.25rem;
        }
        .gymsynk-embed__day-count {
          margin: 0 0 1rem;
          color: var(--embed-muted);
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .gymsynk-embed__list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .gymsynk-embed__item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.875rem 0;
          border-top: 1px solid var(--embed-border);
        }
        .gymsynk-embed__item:first-child {
          border-top: none;
          padding-top: 0;
        }
        .gymsynk-embed__class {
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          font-size: 0.875rem;
        }
        .gymsynk-embed__time {
          color: var(--embed-muted);
          font-size: 0.8125rem;
          white-space: nowrap;
        }
        .gymsynk-embed__empty,
        .gymsynk-embed__error {
          color: var(--embed-muted);
          font-size: 0.875rem;
        }
        .gymsynk-embed__book {
          display: inline-block;
          margin-top: 1rem;
          background: var(--embed-accent);
          color: var(--embed-accent-text);
          text-decoration: none;
          padding: 0.75rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .gymsynk-embed__powered {
          margin-top: 1.25rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--embed-border);
          font-size: 0.6875rem;
          color: var(--embed-muted);
          text-align: center;
        }
        .gymsynk-embed__powered a {
          color: var(--embed-muted);
          font-weight: 600;
          text-decoration: none;
        }
        .gymsynk-embed__powered a:hover {
          color: var(--embed-text);
        }
      `}</style>

      <div className="gymsynk-embed__header">
        <p className="gymsynk-embed__title">Weekly Class Schedule</p>
        <p className="gymsynk-embed__subtitle">
          All classes run for 45 minutes. Live from GymSynk.
        </p>
      </div>

      {error ? <p className="gymsynk-embed__error">{error}</p> : null}

      {!error && data ? (
        <>
          <div className="gymsynk-embed__tabs" role="tablist">
            {DAY_ORDER.map((day) => {
              const count =
                data.days.find((entry) => entry.day === day)?.classes.length ?? 0;
              const disabled = count === 0;

              return (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={activeDay === day}
                  disabled={disabled}
                  className={`gymsynk-embed__tab${activeDay === day ? " is-active" : ""}`}
                  onClick={() => setActiveDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <div className="gymsynk-embed__panel" role="tabpanel">
            <p className="gymsynk-embed__day-title">{activeDay}</p>
            <p className="gymsynk-embed__day-count">
              {dayClasses.length} class{dayClasses.length === 1 ? "" : "es"}
            </p>

            {dayClasses.length === 0 ? (
              <p className="gymsynk-embed__empty">No classes scheduled this day.</p>
            ) : (
              <ul className="gymsynk-embed__list">
                {dayClasses.map((item) => (
                  <li key={item.id} className="gymsynk-embed__item">
                    <span className="gymsynk-embed__class">{item.classTitle}</span>
                    <span className="gymsynk-embed__time">
                      {formatTimeRange(item.startTime, item.endTime)} ·{" "}
                      {item.durationMinutes} mins
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!hideBookButton && bookUrl ? (
            <a
              className="gymsynk-embed__book"
              href={bookUrl}
              target="_top"
              rel="noopener noreferrer"
            >
              Book a Session
            </a>
          ) : null}
        </>
      ) : null}

      {!error && !data ? (
        <p className="gymsynk-embed__empty">Loading schedule…</p>
      ) : null}

      <p className="gymsynk-embed__powered">
        Powered by{" "}
        <a
          href="https://gymsynk.net"
          target="_blank"
          rel="noopener noreferrer"
        >
          GymSynk
        </a>
      </p>
    </div>
  );
}
