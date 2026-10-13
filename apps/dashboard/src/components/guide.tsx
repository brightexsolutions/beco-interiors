'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, DialogBody, Icon, cn } from '@beco/ui';
import { currentGuideTopic, type GuideTopic } from '@/lib/guide';
import { availableSteps, tourFor, type TourStep } from '@/lib/tour';
import { Tour } from './tour';

/**
 * The guide, D140: a Help control in the shell that opens a Dialog with the
 * current screen's walkthrough first and every other screen the person can
 * reach listed beside it. Each topic is what the screen is for, then the
 * jobs on it as numbered steps: what to do, then where and what happens.
 *
 * The topics arrive from the server already filtered by the access map, so
 * the guide never describes a screen the reader cannot open.
 */
export function GuideButton({
  topics,
  className,
  compact = false,
}: {
  topics: GuideTopic[];
  className?: string | undefined;
  /** Icon only, for the phone header where a word does not fit. */
  compact?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ordered = useMemo(() => orderForPath(topics, pathname), [topics, pathname]);
  const [current, setCurrent] = useState<string | null>(null);
  const [tour, setTour] = useState<TourStep[] | null>(null);

  // A fresh screen opens the guide on its own topic.
  useEffect(() => {
    setCurrent(ordered[0]?.id ?? null);
  }, [ordered]);

  if (topics.length === 0) return null;
  const topic = ordered.find((item) => item.id === current) ?? ordered[0]!;

  // The Guide control starts the screen tour, D149; the written guide is a
  // step away from it, and from there the tour can be started again.
  const startTour = () => {
    const steps = availableSteps(tourFor(pathname, currentGuideTopic(pathname, topics)));
    if (steps.length === 0) {
      setOpen(true);
      return;
    }
    setOpen(false);
    setTour(steps);
  };

  return (
    <>
      <button
        type="button"
        data-tour="guide"
        onClick={startTour}
        aria-haspopup="dialog"
        aria-expanded={open || tour !== null}
        aria-label={compact ? 'Guide' : undefined}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-full font-ui text-sm font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-charcoal',
          compact ? 'w-11' : 'px-3',
          className,
        )}
      >
        <Icon name="help" className="h-[1.15rem] w-[1.15rem]" />
        {compact ? null : <span>Guide</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Guide" className="sm:max-w-[52rem]">
        <DialogBody>
          <div className="grid gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
            <nav aria-label="Guide topics" className="min-w-0">
              <ul className="flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
                {ordered.map((item, index) => {
                  const active = item.id === topic.id;
                  return (
                    <li key={item.id} className="shrink-0">
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => setCurrent(item.id)}
                        className={cn(
                          'flex min-h-11 w-full items-center gap-2 whitespace-nowrap rounded-card px-3 text-left font-ui text-base transition-colors',
                          active
                            ? 'bg-charcoal font-semibold text-high-vis-white'
                            : 'text-neutral-700 hover:bg-neutral-100 hover:text-charcoal',
                        )}
                      >
                        <span className="truncate">{item.title}</span>
                        {index === 0 ? (
                          <span
                            className={cn(
                              'ml-auto font-ui text-xs uppercase tracking-[0.1em]',
                              active ? 'text-neutral-300' : 'text-neutral-500',
                            )}
                          >
                            Here
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <article aria-labelledby={`guide-${topic.id}`} className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3
                  id={`guide-${topic.id}`}
                  className="font-display text-2xl leading-tight text-charcoal"
                >
                  {topic.title}
                </h3>
                <button
                  type="button"
                  onClick={startTour}
                  className="beco-ring inline-flex h-11 items-center gap-2 rounded-control border border-neutral-300 px-3 font-ui text-sm font-semibold text-charcoal hover:bg-neutral-100"
                >
                  Take the tour
                </button>
              </div>
              <p className="mt-2 max-w-[60ch] font-ui text-base text-neutral-700">
                {topic.purpose}
              </p>
              <ol className="mt-5 space-y-4">
                {topic.steps.map((step, index) => (
                  <li key={step.do} className="flex gap-3">
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal font-ui text-sm font-semibold text-high-vis-white"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-ui text-base font-semibold text-charcoal">{step.do}</p>
                      <p className="mt-0.5 max-w-[60ch] font-ui text-base text-neutral-700">
                        {step.where}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {topic.notes && topic.notes.length > 0 ? (
                <ul className="mt-5 space-y-2 border-t border-neutral-200 pt-4">
                  {topic.notes.map((note) => (
                    <li key={note} className="flex gap-2 font-ui text-sm text-neutral-700">
                      <Icon name="info" className="mt-1 shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </div>
        </DialogBody>
      </Dialog>
      {tour ? (
        <Tour
          steps={tour}
          onClose={() => setTour(null)}
          onOpenGuide={() => {
            setTour(null);
            setOpen(true);
          }}
        />
      ) : null}
    </>
  );
}

/** The current screen's topic first, by longest path prefix, the rest in guide order. */
export function orderForPath(topics: GuideTopic[], pathname: string): GuideTopic[] {
  const clean = pathname.split('?')[0] ?? pathname;
  let current: GuideTopic | null = null;
  for (const topic of topics) {
    if (topic.path.includes('?')) continue;
    const hit =
      topic.path === '/'
        ? clean === '/'
        : clean === topic.path || clean.startsWith(`${topic.path}/`);
    if (hit && (!current || topic.path.length > current.path.length)) current = topic;
  }
  if (!current) return topics;
  return [current, ...topics.filter((topic) => topic.id !== current.id)];
}
