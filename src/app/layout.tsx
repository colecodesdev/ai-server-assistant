import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/navigation/navbar";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Old Florida Fish House — AI Server Assistant",
  description:
    "AI-powered menu assistant for Old Florida Fish House. Browse menus, get pairing recommendations, and explore allergen-safe options.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-body text-ofhs-charcoal bg-white antialiased">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
