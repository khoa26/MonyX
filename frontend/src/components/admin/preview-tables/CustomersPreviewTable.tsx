import React from "react";
import { CheckCircle2, User, Building2 } from "lucide-react";

interface CustomersPreviewTableProps {
  data: any[];
}

export const CustomersPreviewTable: React.FC<CustomersPreviewTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Xem trước dữ liệu hồ sơ khách hàng vừa đồng bộ:</span>
      </div>
      <div className="overflow-x-auto border border-purple-100 rounded-2xl bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
            <tr>
              <th className="p-3.5 font-bold">STT</th>
              <th className="p-3.5 font-bold">Loại Khách Hàng</th>
              <th className="p-3.5 font-bold">Định Danh (MST/CCCD)</th>
              <th className="p-3.5 font-bold">Tên Khách Hàng</th>
              <th className="p-3.5 font-bold">Ngày Sinh / Thành Lập</th>
              <th className="p-3.5 font-bold text-center">Giới Tính</th>
              <th className="p-3.5 font-bold">Địa Chỉ</th>
              <th className="p-3.5 font-bold">SĐT</th>
              <th className="p-3.5 font-bold">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50 font-medium">
            {data.map((cust: any, idx: number) => (
              <tr key={idx} className="hover:bg-purple-50/30 transition">
                <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                <td className="p-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono ${
                    cust.customer_type === "COMPANY"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {cust.customer_type === "COMPANY" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {cust.customer_type === "COMPANY" ? "DOANH NGHIỆP" : "CÁ NHÂN"}
                  </span>
                </td>
                <td className="p-3.5 font-mono font-bold text-[#5B21B6]">{cust.identifier}</td>
                <td className="p-3.5 font-bold text-gray-900">{cust.name}</td>
                <td className="p-3.5 font-mono text-gray-700">{cust.date_val || "--"}</td>
                <td className="p-3.5 text-center">
                  {cust.gender ? (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-900 rounded font-semibold text-[11px]">
                      {cust.gender}
                    </span>
                  ) : (
                    <span className="text-gray-300 font-mono">--</span>
                  )}
                </td>
                <td className="p-3.5 text-gray-700 max-w-xs truncate" title={cust.address}>
                  {cust.address}
                </td>
                <td className="p-3.5 font-mono text-gray-600">{cust.phone}</td>
                <td className="p-3.5 text-gray-600">{cust.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};