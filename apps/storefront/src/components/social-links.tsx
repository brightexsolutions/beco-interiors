import { SOCIAL } from '@/lib/site';

/**
 * Social profiles.
 *
 * A profile WITH a URL is a link. A profile without one is drawn but is not a
 * link: it renders as a `<span>`, so the row is visually complete while Beco
 * confirms the handles, and there is still nothing on the page that looks
 * clickable and is not.
 *
 * That distinction is the whole point. The prototype shipped these as
 * `href="#"`, which is a control that advertises going somewhere and does
 * not, and rule 3 forbids it. A placeholder that cannot be clicked is honest;
 * a link that goes nowhere is a bug a user finds for you.
 *
 * Inline SVG rather than an icon font: the CSP allows no external stylesheet
 * from a font CDN, and a whole icon font for three glyphs is a poor trade
 * against the page budget.
 */
/**
 * Single path per mark, at 24x24, so five platforms cost about 3KB inline
 * rather than a whole icon font for five glyphs.
 */
const PATHS: Record<string, string> = {
  Instagram:
    'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.44.43.7.83.92 1.4.17.42.37 1.05.42 2.23.06 1.28.07 1.66.07 4.88s0 3.6-.07 4.88c-.05 1.18-.25 1.8-.42 2.23-.22.56-.48.97-.91 1.4-.43.42-.83.68-1.4.9-.42.17-1.05.37-2.23.42-1.27.06-1.65.07-4.88.07s-3.6 0-4.88-.07c-1.18-.05-1.8-.25-2.23-.42-.56-.22-.97-.48-1.4-.9-.42-.43-.68-.84-.9-1.4-.17-.43-.37-1.05-.42-2.23C2.2 15.6 2.2 15.22 2.2 12s0-3.6.07-4.88c.05-1.18.25-1.8.42-2.23.22-.56.48-.97.9-1.4.43-.42.84-.68 1.4-.9.43-.17 1.05-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.98c-3.16 0-3.5.01-4.75.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.4.4-.66.8-.87 1.34-.16.42-.36 1.04-.4 2.18-.07 1.24-.08 1.6-.08 4.75s0 3.5.07 4.75c.05 1.14.25 1.76.41 2.17.21.55.47.94.87 1.35.41.4.8.66 1.35.87.41.16 1.03.36 2.17.41 1.24.06 1.6.07 4.75.07s3.5 0 4.75-.07c1.14-.05 1.76-.25 2.17-.41.55-.21.94-.47 1.35-.87.4-.41.66-.8.87-1.35.16-.41.36-1.03.41-2.17.06-1.24.07-1.6.07-4.75s0-3.5-.07-4.75c-.05-1.14-.25-1.76-.41-2.18a3.6 3.6 0 0 0-.87-1.34 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.25-.06-1.6-.07-4.75-.07Zm0 3.37a5.03 5.03 0 1 1 0 10.06 5.03 5.03 0 0 1 0-10.06Zm0 8.3a3.27 3.27 0 1 0 0-6.54 3.27 3.27 0 0 0 0 6.53Zm6.4-8.5a1.18 1.18 0 1 1-2.35 0 1.18 1.18 0 0 1 2.36 0Z',
  Facebook:
    'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.54-1.5h1.65V3.63c-.29-.04-1.27-.13-2.4-.13-2.39 0-4.02 1.46-4.02 4.13V9.9H7.5V13h2.77v8h3.23Z',
  YouTube:
    'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z',
  TikTok:
    'M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z',
  X:
    'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93ZM17.6 20.64h2.04L6.49 3.24H4.3Z',
};

/**
 * Both states look the same at rest and both respond to hover, because a row
 * of social marks where two are bright and three are grey reads as broken
 * rather than as pending.
 *
 * The difference is what happens on the way in: a real profile is an anchor
 * and navigates, a placeholder is a span with a default cursor and a title
 * saying the profile is not live yet. Nothing is styled to look clickable and
 * then refuse.
 */
const BOX = [
  'flex h-11 w-11 items-center justify-center border border-neutral-700',
  'text-neutral-300 transition-[color,border-color,transform,background-color] duration-300 ease-brand',
  'hover:-translate-y-0.5 hover:border-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
].join(' ');

export function SocialLinks({ className }: { className?: string }) {
  const shown = SOCIAL.filter((s) => PATHS[s.name]);
  if (shown.length === 0) return null;

  return (
    <ul className={className}>
      {shown.map((social) => {
        const icon = (
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d={PATHS[social.name]} />
          </svg>
        );

        return (
          <li key={social.name}>
            {social.url ? (
              <a
                href={social.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Beco Interiors on ${social.name}`}
                className={BOX}
              >
                {icon}
              </a>
            ) : (
              <span
                title={`${social.name} profile coming soon`}
                aria-label={`${social.name}, profile coming soon`}
                className={`${BOX} cursor-default`}
              >
                {icon}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
