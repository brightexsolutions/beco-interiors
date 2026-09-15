import type { Metadata } from 'next';
import '@beco/ui/src/tokens/tokens.css';

export const metadata: Metadata = {
  title: 'Beco Interiors',
  description: 'Premium interior materials in Nairobi.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
