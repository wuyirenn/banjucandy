import type { Metadata } from "next";
import { NunitoSans, AvantGarde } from "@/utils/customFonts";
import { cn } from "@/lib/utils";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Sketches by Wu Yi-Renn",
  description: "Art website of Christian Yi-Renn Wu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en" className="h-full">
      <body className={cn(
        "relative h-full antialiased",
        NunitoSans.variable,
        AvantGarde.variable
      )}>
        <main className="relative flex min-h-screen cursor-crosshair">
          <div className="flex-grow flex-1">
            {children}
            <SpeedInsights />
          </div>
        </main>
      </body>
    </html>
  );
}
