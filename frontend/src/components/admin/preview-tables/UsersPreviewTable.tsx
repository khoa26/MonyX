import React from "react";
import { UserCheck } from "lucide-react";

interface UsersPreviewTableProps {
  data: any[];
}

export const UsersPreviewTable: React.FC<UsersPreviewTableProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
        <UserCheck className="w-4 h-4 text-emerald-600" />
        <span>Xem trước danh sách tài khoản vừa được khởi tạo thành công:</span>
      </div>
      <div className="overflow-x-auto border border-purple-100 rounded-2xl bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
            <tr>
              <th className="p-3.5 font-bold">Tên đăng nhập (Username)</th>
              <th className="p-3.5 font-bold">Họ và Tên</th>
              <th className="p-3.5 font-bold">Quyền hạn (Role)</th>
              <th className="p-3.5 font-bold">Email công vụ</th>
              <th className="p-3.5 font-bold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50 font-medium">
            {data.map((u: any, idx: number) => (
              <tr key={idx} className="hover:bg-purple-50/30 transition">
                <td className="p-3.5 font-mono font-bold text-[#5B21B6]">{u.username}</td>
                <td className="p-3.5 font-bold text-gray-900">{u.full_name}</td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                    u.role === "DATA_ADMIN" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-purple-100 text-purple-900 border border-purple-300"
                  }`}>{u.role}</span>
                </td>
                <td className="p-3.5 text-gray-600 font-mono">{u.email || "N/A"}</td>
                <td className="p-3.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700">
                    {u.status || "ACTIVE"}
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