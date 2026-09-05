import type { Metadata } from 'next';
import '@beco/ui/src/tokens/tokens.css';
import { ScrollMotion } from '@beco/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { LaunchBanner } from '@/components/launch-banner';
import { SiteSplash } from '@/components/site-splash';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { getLiveAnnouncement } from '@/lib/announcements';
import { getLaunchState } from '@/lib/launch';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.beco.co.ke'),
  title: {
    default: 'Beco Interiors | Sintered stone and interior materials in Nairobi',
    // Every page states the brand without each page having to remember to.
    template: '%s | Beco Interiors',
  },
  description:
    'Sintered stone slabs, wall panels, lighting and interior accessories, stocked in Nairobi. Request a quote for the whole list at once.',
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    siteName: SITE.name,
  },
};

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
  const [announcement, launch] = await Promise.all([
    getLiveAnnouncement(),
    getLaunchState(),
  ]);
  const launchActive = Boolean(launch.launchAt) || launch.isLive;
  const hasBanner = launchActive || Boolean(announcement);

  return (
    <html lang="en">
      {/* pb on mobile clears the sticky action bar, which is fixed and would
          otherwise cover the last of the footer. data-announcement is read
          by the home hero's own CSS, nothing else. */}
      <body
        data-announcement={hasBanner ? '' : undefined}
        className="bg-high-vis-white font-ui text-base text-charcoal antialiased pb-20 md:pb-0"
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
          <AnnouncementBar announcement={announcement} />
        )}
        <SiteHeader />
        <div id="main">{children}</div>
        <SiteFooter />
        <MobileActionBar />
        {/* Drives the entrance animations. Renders nothing. */}
        <ScrollMotion />
      </body>
    </html>
  );
}
