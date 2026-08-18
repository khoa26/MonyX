"use client";

import React from "react";
import { User, Building2, Sparkles, ArrowRight } from "lucide-react";

interface IntakeStep1LoanIdProps {
  customerType: "INDIVIDUAL" | "ENTERPRISE";
  setCustomerType: (type: "INDIVIDUAL" | "ENTERPRISE") => void;
  loanId: string;
  setLoanId: (id: string) => void;
  onGenerateLoanId: (type: "INDIVIDUAL" | "ENTERPRISE") => void;
  onProceed: () => void;
}

export default function IntakeStep1LoanId({
  customerType,
  setCustomerType,
  loanId,
  setLoanId,
  onGenerateLoanId,
  onProceed,
}: IntakeStep1LoanIdProps) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-6">
      <div>
        <span className="text-[11px] font-mono font-bold text-purple-600 uppercase tracking-wider">
          Bước 1: Khởi tạo Khoản vay Tín dụng Mới
        </span>
        <h2 className="text-2xl font-black text-gray-900 mt-1">Phân loại Khách hàng & Mã Hợp đồng</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => { setCustomerType("INDIVIDUAL"); onGenerateLoanId("INDIVIDUAL"); }}
          className={`p-6 rounded-2xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${
            customerType === "INDIVIDUAL" ? "border-[#6D28D9] bg-purple-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-purple-200"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${customerType === "INDIVIDUAL" ? "bg-[#5B21B6] text-white" : "bg-gray-100 text-gray-500"}`}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">Khách hàng Cá nhân</div>
            <div className="text-xs text-gray-500 mt-0.5">Tiếp nhận hồ sơ CCCD & biểu mẫu cá nhân</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setCustomerType("ENTERPRISE"); onGenerateLoanId("ENTERPRISE"); }}
          className={`p-6 rounded-2xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${
            customerType === "ENTERPRISE" ? "border-[#6D28D9] bg-purple-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-purple-200"
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${customerType === "ENTERPRISE" ? "bg-[#5B21B6] text-white" : "bg-gray-100 text-gray-500"}`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">Khách hàng Doanh nghiệp / Tổ chức</div>
            <div className="text-xs text-gray-500 mt-0.5">Tiếp nhận hồ sơ ĐKKD, ĐDPL & Điều 136</div>
          </div>
        </button>
      </div>

      <div className="p-6 bg-purple-50/40 rounded-3xl border border-purple-100 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-purple-950 uppercase font-mono">
            Mã Tín Dụng Định Danh (Loan ID) (*)
          </label>
          <button
            type="button"
            onClick={() => onGenerateLoanId(customerType)}
            className="text-xs text-[#6D28D9] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Gợi ý mã duy nhất mới
          </button>
        </div>
        <input
          type="text"
          required
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          placeholder="ví dụ: CORP-202608-0001"
          className="w-full px-4 py-3.5 bg-white border border-purple-200 rounded-2xl font-mono font-bold text-base text-[#5B21B6] focus:ring-2 focus:ring-[#7C3AED] outline-none"
        />
        <p className="text-[11px] text-gray-400 font-mono">
          Hệ thống tự động kiểm tra đảm bảo mã không trùng lặp trong cả Master DB và Sandbox.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onProceed}
          className="px-8 py-3.5 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-sm font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 flex items-center gap-2 cursor-pointer"
        >
          <span>Tiếp tục: Tải Hồ sơ Tài liệu</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}