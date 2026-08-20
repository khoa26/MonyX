"use client";

import React, { useState } from "react";
import { UserSession } from "@/types";
import { AdminCategory } from "./AdminSidebar";
import { LoansPreviewTable } from "./preview-tables/LoansPreviewTable";
import { CustomersPreviewTable } from "./preview-tables/CustomersPreviewTable";
import { RelatedPartiesPreviewTable } from "./preview-tables/RelatedPartiesPreviewTable";
import { UsersPreviewTable } from "./preview-tables/UsersPreviewTable";
import BankConfigManager from "./BankConfigManager";
import { CreditCard, Users2, Share2, KeyRound, Sliders, Sparkles, UploadCloud, FileSpreadsheet } from "lucide-react";

interface DataAdminViewProps {
  session: UserSession;
}

const CATEGORY_TABS: { id: AdminCategory; label: string; icon: React.ElementType }[] = [
  { id: "LOAN_CONTRACTS", label: "1. Hồ sơ Tín dụng", icon: CreditCard },
  { id: "CUSTOMERS", label: "2. Hồ sơ Khách hàng", icon: Users2 },
  { id: "RELATED_PARTIES", label: "3. Người có Liên quan", icon: Share2 },
  { id: "ACCOUNTS", label: "4. Tài khoản Người dùng", icon: KeyRound },
  { id: "BANK_CONFIG", label: "5. Tham số Ngân hàng", icon: Sliders },
];

