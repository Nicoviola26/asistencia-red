import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Asistencia | Capacitaciones",
  description: "Gestión moderna de asistencia para eventos y capacitaciones.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#49b38d",
};

import { ToastProvider } from "@/components/Toast";
import SWRegistration from "@/components/SWRegistration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ToastProvider>
          <SWRegistration />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
