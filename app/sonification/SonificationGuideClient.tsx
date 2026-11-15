"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";

export type Reading = { label: string; value: string; unit?: string };
export type Layer = {
  name: string;
  active: boolean;
  description: string;
  intensity: number; // 0-100
  frequency: string;
  timbre: string;
};
export type Mapping = { parameter: string; sound: string; range: string };
export type Note = { title: string; description: string };

export type SonificationGuideProps = {
  mode: "Live" | "Simulation";
  audio: "Playing" | "Standby";
  updatedAt?: string;
  readings: Reading[];
  layers: Layer[];
  mappings: Mapping[];
  alerts: Note[];
  principles: Note[];
};

type TabId = "layers" | "alerts" | "principles";

const line = "border-[#22304D]";
const muted = "text-[#9AA8C4]";
const body = "text-[#B9C4DB]";
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

function Status({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${line} px-3 py-1 text-sm ${body}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${on ? "bg-amber-400" : "bg-[#6B7A99]"}`}
      />
      {children}
    </span>
  );
}

function NoteList({ items }: { items: Note[] }) {
  return (
    <ul className={`divide-y divide-[#22304D] border-y ${line}`}>
      {items.map((n) => (
        <li key={n.title} className="grid gap-1 py-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <h3 className="font-semibold text-white">{n.title}</h3>
          <p className={`max-w-prose leading-relaxed ${body}`}>{n.description}</p>
        </li>
      ))}
    </ul>
  );
}

export function SonificationGuideClient({
  mode,
  audio,
  updatedAt,
  readings,
  layers,
  mappings,
  alerts,
  principles,
}: SonificationGuideProps) {
  const [tab, setTab] = useState<TabId>("layers");
  const baseId = useId();
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({
    layers: null,
    alerts: null,
    principles: null,
  });

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "layers", label: "Continuous layers", count: layers.length },
    { id: "alerts", label: "Event alerts", count: alerts.length },
    { id: "principles", label: "Design principles", count: principles.length },
  ];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : tabs.length - 1;
    const next = tabs[(index + step) % tabs.length].id;
    setTab(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="min-h-screen bg-[#0B1426] text-[#E6EBF5]">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8"
      >
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className={`-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded text-sm ${muted} hover:text-white ${focus}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Heliophon
          </Link>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Sonification guide
            </h1>
            <p className={`max-w-prose text-lg ${body}`}>
              How live space weather values become sound.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Status on={mode === "Live"}>{mode}</Status>
            <Status on={audio === "Playing"}>Audio {audio.toLowerCase()}</Status>
          </div>
        </header>

        <section aria-labelledby={`${baseId}-readings`} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${baseId}-readings`} className="text-xl font-semibold text-white">
              Current readings
            </h2>
            {updatedAt ? <p className={`text-sm ${muted}`}>Updated {updatedAt}</p> : null}
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#22304D] sm:grid-cols-3 lg:grid-cols-5">
            {readings.map((r) => (
              <div key={r.label} className="bg-[#0F192E] px-5 py-4">
                <dt className={`text-sm ${muted}`}>{r.label}</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums text-white">
                  {r.value}
                  {r.unit ? (
                    <span className={`ml-1 text-base font-normal ${muted}`}>{r.unit}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-6">
          <div role="tablist" aria-label="Guide sections" className={`flex gap-2 overflow-x-auto border-b ${line}`}>
            {tabs.map((t, i) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    refs.current[t.id] = el;
                  }}
                  role="tab"
                  id={`${baseId}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`-mb-px min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-medium ${focus} ${
                    selected
                      ? "border-amber-400 text-white"
                      : "border-transparent text-[#9AA8C4] hover:text-white"
                  }`}
                >
                  {t.label}
                  <span className={`ml-2 tabular-nums ${muted}`}>{t.count}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`${baseId}-panel-${tab}`}
            aria-labelledby={`${baseId}-tab-${tab}`}
            tabIndex={0}
            className={`rounded ${focus}`}
          >
            {tab === "layers" && (
              <ul className={`divide-y divide-[#22304D] border-y ${line}`}>
                {layers.map((l) => (
                  <li key={l.name} className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{l.name}</h3>
                        <Status on={l.active}>{l.active ? "Active" : "Idle"}</Status>
                      </div>
                      <p className={`max-w-prose leading-relaxed ${body}`}>{l.description}</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className={muted}>Intensity</span>
                          <span className="tabular-nums text-white">{l.intensity}%</span>
                        </div>
                        <div
                          role="meter"
                          aria-label={`${l.name} intensity`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={l.intensity}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-[#22304D]"
                        >
                          <div
                            className="h-full rounded-full bg-amber-400 transition-[width] duration-500 motion-reduce:transition-none"
                            style={{ width: `${l.intensity}%` }}
                          />
                        </div>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt className={muted}>Pitch</dt>
                        <dd className="text-right text-white">{l.frequency}</dd>
                        <dt className={muted}>Timbre</dt>
                        <dd className="text-right text-white">{l.timbre}</dd>
                      </dl>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {tab === "alerts" && <NoteList items={alerts} />}
            {tab === "principles" && <NoteList items={principles} />}
          </div>
        </section>

        <section aria-labelledby={`${baseId}-mapping`} className="flex flex-col gap-4">
          <h2 id={`${baseId}-mapping`} className="text-xl font-semibold text-white">
            How each value maps to sound
          </h2>
          <div className={`overflow-x-auto rounded-lg border ${line}`}>
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">Mapping from space weather values to audio parameters</caption>
              <thead className="bg-[#0F192E]">
                <tr>
                  <th scope="col" className={`px-4 py-3 font-medium ${muted}`}>Value</th>
                  <th scope="col" className={`px-4 py-3 font-medium ${muted}`}>Sound parameter</th>
                  <th scope="col" className={`px-4 py-3 font-medium ${muted}`}>Range</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-[#22304D] border-t ${line}`}>
                {mappings.map((m) => (
                  <tr key={m.parameter}>
                    <th scope="row" className="px-4 py-3 font-medium text-white">{m.parameter}</th>
                    <td className={`px-4 py-3 ${body}`}>{m.sound}</td>
                    <td className={`px-4 py-3 tabular-nums ${body}`}>{m.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className={`border-t ${line} pt-6`}>
          <p className={`max-w-prose text-sm leading-relaxed ${muted}`}>
            Data comes from NOAA SWPC and NASA DONKI. The mapping from data to sound is a design
            choice, not a physical measurement, and this page is not an official warning.
          </p>
        </footer>
      </main>
    </div>
  );
}