import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GateProvider } from "./contexts/GateContext";
import { GateGuard } from "./components/GateGuard";

export const metadata: Metadata = {
  title: "Accutrol Pricing Calculator",
  description: "HVAC job pricing calculator",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <ThemeProvider>
          <GateProvider>
            <GateGuard>{children}</GateGuard>
          </GateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
