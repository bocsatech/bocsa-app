import { Geist, Geist_Mono } from "next/font/google";
import PwaRegistrar from "./components/PwaRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bocsa App",
  description: "Betrieb, Maschinen, Lager und PKW-Service.",
  applicationName: "Bocsa",
  appleWebApp: {
    capable: true,
    title: "Bocsa",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/bocsa-icon.svg",
    apple: "/icons/bocsa-icon.svg",
  },
};

export const viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
