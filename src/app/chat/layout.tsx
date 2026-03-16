import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu Assistant — Old Florida Fish House",
  description:
    "Ask about our menu, allergens, pairings, and more.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-[#0a1628]">
      <main className="flex flex-1 flex-col pt-[140px]">{children}</main>
    </div>
  );
}
