import './globals.css';

export const metadata = {
  title: 'Security Scanner',
  description: 'GitHub repository security analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon will be detected automatically if you upload favicon.ico to the app folder */}
      </head>
      <body>{children}</body>
    </html>
  );
}
