import React from "react";
import { CheckCircle2, User, Building2 } from "lucide-react";

interface LoansPreviewTableProps {
  data: any[];
}

export const LoansPreviewTable: React.FC<LoansPreviewTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Xem trước dữ liệu hồ sơ tín dụng vừa đồng bộ:</span>
      </div>
      <div className="overflow-x-auto border border-purple-100 rounded-2xl bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
            <tr>
              <th className="p-3.5 font-bold">Mã Tín dụng</th>
              <th className="p-3.5 font-bold">Loại Khách Hàng</th>
              <th className="p-3.5 font-bold">Định Danh (CCCD/MST)</th>
              <th className="p-3.5 font-bold">Chủ Thể Vay</th>
              <th className="p-3.5 font-bold">Số Tiền Vay (VND)</th>
              <th className="p-3.5 font-bold">Dư Nợ Hiện Tại (VND)</th>
              <th className="p-3.5 font-bold">Thời Hạn</th>
              <th className="p-3.5 font-bold">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50 font-medium">
            {data.map((loan: any, idx: number) => (
              <tr key={idx} className="hover:bg-purple-50/30 transition">
                <td className="p-3.5 font-mono font-bold text-[#5B21B6]">{loan.loan_id}</td>
                <td className="p-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono ${
                    loan.borrower_type === "COMPANY"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {loan.borrower_type === "COMPANY" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {loan.borrower_type === "COMPANY" ? "DOANH NGHIỆP" : "CÁ NHÂN"}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-gray-700">{loan.borrower_id}</td>
                <td className="p-3.5 font-bold text-gray-900">{loan.borrower_name}</td>
                <td className="p-3.5 font-mono">{Number(loan.amount).toLocaleString()}</td>
                <td className="p-3.5 font-mono font-bold text-purple-900">{Number(loan.balance).toLocaleString()}</td>
                <td className="p-3.5">{loan.term_months} tháng</td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                    loan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {loan.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};