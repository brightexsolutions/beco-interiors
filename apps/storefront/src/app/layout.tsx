import type { Metadata } from 'next';
import '@beco/ui/src/tokens/tokens.css';
import { ScrollMotion } from '@beco/ui';
import { AnnouncementBar } from '@/components/announcement-bar';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.beco.co.ke'),
  title: {
    default: 'Beco Interiors | Sintered stone and interior materials in Nairobi',
    // Every page states the brand without each page having to remember to.
    template: '%s | Beco Interiors',
  },
  description:
    'Sintered stone slabs, wall panels, lighting and interior accessories, stocked in Nairobi. Request a quote and we price it the same day.',
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    siteName: SITE.name,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* pb on mobile clears the sticky action bar, which is fixed and would
          otherwise cover the last of the footer. */}
      <body className="bg-high-vis-white font-ui text-base text-charcoal antialiased pb-16 md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[2px] focus:bg-charcoal focus:px-4 focus:py-3 focus:text-high-vis-white"
        >
          Skip to content
        </a>
        <AnnouncementBar />
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
