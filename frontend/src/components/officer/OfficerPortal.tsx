"use client";

import React, { useState, useEffect } from "react";
import { 
  ListFilter, 
  FolderPlus, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Search, 
  Calendar, 
  Bell, 
  HelpCircle 
} from "lucide-react";
import PipelineMonitor from "./PipelineMonitor";
import IntakeWizard from "./IntakeWizard";
import { UserSession } from "@/types";

interface OfficerPortalProps {
  session: UserSession;
  onLogout: () => void;
}

export default function OfficerPortal({ session, onLogout }: OfficerPortalProps) {
  const [officerViewMode, setOfficerViewMode] = useState<"MONITOR_PIPELINE" | "CREATE_LOAN">("MONITOR_PIPELINE");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draftApplications, setDraftApplications] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  const fetchDraftApplications = async () => {
    setIsLoadingDrafts(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/credit/draft-applications", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await res.json();
      setDraftApplications(data.applications || []);
    } catch (err: any) {
      console.error("Lỗi tải danh sách hồ sơ:", err);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  useEffect(() => {
    if (officerViewMode === "MONITOR_PIPELINE") {
      fetchDraftApplications();
    }
  }, [officerViewMode]);

  const displayName = session?.username || "officer";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#F8F7FC] bg-[url('/background.png')] bg-cover bg-fixed bg-center text-gray-900">
      {/* THANH THAO TÁC BÊN TRÁI (SIDEBAR) */}
      <aside
        className={`bg-gradient-to-b from-[#1E0B3D] via-[#2E125B] to-[#3B1878] text-white flex flex-col justify-between transition-all duration-300 sticky top-0 h-screen z-40 shadow-2xl flex-shrink-0 border-r border-white/10 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Logo Branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              {isCollapsed ? (
                <div className="w-11 h-11 rounded-2xl bg-white/95 p-1.5 shadow-lg flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="MonyX" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="bg-white/95 rounded-2xl px-3 py-1.5 shadow-md flex items-center gap-2 border border-white/20">
                  <img src="/logo.png" alt="MonyX Logo" className="h-7 w-auto object-contain" />
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition cursor-pointer flex-shrink-0"
              title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Slogan Banner */}
          {!isCollapsed && (
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold">
                RELATIONSHIP INTEL PLATFORM
              </div>
              <div className="text-xs text-white/90 font-light italic leading-snug">
                "Risk isn't in the record. It's in the relationship."
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <nav className="space-y-2 pt-2">
            <button
              onClick={() => setOfficerViewMode("MONITOR_PIPELINE")}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                officerViewMode === "MONITOR_PIPELINE"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/15 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ListFilter className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Theo dõi Hồ sơ Tạm</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    officerViewMode === "MONITOR_PIPELINE" ? "bg-purple-100 text-purple-900 font-bold" : "bg-white/20 text-white"
                  }`}>
                    {draftApplications.length}
                  </span>
                </div>
              )}
            </button>

            <button
              onClick={() => setOfficerViewMode("CREATE_LOAN")}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                officerViewMode === "CREATE_LOAN"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/15 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FolderPlus className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>Tạo Khoản vay Mới</span>}
            </button>
          </nav>
        </div>

        {/* User Info & Logout (Đã sửa an toàn không còn lỗi slice) */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-400/30 flex items-center justify-center font-bold text-white font-mono flex-shrink-0 border border-white/10">
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-purple-300 font-mono truncate">CREDIT_OFFICER</div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-200 text-purple-200 text-xs font-semibold transition cursor-pointer flex items-center ${
              isCollapsed ? "justify-center" : "justify-start gap-2"
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/75 backdrop-blur-md border-b border-purple-100/60 sticky top-0 z-30 h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm hồ sơ, cá nhân, doanh nghiệp, mã HĐ..."
                className="w-full pl-10 pr-4 py-2 bg-purple-50/50 border border-purple-100 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#7C3AED] outline-none transition font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-100 text-xs font-medium font-mono">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>20 Aug 2026</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/80 hover:bg-purple-50 text-gray-600 hover:text-purple-700 flex items-center justify-center transition cursor-pointer border border-purple-50 shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/80 hover:bg-purple-50 text-gray-600 hover:text-purple-700 flex items-center justify-center transition cursor-pointer border border-purple-50 shadow-xs">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl w-full mx-auto">
          {officerViewMode === "MONITOR_PIPELINE" ? (
            <PipelineMonitor
              session={session}
              draftApplications={draftApplications}
              isLoading={isLoadingDrafts}
              onRefresh={fetchDraftApplications}
            />
          ) : (
            <IntakeWizard
              session={session}
              onSuccessComplete={() => {
                setOfficerViewMode("MONITOR_PIPELINE");
                fetchDraftApplications();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}