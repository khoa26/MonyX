"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { UserSession } from "@/types";

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
}

export default function Header({ session, onLogout }: HeaderProps) {
  const isAdmin = session.role === "DATA_ADMIN";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold ${
            isAdmin ? "bg-[#AD7A21]" : "bg-[#1F4A3B]"
          }`}>
            M
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900 block">
              {isAdmin ? "MonyX Master Data Manager" : "MonyX Credit Underwriting Sandbox"}
            </span>
            <span className={`text-[11px] font-mono font-semibold ${
              isAdmin ? "text-[#AD7A21]" : "text-[#1F4A3B]"
            }`}>
              ROLE: {session.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg border text-gray-600">
            {isAdmin ? "Admin" : "Cán bộ"}: <b>{session.username}</b>
          </span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}