"use client";

import React, { useState, useEffect } from "react";
import { Landmark, ShieldAlert, CheckCircle2, Save, RefreshCw, Sparkles, DollarSign } from "lucide-react";
import { UserSession } from "@/types";

interface BankConfigManagerProps {
  session: UserSession;
}

export default function BankConfigManager({ session }: BankConfigManagerProps) {
  const [bankConfig, setBankConfig] = useState<any>({
    name: "DVBank",
    full_name: "Ngân hàng Thương mại Cổ phần DVBank",
    equity_capital: 10000000000000,
    charter_capital: 8000000000000,
    single_limit_ratio: 0.14,
    group_limit_ratio: 0.23,
    updated_at: "",
  });
  
  // State nhập theo đơn vị Tỷ VNĐ để Admin thao tác dễ dàng
  const [equityBillion, setEquityBillion] = useState<number>(10000);
  const [charterBillion, setCharterBillion] = useState<number>(8000);
  const [singleRatio, setSingleRatio] = useState<number>(14);
  const [groupRatio, setGroupRatio] = useState<number>(23);
  const [fullName, setFullName] = useState<string>("Ngân hàng Thương mại Cổ phần DVBank");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchBankConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/bank-config", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setBankConfig(data);
      setEquityBillion(data.equity_capital ? data.equity_capital / 1e9 : 10000);
      setCharterBillion(data.charter_capital ? data.charter_capital / 1e9 : 8000);
      setSingleRatio(data.single_limit_ratio ? data.single_limit_ratio * 100 : 14);
      setGroupRatio(data.group_limit_ratio ? data.group_limit_ratio * 100 : 23);
      setFullName(data.full_name || "Ngân hàng Thương mại Cổ phần DVBank");
    } catch (err: any) {
      console.error("Lỗi đọc cấu hình ngân hàng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankConfig();
  }, []);

  const handleSaveConfig = async () => {
    if (equityBillion <= 0) {
      alert("Vốn tự có phải lớn hơn 0.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        name: "DVBank",
        full_name: fullName,
        equity_capital: equityBillion * 1e9,
        charter_capital: charterBillion * 1e9,
        single_limit_ratio: singleRatio / 100,
        group_limit_ratio: groupRatio / 100,
      };

      const res = await fetch("http://localhost:8000/api/v1/admin/bank-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Cập nhật thất bại");

      setSaveSuccess(true);
      fetchBankConfig();
      alert("Đã cập nhật Vốn tự có và các tham số ngân hàng thành công!");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Tính toán hạn mức tức thời theo số vốn mới nhập
  const singleCapBillion = (equityBillion * (singleRatio / 100)).toFixed(1);
  const groupCapBillion = (equityBillion * (groupRatio / 100)).toFixed(1);

  return (
    <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-purple-50 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2 border border-purple-100">
            <Sparkles className="w-3 h-3" />
            <span>Bank Capital & Regulatory Settings</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Tham số Ngân hàng</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Điều chỉnh Nguồn vốn tự có và các tỷ lệ giới hạn cấp tín dụng Điều 136 phục vụ toàn bộ hệ thống.
          </p>
        </div>
        <button
          onClick={fetchBankConfig}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-2xl text-xs font-bold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Thông báo cập nhật thành công */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Vốn tự có và các tỷ lệ trần mới đã được đồng bộ vào Master Database.</span>
        </div>
      )}

      {/* Card Thống kê Tức thời */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-[#2E125B] to-[#4C1D95] text-white rounded-2xl shadow-xs space-y-1">
          <div className="text-[11px] font-mono text-purple-200 font-bold uppercase">Vốn Tự Có Hiện Tại</div>
          <div className="text-2xl font-black font-mono">{equityBillion.toLocaleString()} Tỷ</div>
          <div className="text-[10px] text-purple-300 font-mono">
            {(equityBillion * 1e9).toLocaleString()} VND
          </div>
        </div>

        <div className="p-5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1">
          <div className="text-[11px] font-mono text-purple-900 font-bold uppercase">Vốn Điều Lệ</div>
          <div className="text-2xl font-black font-mono text-gray-900">{charterBillion.toLocaleString()} Tỷ</div>
          <div className="text-[10px] text-gray-400 font-mono">
            {(charterBillion * 1e9).toLocaleString()} VND
          </div>
        </div>

        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
          <div className="text-[11px] font-mono text-emerald-900 font-bold uppercase">Trần KH Đơn Lẻ ({singleRatio}%)</div>
          <div className="text-2xl font-black font-mono text-emerald-800">{Number(singleCapBillion).toLocaleString()} Tỷ</div>
          <div className="text-[10px] text-emerald-600 font-mono">Tối đa / 1 khách hàng vay</div>
        </div>

        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <div className="text-[11px] font-mono text-amber-900 font-bold uppercase">Trần Nhóm Liên Quan ({groupRatio}%)</div>
          <div className="text-2xl font-black font-mono text-amber-800">{Number(groupCapBillion).toLocaleString()} Tỷ</div>
          <div className="text-[10px] text-amber-600 font-mono">Tối đa / 1 nhóm Điều 136</div>
        </div>
      </div>

      {/* Form Điều chỉnh Tham số */}
      <div className="p-6 bg-purple-50/30 rounded-3xl border border-purple-100 space-y-5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
          <Landmark className="w-5 h-5 text-[#5B21B6]" />
          <span>Biểu mẫu Cập nhật Thông số Pháp nhân Ngân hàng</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block text-gray-600 font-bold mb-1.5">Tên đầy đủ của Ngân hàng (*)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1.5">Mã viết tắt / Thương hiệu</label>
            <input
              type="text"
              disabled
              value={bankConfig.name || "DVBank"}
              className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl font-mono font-bold text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-purple-950 font-bold mb-1.5">
              Nguồn Vốn Tự Có (Đơn vị: Tỷ VNĐ) (*)
            </label>
            <div className="relative">
              <input
                type="number"
                step="100"
                value={equityBillion}
                onChange={(e) => setEquityBillion(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border-2 border-purple-300 rounded-xl font-mono font-black text-base text-[#5B21B6] outline-none focus:border-[#5B21B6]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                TỶ VNĐ
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">
              = {(equityBillion * 1e9).toLocaleString()} VNĐ
            </p>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1.5">
              Vốn Điều Lệ (Đơn vị: Tỷ VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                step="100"
                value={charterBillion}
                onChange={(e) => setCharterBillion(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                TỶ VNĐ
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">
              = {(charterBillion * 1e9).toLocaleString()} VNĐ
            </p>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1.5">
              Trần Tín dụng Khách hàng Đơn lẻ (% Vốn tự có)
            </label>
            <input
              type="number"
              step="0.5"
              value={singleRatio}
              onChange={(e) => setSingleRatio(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <p className="text-[11px] text-gray-400 mt-1">Mặc định: 14% theo Điều 136 Luật Các TCTD</p>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1.5">
              Trần Tín dụng Nhóm Khách hàng Liên quan (% Vốn tự có)
            </label>
            <input
              type="number"
              step="0.5"
              value={groupRatio}
              onChange={(e) => setGroupRatio(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <p className="text-[11px] text-gray-400 mt-1">Mặc định: 23% theo Điều 136 Luật Các TCTD</p>
          </div>
        </div>

        {/* Nút Lưu */}
        <div className="pt-4 border-t border-purple-100 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 font-mono">
            Cập nhật lần cuối: <b>{bankConfig.updated_at || "Chưa ghi nhận"}</b>
          </div>
          <button
            disabled={isSaving}
            onClick={handleSaveConfig}
            className="px-8 py-3 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Đang lưu vào Neo4j..." : "Lưu Thay Đổi Tham Số Ngân Hàng"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}