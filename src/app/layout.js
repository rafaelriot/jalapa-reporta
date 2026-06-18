import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "Jalapa Reporta - Reportes Ciudadanos de Jalapa, Tabasco",
  description: "Plataforma de reportes ciudadanos para baches, luminarias, fugas de agua y caminos en Jalapa, Tabasco. Funciona offline y consume pocos datos.",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["Jalapa", "Tabasco", "Reporte Ciudadano", "Ayuntamiento", "Bache", "Luz", "Agua"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jalapa Reporta",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 selection:bg-blue-500 selection:text-white">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
