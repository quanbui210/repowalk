import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Little Helsinki — Lost & Found',
  description:
    'A little city full of stories. Meet your neighbors, solve mysteries, restore the cathedral bells, and explore the code behind the city.',
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
