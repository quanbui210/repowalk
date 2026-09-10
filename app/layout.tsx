import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Repowalk — Explore your code in 3D',
  description:
    'Walk through your GitHub repository. Folders become city blocks, files become rooms, and code becomes a world to explore.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
