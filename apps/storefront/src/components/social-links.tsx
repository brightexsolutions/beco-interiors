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
const PATHS: Record<string, string> = {
  Instagram:
    'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.44.43.7.83.92 1.4.17.42.37 1.05.42 2.23.06 1.28.07 1.66.07 4.88s0 3.6-.07 4.88c-.05 1.18-.25 1.8-.42 2.23-.22.56-.48.97-.91 1.4-.43.42-.83.68-1.4.9-.42.17-1.05.37-2.23.42-1.27.06-1.65.07-4.88.07s-3.6 0-4.88-.07c-1.18-.05-1.8-.25-2.23-.42-.56-.22-.97-.48-1.4-.9-.42-.43-.68-.84-.9-1.4-.17-.43-.37-1.05-.42-2.23C2.2 15.6 2.2 15.22 2.2 12s0-3.6.07-4.88c.05-1.18.25-1.8.42-2.23.22-.56.48-.97.9-1.4.43-.42.84-.68 1.4-.9.43-.17 1.05-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.98c-3.16 0-3.5.01-4.75.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.4.4-.66.8-.87 1.34-.16.42-.36 1.04-.4 2.18-.07 1.24-.08 1.6-.08 4.75s0 3.5.07 4.75c.05 1.14.25 1.76.41 2.17.21.55.47.94.87 1.35.41.4.8.66 1.35.87.41.16 1.03.36 2.17.41 1.24.06 1.6.07 4.75.07s3.5 0 4.75-.07c1.14-.05 1.76-.25 2.17-.41.55-.21.94-.47 1.35-.87.4-.41.66-.8.87-1.35.16-.41.36-1.03.41-2.17.06-1.24.07-1.6.07-4.75s0-3.5-.07-4.75c-.05-1.14-.25-1.76-.41-2.18a3.6 3.6 0 0 0-.87-1.34 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.25-.06-1.6-.07-4.75-.07Zm0 3.37a5.03 5.03 0 1 1 0 10.06 5.03 5.03 0 0 1 0-10.06Zm0 8.3a3.27 3.27 0 1 0 0-6.54 3.27 3.27 0 0 0 0 6.53Zm6.4-8.5a1.18 1.18 0 1 1-2.35 0 1.18 1.18 0 0 1 2.36 0Z',
  Facebook:
    'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.54-1.5h1.65V3.63c-.29-.04-1.27-.13-2.4-.13-2.39 0-4.02 1.46-4.02 4.13V9.9H7.5V13h2.77v8h3.23Z',
  LinkedIn:
    'M6.94 8.5H3.9V21h3.04V8.5ZM5.42 3a1.77 1.77 0 1 0 0 3.53 1.77 1.77 0 0 0 0-3.53ZM21 14.13c0-3.32-1.77-4.87-4.14-4.87-1.9 0-2.76 1.05-3.23 1.79V8.5H10.6c.04.86 0 12.5 0 12.5h3.03v-6.98c0-.27.02-.55.1-.74.22-.55.72-1.11 1.56-1.11 1.1 0 1.55.84 1.55 2.07V21H21v-6.87Z',
};

const BOX =
  'flex h-11 w-11 items-center justify-center border transition-colors';

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
                className={`${BOX} border-neutral-700 text-neutral-300 hover:border-high-vis-white hover:text-high-vis-white`}
              >
                {icon}
              </a>
            ) : (
              <span
                title={`${social.name} profile coming soon`}
                aria-label={`${social.name}, profile coming soon`}
                className={`${BOX} cursor-default border-neutral-800 text-neutral-700`}
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
