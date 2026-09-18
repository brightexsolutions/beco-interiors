import type { Metadata } from 'next';
import { Toaster } from '@beco/ui';
import '@beco/ui/src/tokens/tokens.css';

export const metadata: Metadata = {
  title: 'Beco Interiors',
  description: 'Premium interior materials in Nairobi.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Browser extensions write their own attributes onto <body> before
          React hydrates (ColorZilla's `cz-shortcut-listen`, password managers,
          and so on), which React then reports as a hydration mismatch against
          markup that is in fact correct. Suppression applies to this element's
          attributes only, one level deep, so a real mismatch inside the app
          still surfaces. Nothing is being papered over: the server and client
          trees below this agree. */}
      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="top-center"
          offset={{ top: '8.5rem' }}
          mobileOffset={{ top: '7.5rem', left: '1rem', right: '1rem' }}
        />
      </body>
    </html>
  );
}
