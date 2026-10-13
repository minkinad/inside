import type { Metadata } from 'next';
import './globals.css';
import './redesign.css';
import './experience.css';
import { Providers } from '@/components/providers';
export const metadata: Metadata = {
  title: 'min.Inside',
  description: 'Корпоративное пространство команды min.Inside',
  openGraph: {
    title: 'min.Inside',
    description: 'Корпоративное пространство команды min.Inside',
    siteName: 'min.Inside',
    type: 'website',
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
