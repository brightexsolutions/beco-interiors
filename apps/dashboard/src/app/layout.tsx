import type { Metadata } from 'next';
import { KeyboardAwareFocus, Toaster } from '@beco/ui';
import '@beco/ui/src/tokens/tokens.css';

export const metadata: Metadata = {
  title: 'Beco Interiors',
  description: 'Premium interior materials in Nairobi.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var k='beco-dashboard-theme';var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();",
          }}
        />
      </head>
      {/* Browser extensions write their own attributes onto <body> before
          React hydrates (ColorZilla's `cz-shortcut-listen`, password managers,
          and so on), which React then reports as a hydration mismatch against
          markup that is in fact correct. Suppression applies to this element's
          attributes only, one level deep, so a real mismatch inside the app
          still surfaces. Nothing is being papered over: the server and client
          trees below this agree. */}
      <body suppressHydrationWarning>
        {children}
        {/* Keeps a focused field above the phone keyboard. Renders nothing. */}
        <KeyboardAwareFocus />
        <Toaster
          position="top-center"
          offset={{ top: '8.5rem' }}
          mobileOffset={{ top: '7.5rem', left: '1rem', right: '1rem' }}
        />
      </body>
    </html>
  );
}
