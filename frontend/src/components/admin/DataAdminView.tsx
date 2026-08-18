"use client";

import React, { useState } from "react";
import { 
  CreditCard, 
  User, 
  Building2, 
  KeyRound, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Calendar,
  Bell,
  HelpCircle,
  Database,
  Sparkles
} from "lucide-react";
import { UserSession } from "@/types";

interface DataAdminViewProps {
  session: UserSession;
  onLogout: () => void;
}

export default function DataAdminView({ session, onLogout }: DataAdminViewProps) {
  const [adminCategory, setAdminCategory] = useState<"LOAN_CONTRACTS" | "PERSONS" | "COMPANIES" | "ACCOUNTS">("LOAN_CONTRACTS");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUploadSuccess, setAdminUploadSuccess] = useState(false);
  const [importedLoans, setImportedLoans] = useState<any[]>([]);
  const [importedPersons, setImportedPersons] = useState<any[]>([]);
  const [importedCompanies, setImportedCompanies] = useState<any[]>([]);
  const [importedUsers, setImportedUsers] = useState<any[]>([]);

  const handleUploadAdminMasterData = async () => {
    if (!adminFile) {
      alert("Vui lòng chọn tệp Excel trước khi nạp.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", adminFile);

    let endpoint = "http://localhost:8000/api/v1/admin/import/loans";
    if (adminCategory === "PERSONS") endpoint = "http://localhost:8000/api/v1/admin/import/persons";
    else if (adminCategory === "COMPANIES") endpoint = "http://localhost:8000/api/v1/admin/import/companies";
    else if (adminCategory === "ACCOUNTS") endpoint = "http://localhost:8000/api/v1/admin/import/users";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Nạp dữ liệu thất bại");

      setAdminUploadSuccess(true);
      if (adminCategory === "LOAN_CONTRACTS") setImportedLoans(data.preview_data || []);
      else if (adminCategory === "PERSONS") setImportedPersons(data.preview_data || []);
      else if (adminCategory === "COMPANIES") setImportedCompanies(data.preview_data || []);
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
          title: "Nạp File Hồ sơ Tín dụng Lịch sử (Master Loans)",
          desc: "Hệ thống sẽ đồng bộ các Node :Loan và liên kết trực tiếp với Node :Person tương ứng.",
          schema: "danh_sach_tin_dung.xlsx",
          reqCols: "ma_tin_dung, cccd_nguoi_vay, ten_nguoi_vay, so_tien_vay, du_no_hien_tai, trang_thai",
        };
      case "PERSONS":
        return {
          title: "Nạp File Thực thể Cá nhân & Nhóm Liên quan",
          desc: "Tự động Upsert Node :Person và tạo quan hệ gia đình (Điều 136) hoặc sở hữu doanh nghiệp.",
          schema: "danh_sach_ca_nhan.xlsx",
          reqCols: "cccd, ho_ten, loai_lien_quan, ten_nguoi_lien_quan, dinh_danh_lien_quan, moi_quan_he",
        };
      case "COMPANIES":
        return {
          title: "Nạp File Thực thể Doanh nghiệp & Mạng lưới Điều 136",
          desc: "Tự động Upsert Node :Company, cập nhật ĐDPL mới nhất và tạo liên kết Công ty mẹ/con/chi phối.",
          schema: "danh_sach_doanh_nghiep.xlsx",
          reqCols: "ma_so_doanh_nghiep, ten_doanh_nghiep, ho_ten_dai_dien, cccd_dai_dien",
        };
      case "ACCOUNTS":
        return {
          title: "Nạp File Tài khoản Cán bộ & Quản trị viên",
          desc: "Tự động băm bảo mật mật khẩu (Bcrypt) và lưu trữ Node :User phục vụ đăng nhập hệ thống.",
          schema: "danh_sach_tai_khoan.xlsx",
          reqCols: "username, password, full_name, role (CREDIT_OFFICER / DATA_ADMIN)",
        };
    }
  };

  const meta = getCategoryMeta();

  return (
    <div className="min-h-screen flex bg-[#F8F7FC] text-gray-900">
      {/* ========================================================= */}
      {/* THANH ĐIỀU KHIỂN BÊN TRÁI (ADMIN COLLAPSIBLE SIDEBAR) */}
      {/* ========================================================= */}
      <aside
        className={`bg-gradient-to-b from-[#2E125B] via-[#3B1878] to-[#4C1D95] text-white flex flex-col justify-between transition-all duration-300 sticky top-0 h-screen z-40 shadow-2xl flex-shrink-0 ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* PHẦN TRÊN: LOGO & DANH MỤC MASTER DATA */}
        <div className="p-4 space-y-6">
          {/* Header Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#A78BFA] flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
                ✦
              </div>
              {!isCollapsed && (
                <div className="transition-opacity duration-200">
                  <span className="font-black text-lg text-white tracking-tight block">MonyX</span>
                  <span className="text-[10px] text-purple-300 font-mono block -mt-1 font-semibold">
                    Master Data Manager
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition cursor-pointer flex-shrink-0"
              title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Slogan Banner */}
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

          {/* Danh sách 4 Tab Phân hệ Master Data */}
          <nav className="space-y-2 pt-2">
            {/* Tab 1: Hồ sơ Tín dụng */}
            <button
              onClick={() => { setAdminCategory("LOAN_CONTRACTS"); setAdminFile(null); setAdminUploadSuccess(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                adminCategory === "LOAN_CONTRACTS"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/10 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
              title="1. Hồ sơ Tín dụng"
            >
              <CreditCard className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>1. Hồ sơ Tín dụng</span>}
            </button>

            {/* Tab 2: Thực thể Cá nhân */}
            <button
              onClick={() => { setAdminCategory("PERSONS"); setAdminFile(null); setAdminUploadSuccess(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                adminCategory === "PERSONS"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/10 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
              title="2. Thực thể Cá nhân"
            >
              <User className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>2. Thực thể Cá nhân</span>}
            </button>

            {/* Tab 3: Thực thể Doanh nghiệp */}
            <button
              onClick={() => { setAdminCategory("COMPANIES"); setAdminFile(null); setAdminUploadSuccess(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                adminCategory === "COMPANIES"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/10 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
              title="3. Thực thể Doanh nghiệp"
            >
              <Building2 className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>3. Thực thể Doanh nghiệp</span>}
            </button>

            {/* Tab 4: Tài khoản Người dùng */}
            <button
              onClick={() => { setAdminCategory("ACCOUNTS"); setAdminFile(null); setAdminUploadSuccess(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer text-left ${
                adminCategory === "ACCOUNTS"
                  ? "bg-white text-[#3B1878] shadow-lg shadow-black/10 font-extrabold"
                  : "text-purple-200 hover:bg-white/10 hover:text-white"
              }`}
              title="4. Tài khoản Người dùng"
            >
              <KeyRound className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>4. Tài khoản Người dùng</span>}
            </button>
          </nav>
        </div>

        {/* PHẦN DƯỚI: THÔNG TIN ADMIN & NÚT ĐĂNG XUẤT */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-400/30 flex items-center justify-center font-bold text-white font-mono flex-shrink-0">
              AD
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{session.username}</div>
                <div className="text-[10px] text-purple-300 font-mono truncate">DATA_ADMIN</div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className={`w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-200 text-purple-200 text-xs font-semibold transition cursor-pointer flex items-center ${
              isCollapsed ? "justify-center" : "justify-start gap-2"
            }`}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* VÙNG NỘI DUNG CHÍNH (MAIN DATA ADMIN CONTENT) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-purple-100/60 sticky top-0 z-30 h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm danh mục dữ liệu, mã định danh, người dùng..."
                className="w-full pl-10 pr-4 py-2 bg-purple-50/40 border border-purple-100 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#7C3AED] outline-none transition font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-100 text-xs font-medium font-mono">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>17 Aug 2026</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700 flex items-center justify-center transition cursor-pointer">
              <Bell className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700 flex items-center justify-center transition cursor-pointer">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Thân trang nạp dữ liệu */}
        <main className="p-8 max-w-6xl w-full mx-auto space-y-6">
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

            {/* Vùng Drag & Drop File */}
            <div>
              <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-purple-200 rounded-3xl cursor-pointer bg-purple-50/20 hover:bg-purple-50/60 hover:border-[#7C3AED] transition">
                <UploadCloud className="w-12 h-12 text-[#6D28D9] mb-2" />
                <p className="text-sm font-bold text-gray-800">
                  {adminFile ? adminFile.name : `Kéo thả hoặc nhấp để chọn tệp Excel (.xlsx, .csv)`}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Cột bắt buộc: <b>{meta.reqCols}</b>
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

            {/* Thanh xác nhận nạp */}
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

            {/* BẢNG PREVIEW DỮ LIỆU TÍN DỤNG */}
            {adminUploadSuccess && adminCategory === "LOAN_CONTRACTS" && importedLoans.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xem trước dữ liệu tín dụng vừa đồng bộ:</span>
                </div>
                <div className="overflow-x-auto border border-purple-100 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
                      <tr>
                        <th className="p-3.5 font-bold">Mã Tín dụng</th>
                        <th className="p-3.5 font-bold">CCCD Người vay</th>
                        <th className="p-3.5 font-bold">Họ và Tên</th>
                        <th className="p-3.5 font-bold">Số tiền vay (VND)</th>
                        <th className="p-3.5 font-bold">Dư nợ hiện tại (VND)</th>
                        <th className="p-3.5 font-bold">Thời hạn</th>
                        <th className="p-3.5 font-bold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50 font-medium">
                      {importedLoans.map((loan: any, idx: number) => (
                        <tr key={idx} className="hover:bg-purple-50/30 transition">
                          <td className="p-3.5 font-mono font-bold text-[#5B21B6]">{loan.loan_id}</td>
                          <td className="p-3.5 font-mono text-gray-700">{loan.cccd}</td>
                          <td className="p-3.5 font-bold text-gray-900">{loan.full_name}</td>
                          <td className="p-3.5 font-mono">{Number(loan.amount).toLocaleString()}</td>
                          <td className="p-3.5 font-mono font-bold text-purple-900">{Number(loan.balance).toLocaleString()}</td>
                          <td className="p-3.5">{loan.term_months} tháng</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              loan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                            }`}>{loan.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BẢNG PREVIEW DỮ LIỆU CÁ NHÂN */}
            {adminUploadSuccess && adminCategory === "PERSONS" && importedPersons.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xem trước các dòng dữ liệu Cá nhân & Quan hệ vừa nạp:</span>
                </div>
                <div className="overflow-x-auto border border-purple-100 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
                      <tr>
                        <th className="p-3.5 font-bold">CCCD Chính</th>
                        <th className="p-3.5 font-bold">Họ và Tên</th>
                        <th className="p-3.5 font-bold">Người/DN Liên quan</th>
                        <th className="p-3.5 font-bold">Định danh</th>
                        <th className="p-3.5 font-bold">Mối quan hệ</th>
                        <th className="p-3.5 font-bold">Tỷ lệ vốn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50 font-medium">
                      {importedPersons.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-purple-50/30 transition">
                          <td className="p-3.5 font-mono font-bold text-gray-800">{p.cccd}</td>
                          <td className="p-3.5 font-bold text-[#5B21B6]">{p.full_name}</td>
                          <td className="p-3.5 font-semibold text-gray-900">{p.rel_name || "--"}</td>
                          <td className="p-3.5 font-mono text-gray-600">{p.rel_id || "--"}</td>
                          <td className="p-3.5 text-purple-800 font-semibold">{p.relationship || "--"}</td>
                          <td className="p-3.5 font-mono font-bold text-gray-700">{p.ownership_ratio || "0%"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BẢNG PREVIEW DỮ LIỆU DOANH NGHIỆP */}
            {adminUploadSuccess && adminCategory === "COMPANIES" && importedCompanies.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xem trước các dòng dữ liệu Doanh nghiệp & Mạng lưới vừa nạp:</span>
                </div>
                <div className="overflow-x-auto border border-purple-100 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
                      <tr>
                        <th className="p-3.5 font-bold">Mã số DN</th>
                        <th className="p-3.5 font-bold">Tên Doanh nghiệp</th>
                        <th className="p-3.5 font-bold">Người ĐDPL</th>
                        <th className="p-3.5 font-bold">CCCD ĐDPL</th>
                        <th className="p-3.5 font-bold">Đối tượng liên quan</th>
                        <th className="p-3.5 font-bold">Quan hệ chi tiết</th>
                        <th className="p-3.5 font-bold">Tỷ lệ vốn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50 font-medium">
                      {importedCompanies.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-purple-50/30 transition">
                          <td className="p-3.5 font-mono font-bold text-gray-800">{c.tax_code}</td>
                          <td className="p-3.5 font-bold text-[#5B21B6]">{c.company_name}</td>
                          <td className="p-3.5 font-semibold text-gray-900">{c.rep_name}</td>
                          <td className="p-3.5 font-mono text-gray-600">{c.rep_cccd}</td>
                          <td className="p-3.5 font-semibold text-purple-950">{c.rel_name || "--"}</td>
                          <td className="p-3.5 text-purple-800 font-semibold">{c.rel_relationship || "--"}</td>
                          <td className="p-3.5 font-mono font-bold text-gray-700">{c.rel_ratio || "0%"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BẢNG PREVIEW DỮ LIỆU TÀI KHOẢN NGƯỜI DÙNG */}
            {adminUploadSuccess && adminCategory === "ACCOUNTS" && importedUsers.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Xem trước danh sách tài khoản vừa được khởi tạo thành công:</span>
                </div>
                <div className="overflow-x-auto border border-purple-100 rounded-2xl">
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
                      {importedUsers.map((u: any, idx: number) => (
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}