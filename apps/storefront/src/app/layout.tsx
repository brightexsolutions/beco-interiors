import type { Metadata } from 'next';
import '@beco/ui/src/tokens/tokens.css';
import { KeyboardAwareFocus, ScrollMotion } from '@beco/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { LaunchBanner } from '@/components/launch-banner';
import { SiteSplash } from '@/components/site-splash';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFab } from '@/components/whatsapp-fab';
import { getLiveAnnouncements, buildAnnouncementItems } from '@/lib/announcements';
import { getLaunchState } from '@/lib/launch';
import { buildRootMetadata } from '@/lib/seo';

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched here rather than inside the bars themselves, per D79: the home
  // hero needs to know whether a bar is taking up real space above it, to
  // pull its own full bleed photograph up behind the right amount of chrome
  // rather than leaving a gap the size of whatever the header alone does
  // not cover.
  //
  // Only ONE bar ever shows. The launch banner (D80) wins the slot the
  // moment Beco sets a date or throws the switch, because for that month
  // the anniversary IS the announcement. Its wrapper is shaped exactly like
  // AnnouncementBar's, so the spacing contract below does not care which.
  const [announcements, launch] = await Promise.all([
    getLiveAnnouncements(),
    getLaunchState(),
  ]);
  const launchActive = Boolean(launch.launchAt) || launch.isLive;
  // The bar rotates through every live announcement plus Beco's phone and
  // email, so the slot is always filled and the contact line is always in
  // rotation. The launch banner still takes the slot outright while it is
  // active, per D80.
  const barItems = buildAnnouncementItems(announcements);
  const hasBanner = launchActive || barItems.length > 0;

  return (
    <html lang="en">
      {/* data-announcement is read by the home hero's own CSS, nothing
          else. No bottom padding reserved here any more: the mobile action
          bar this used to clear, a full width fixed dock, is retired in
          favour of WhatsAppFab, which only ever occupies its own bottom
          right corner and was never going to cover the footer.

          suppressHydrationWarning: browser extensions write their own
          attributes onto <body> before React hydrates (ColorZilla's
          cz-shortcut-listen, password managers, and so on), which React
          then reports as a mismatch against markup that is in fact
          correct. Applies to this element's own attributes only, one
          level deep, so a real mismatch inside the app still surfaces. */}
      <body
        data-announcement={hasBanner ? '' : undefined}
        className="bg-high-vis-white font-ui text-base text-charcoal antialiased"
        suppressHydrationWarning
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[2px] focus:bg-charcoal focus:px-4 focus:py-3 focus:text-high-vis-white"
        >
          Skip to content
        </a>
        {/* Client only, renders nothing during SSR, so it cannot be the LCP
            candidate and nothing below it waits on it. See its own file for
            the full reasoning against the site's performance budget. */}
        <SiteSplash />
        {launchActive ? (
          <LaunchBanner launch={launch} />
        ) : (
          <AnnouncementBar items={barItems} />
        )}
        <SiteHeader />
        <div id="main">{children}</div>
        <SiteFooter />
        <WhatsAppFab />
        {/* Drives the entrance animations. Renders nothing. */}
        <ScrollMotion />
        {/* Keeps a focused quote form field above the phone keyboard. */}
        <KeyboardAwareFocus />
      </body>
    </html>
  );
}
