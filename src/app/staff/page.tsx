"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function StaffPage() {
  const { user, role } = useAuth();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-2">
        <span className="text-xs text-white/30">
          Staff Assistant — Welcome back,{" "}
          <span className="text-white/50">
            {user?.email?.split("@")[0] ?? "team member"}
          </span>
        </span>
      </div>
      <ChatInterface mode="staff" />
    </div>
  );
}
