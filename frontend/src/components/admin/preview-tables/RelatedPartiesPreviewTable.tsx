import React from "react";
import { CheckCircle2, User, Building2 } from "lucide-react";

interface RelatedPartiesPreviewTableProps {
  data: any[];
}

export const RelatedPartiesPreviewTable: React.FC<RelatedPartiesPreviewTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Xem trước mạng lưới quan hệ trực tiếp vừa đồng bộ vào Master DB:</span>
      </div>
      <div className="overflow-x-auto border border-purple-100 rounded-2xl bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
            <tr>
              <th className="p-3.5 font-bold">STT</th>
              <th className="p-3.5 font-bold">Thực Thể Gốc</th>
              <th className="p-3.5 font-bold">Định Danh Gốc</th>
              <th className="p-3.5 font-bold">Thực Thể Đích</th>
              <th className="p-3.5 font-bold">Định Danh Đích</th>
              <th className="p-3.5 font-bold text-center">Điểm Luật</th>
              <th className="p-3.5 font-bold">Mối Quan Hệ Chi Tiết</th>
              <th className="p-3.5 font-bold text-center">Tỷ Lệ Sở Hữu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50 font-medium">
            {data.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-purple-50/30 transition">
                <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                <td className="p-3.5 font-bold text-gray-900">
                  <div className="flex items-center gap-1.5">
                    {item.goc_type === "COMPANY" ? <Building2 className="w-3.5 h-3.5 text-blue-600" /> : <User className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.goc_name}</span>
                  </div>
                </td>
                <td className="p-3.5 font-mono text-gray-600">{item.goc_id}</td>
                <td className="p-3.5 font-bold text-[#5B21B6]">
                  <div className="flex items-center gap-1.5">
                    {item.dich_type === "COMPANY" ? <Building2 className="w-3.5 h-3.5 text-blue-600" /> : <User className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.dich_name}</span>
                  </div>
                </td>
                <td className="p-3.5 font-mono text-gray-600">{item.dich_id}</td>
                <td className="p-3.5 text-center">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-100 text-purple-900 border border-purple-200">
                    Điểm {item.point}
                  </span>
                </td>
                <td className="p-3.5 text-purple-950 font-semibold">{item.rel_detail}</td>
                <td className="p-3.5 text-center font-mono font-bold text-gray-700">
                  {item.ratio_str !== "–" ? (
                    <span className="text-purple-900 font-black">{item.ratio_str}</span>
                  ) : (
                    <span className="text-gray-300">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};