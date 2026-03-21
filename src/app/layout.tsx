import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { StoreProvider } from "@/components/store-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QA Dashboard | LXGIC Studios",
  description: "Internal QA tracking dashboard for LXGIC Studios projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <StoreProvider>
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-64 min-h-screen">
            <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
              {children}
            </div>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
