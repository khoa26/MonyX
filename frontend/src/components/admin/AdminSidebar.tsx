import React from "react";
import { CreditCard, Users2, Share2, KeyRound, Sliders, ChevronLeft, ChevronRight, LogOut } from "lucide-react";

export type AdminCategory = "LOAN_CONTRACTS" | "CUSTOMERS" | "RELATED_PARTIES" | "ACCOUNTS" | "BANK_CONFIG";

interface AdminSidebarProps {
  currentCategory: AdminCategory;
  onSelectCategory: (cat: AdminCategory) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  username: string;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentCategory,
  onSelectCategory,
  isCollapsed,
  onToggleCollapse,
  username,
  onLogout,
}) => {
  const menuItems: { key: AdminCategory; label: string; icon: React.ElementType }[] = [
    { key: "LOAN_CONTRACTS", label: "1. Hồ sơ Tín dụng", icon: CreditCard },
    { key: "CUSTOMERS", label: "2. Hồ sơ Khách hàng", icon: Users2 },
    { key: "RELATED_PARTIES", label: "3. Người có Liên quan", icon: Share2 },
    { key: "ACCOUNTS", label: "4. Tài khoản Người dùng", icon: KeyRound },
    { key: "BANK_CONFIG", label: "5. Tham số Ngân hàng", icon: Sliders },
  ];

  return (
    <aside
      className={`bg-gradient-to-b from-[#2E125B] via-[#3B1878] to-[#4C1D95] text-white flex flex-col justify-between transition-all duration-300 sticky top-0 h-screen z-40 shadow-2xl flex-shrink-0 ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#A78BFA] flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
              ✦
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-black text-lg text-white tracking-tight block">MonyX</span>
                <span className="text-[10px] text-purple-300 font-mono block -mt-1 font-semibold">
                  Master Data Manager
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition cursor-pointer flex-shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold">
              CORE MASTER DATABASE
            </div>
            <div className="text-xs text-white/90 font-light italic leading-snug">
              "Chuẩn hóa dữ liệu gốc & làm giàu đồ thị thực thể."
            </div>
          </div>
        )}

        <nav className="space-y-2 pt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentCategory === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectCategory(item.key)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                  active
                    ? "bg-white text-[#3B1878] shadow-lg shadow-black/10 font-extrabold"
                    : "text-purple-200 hover:bg-white/10 hover:text-white"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-400/30 flex items-center justify-center font-bold text-white font-mono flex-shrink-0">
            AD
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{username}</div>
              <div className="text-[10px] text-purple-300 font-mono truncate">DATA_ADMIN</div>
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
  );
};