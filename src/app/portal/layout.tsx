import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Portal — Old Florida Fish House",
  description: "Staff and admin portal for Old Florida Fish House.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a1628]">
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