export default function DataAdminView({ session }: DataAdminViewProps) {
  const [adminCategory, setAdminCategory] = useState<AdminCategory>("LOAN_CONTRACTS");
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUploadSuccess, setAdminUploadSuccess] = useState(false);
  const [importedLoans, setImportedLoans] = useState<any[]>([]);
  const [importedCustomers, setImportedCustomers] = useState<any[]>([]);
  const [importedRelations, setImportedRelations] = useState<any[]>([]);
  const [importedUsers, setImportedUsers] = useState<any[]>([]);

  const handleUploadAdminMasterData = async () => {
    if (!adminFile) {
      alert("Vui lòng chọn tệp Excel trước khi nạp.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", adminFile);

    const endpoints: Record<string, string> = {
      LOAN_CONTRACTS: "http://localhost:8000/api/v1/admin/import/loans",
      CUSTOMERS: "http://localhost:8000/api/v1/admin/import/customers",
      RELATED_PARTIES: "http://localhost:8000/api/v1/admin/import/related-parties",
      ACCOUNTS: "http://localhost:8000/api/v1/admin/import/users",
    };

    try {
      const res = await fetch(endpoints[adminCategory], {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Nạp dữ liệu thất bại");

      setAdminUploadSuccess(true);
      if (adminCategory === "LOAN_CONTRACTS") setImportedLoans(data.preview_data || []);
      else if (adminCategory === "CUSTOMERS") setImportedCustomers(data.preview_data || []);
      else if (adminCategory === "RELATED_PARTIES") setImportedRelations(data.preview_data || []);
      else if (adminCategory === "ACCOUNTS") setImportedUsers(data.preview_data || []);
      alert(data.message);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryMeta = () => {
    switch (adminCategory) {
      case "LOAN_CONTRACTS":
        return {
          title: "Nạp Hồ sơ Tín dụng (Cá nhân & Doanh nghiệp)",
          desc: "Tự động phân loại qua `loai_khach_hang`, liên kết Node :Loan với :Person (CCCD) hoặc :Company (MST).",
          schema: "ho_so_tin_dung_moi.xlsx",
          reqCols: "ma_tin_dung, ten_khach_hang, loai_khach_hang, mst/cccd, so_tien_vay, du_no_hien_tai, thoi_han, trang_thai",
        };
      case "CUSTOMERS":
        return {
          title: "Nạp Hồ sơ Khách hàng Gốc (Cá nhân & Doanh nghiệp)",
          desc: "Tự động Upsert Node :Person và :Company vào Master Database.",
          schema: "ho_so_khach_hang.xlsx",
          reqCols: "ten_khach_hang, loai_khach_hang, mst/cccd, ngay_sinh/ngay_thanh_lap, gioi_tinh, dia_chi, sdt, email",
        };
      case "RELATED_PARTIES":
        return {
          title: "Nạp Danh sách Người có Liên quan (Điều 136)",
          desc: "Tự động dựng đồ thị quan hệ Trực tiếp (:FAMILY, :RELATED_TO) chuẩn hóa vào Master DB.",
          schema: "ho_so_quan_he.xlsx",
          reqCols: "dinh_danh_goc, ten_thuc_the_goc, loai_thuc_the_goc, dinh_danh_dich, ten_thuc_the_dich, loai_thuc_the_dich, loai_quan_he, moi_quan_he_chi_tiet, ty_le_so_huu",
        };
      case "ACCOUNTS":
        return {
          title: "Nạp File Tài khoản Cán bộ & Quản trị viên",
          desc: "Tự động băm bảo mật mật khẩu (Bcrypt) và lưu trữ Node :User phục vụ đăng nhập hệ thống.",
          schema: "danh_sach_tai_khoan.xlsx",
          reqCols: "username, password, full_name, role (CREDIT_OFFICER / DATA_ADMIN)",
        };
      default:
        return {
          title: "Quản trị Tham số Ngân hàng",
          desc: "Thiết lập nguồn vốn tự có và tỷ lệ an toàn vốn.",
          schema: "Core Configuration",
          reqCols: "N/A",
        };
    }
  };

  const meta = getCategoryMeta();

  return (
    <div className="space-y-6">
      {/* Thanh tab danh mục */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((t) => {
          const Icon = t.icon;
          const active = adminCategory === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setAdminCategory(t.id);
                setAdminFile(null);
                setAdminUploadSuccess(false);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${
                active
                  ? "bg-[#5B21B6] text-white border-[#5B21B6] shadow-lg shadow-purple-900/20"
                  : "bg-white text-gray-600 border-purple-100 hover:bg-purple-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {adminCategory === "BANK_CONFIG" ? (
        <BankConfigManager session={session} />
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-purple-50 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2 border border-purple-100">
                <Sparkles className="w-3 h-3" />
                <span>Master Database Ingestion</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{meta.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
            </div>
            <div className="text-xs font-mono bg-purple-50 text-purple-900 px-3.5 py-1.5 rounded-xl border border-purple-200 font-bold">
              Schema: <b>{meta.schema}</b>
            </div>
          </div>

          <div>
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-purple-200 rounded-3xl cursor-pointer bg-purple-50/20 hover:bg-purple-50/60 hover:border-[#7C3AED] transition">
              <UploadCloud className="w-12 h-12 text-[#6D28D9] mb-2" />
              <p className="text-sm font-bold text-gray-800">
                {adminFile ? adminFile.name : `Kéo thả hoặc nhấp để chọn tệp Excel (.xlsx, .csv)`}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Cột nhận diện: <b>{meta.reqCols}</b>
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAdminFile(e.target.files[0]);
                    setAdminUploadSuccess(false);
                  }
                }}
              />
            </label>
          </div>

          {adminFile && (
            <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-[#6D28D9]" />
                <div>
                  <div className="text-sm font-bold text-gray-900">{adminFile.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={handleUploadAdminMasterData}
                className="px-7 py-3 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Đang nạp vào Neo4j..." : "Xác nhận & Nạp vào Đồ thị"}
              </button>
            </div>
          )}

          {/* BẢNG PREVIEW TÍN DỤNG */}
          {adminUploadSuccess && adminCategory === "LOAN_CONTRACTS" && (
            <LoansPreviewTable data={importedLoans} />
          )}

          {/* BẢNG PREVIEW KHÁCH HÀNG */}
          {adminUploadSuccess && adminCategory === "CUSTOMERS" && (
            <CustomersPreviewTable data={importedCustomers} />
          )}

          {/* BẢNG PREVIEW QUAN HỆ ĐIỀU 136 */}
          {adminUploadSuccess && adminCategory === "RELATED_PARTIES" && (
            <RelatedPartiesPreviewTable data={importedRelations} />
          )}

          {/* BẢNG PREVIEW TÀI KHOẢN */}
          {adminUploadSuccess && adminCategory === "ACCOUNTS" && (
            <UsersPreviewTable data={importedUsers} />
          )}
        </div>
      )}
    </div>
  );
}
