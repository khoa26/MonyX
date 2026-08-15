"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  User, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Database,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";

interface UserSession {
  username: string;
  role: "DATA_ADMIN" | "CREDIT_OFFICER" | string;
  access_token: string;
}

export default function Home() {
  // Trạng thái xác thực & người dùng
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);

  // Trạng thái nghiệp vụ Credit Officer
  const [customerType, setCustomerType] = useState<"INDIVIDUAL" | "ENTERPRISE">("INDIVIDUAL");
  const [individualFiles, setIndividualFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null,
    national_id: null,
    related_declaration: null,
  });
  const [enterpriseFiles, setEnterpriseFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null,
    rep_national_id: null,
    business_license: null,
    related_declaration: null,
  });

  // Trạng thái nghiệp vụ Data Admin
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminUploadSuccess, setAdminUploadSuccess] = useState(false);

  // Xử lý Đăng nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      setSession({
        username: username,
        role: data.role,
        access_token: data.access_token,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể kết nối đến máy chủ backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setUsername("");
    setPassword("");
    setIndividualFiles({
      loan_application: null,
      national_id: null,
      related_declaration: null,
    });
    setEnterpriseFiles({
      loan_application: null,
      rep_national_id: null,
      business_license: null,
      related_declaration: null,
    });
    setAdminFile(null);
    setAdminUploadSuccess(false);
  };

  // Kiểm tra đủ điều kiện nộp hồ sơ
  const isIndividualReady =
    individualFiles.loan_application &&
    individualFiles.national_id &&
    individualFiles.related_declaration;

  const isEnterpriseReady =
    enterpriseFiles.loan_application &&
    enterpriseFiles.rep_national_id &&
    enterpriseFiles.business_license &&
    enterpriseFiles.related_declaration;

  // -------------------------------------------------------------
  // VIEW 1: MÀN HÌNH ĐĂNG NHẬP (SPLIT SCREEN BẮT MẮT)
  // -------------------------------------------------------------
  if (!session) {
    return (
      <main className="min-h-screen w-full flex bg-[#F4F6F8]">
        {/* Cột trái: Form Đăng nhập */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-14 md:p-20 bg-white shadow-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F4A3B] flex items-center justify-center text-white font-bold text-xl shadow-md">
              M
            </div>
            <div>
              <span className="font-bold text-lg text-[#1F4A3B] tracking-tight block">MonyX Risk Engine</span>
              <span className="text-[11px] text-gray-400 font-mono block -mt-1">Law on Credit Institutions 2024</span>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto my-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Đăng nhập Hệ thống</h1>
            <p className="text-sm text-gray-500 mt-2">
              Truy cập trung tâm phân tích quan hệ thực thể & kiểm soát giới hạn tín dụng.
            </p>

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4A3B] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4A3B] focus:bg-white transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#1F4A3B]/20 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Xác thực & Truy cập</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-xs text-gray-400 text-center">
            MonyX Compliance Platform © 2026. Phân tích tuân thủ Điều 136 Luật Các TCTD.
          </div>
        </div>

        {/* Cột phải: Hình ảnh tòa nhà tài chính và đồ thị quan hệ */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#132A22] overflow-hidden items-center justify-center">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A14] via-[#132A22]/80 to-transparent" />
          
          <div className="relative z-10 max-w-lg p-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-mono text-[#D4AF37] mb-6">
              <ShieldCheck className="w-4 h-4" />
              Graph AI Engine Enabled
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Phát hiện Tập trung Rủi ro & Nhóm Khách hàng Liên quan.
            </h2>
            <p className="text-gray-300 text-sm mt-4 leading-relaxed font-light">
              Tự động hóa bóc tách hồ sơ pháp lý, đối soát chéo mạng lưới sở hữu chéo phức tạp và tính toán chính xác hạn mức cấp tín dụng theo Điều 136 Luật Các TCTD 2024.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: KHÔNG GIAN DÀNH CHO DATA ADMIN (UPLOAD FILE DỮ LIỆU)
  // -------------------------------------------------------------
  if (session.role === "DATA_ADMIN") {
    return (
      <div className="min-h-screen bg-[#F4F6F8] text-[#1A241D]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#AD7A21] flex items-center justify-center text-white font-bold">
                M
              </div>
              <div>
                <span className="font-bold text-sm text-gray-900 block">MonyX Core Data Manager</span>
                <span className="text-[11px] text-[#AD7A21] font-mono font-semibold">ROLE: DATA_ADMIN</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg border text-gray-600">
                User: <b>{session.username}</b>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        {/* Body Data Admin */}
        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#AD7A21] flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Làm giàu Cơ sở Dữ liệu Đồ thị Thực thể</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tải lên tệp Excel (.xlsx, .csv) hoặc PDF báo cáo tài chính/danh sách cổ đông để nạp vào Neo4j.
                </p>
              </div>
            </div>

            {/* Vùng Dropzone */}
            <div className="mt-8">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-amber-50/40 hover:border-[#AD7A21] transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <UploadCloud className="w-12 h-12 text-[#AD7A21] mb-3" />
                  <p className="text-sm font-semibold text-gray-700">
                    {adminFile ? adminFile.name : "Kéo thả hoặc nhấp để chọn tệp dữ liệu"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Định dạng hỗ trợ: <b>.xlsx, .csv, .pdf</b> (Tối đa 50MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv,.pdf"
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
              <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-[#AD7A21]" />
                  <div>
                    <div className="text-sm font-bold text-gray-800">{adminFile.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  onClick={() => setAdminUploadSuccess(true)}
                  className="px-6 py-2.5 bg-[#AD7A21] hover:bg-[#8e6216] text-white text-xs font-semibold rounded-xl transition shadow-md"
                >
                  Xác nhận & Nạp vào Đồ thị
                </button>
              </div>
            )}

            {adminUploadSuccess && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Tệp dữ liệu đã sẵn sàng nạp vào Neo4j local. (Sẽ tích hợp luồng parser ở bước tiếp theo).</span>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: KHÔNG GIAN DÀNH CHO CREDIT OFFICER (NỘP HỒ SƠ TÍN DỤNG)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#1A241D]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1F4A3B] flex items-center justify-center text-white font-bold">
              M
            </div>
            <div>
              <span className="font-bold text-sm text-gray-900 block">MonyX Credit Underwriting</span>
              <span className="text-[11px] text-[#1F4A3B] font-mono font-semibold">ROLE: CREDIT_OFFICER</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg border text-gray-600">
              Cán bộ: <b>{session.username}</b>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Intake Form */}
      <main className="max-w-5xl mx-auto py-10 px-6">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          {/* Bước 1: Chọn Đối tượng cấp tín dụng */}
          <div>
            <span className="text-[11px] font-mono font-bold text-[#AD7A21] uppercase tracking-wider">
              Bước 1: Phân loại đối tượng vay vốn
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Lựa chọn Loại hình Khách hàng</h2>
            
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option Cá nhân */}
              <button
                type="button"
                onClick={() => setCustomerType("INDIVIDUAL")}
                className={`p-5 rounded-xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${
                  customerType === "INDIVIDUAL"
                    ? "border-[#1F4A3B] bg-[#1F4A3B]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  customerType === "INDIVIDUAL" ? "bg-[#1F4A3B] text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">Khách hàng Cá nhân</div>
                  <div className="text-xs text-gray-500 mt-0.5">Yêu cầu 3 tệp tài liệu PDF</div>
                </div>
              </button>

              {/* Option Doanh nghiệp */}
              <button
                type="button"
                onClick={() => setCustomerType("ENTERPRISE")}
                className={`p-5 rounded-xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${
                  customerType === "ENTERPRISE"
                    ? "border-[#1F4A3B] bg-[#1F4A3B]/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  customerType === "ENTERPRISE" ? "bg-[#1F4A3B] text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">Khách hàng Doanh nghiệp / Tổ chức</div>
                  <div className="text-xs text-gray-500 mt-0.5">Yêu cầu 4 tệp tài liệu PDF</div>
                </div>
              </button>
            </div>
          </div>

          <hr className="my-8 border-gray-100" />

          {/* Bước 2: Danh sách tải lên theo từng option */}
          <div>
            <span className="text-[11px] font-mono font-bold text-[#AD7A21] uppercase tracking-wider">
              Bước 2: Cung cấp tài liệu hồ sơ bắt buộc
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              {customerType === "INDIVIDUAL"
                ? "Bộ hồ sơ Khách hàng Cá nhân (3 tệp PDF)"
                : "Bộ hồ sơ Khách hàng Doanh nghiệp (4 tệp PDF)"}
            </h3>

            {/* DANH SÁCH FILE CHO CÁ NHÂN */}
            {customerType === "INDIVIDUAL" && (
              <div className="mt-6 space-y-4">
                {/* File 1 */}
                <FileItem
                  label="1. Giấy đề nghị vay vốn"
                  filenamePattern="giay_de_nghi_vay_von.pdf"
                  file={individualFiles.loan_application}
                  onSelect={(file) => setIndividualFiles({ ...individualFiles, loan_application: file })}
                />
                {/* File 2 */}
                <FileItem
                  label="2. Căn cước công dân (CCCD)"
                  filenamePattern="cccd.pdf"
                  file={individualFiles.national_id}
                  onSelect={(file) => setIndividualFiles({ ...individualFiles, national_id: file })}
                />
                {/* File 3 */}
                <FileItem
                  label="3. Bảng kê khai người có liên quan"
                  filenamePattern="bang_ke_khai_lien_quan.pdf"
                  file={individualFiles.related_declaration}
                  onSelect={(file) => setIndividualFiles({ ...individualFiles, related_declaration: file })}
                />
              </div>
            )}

            {/* DANH SÁCH FILE CHO DOANH NGHIỆP */}
            {customerType === "ENTERPRISE" && (
              <div className="mt-6 space-y-4">
                {/* File 1 */}
                <FileItem
                  label="1. Giấy đề nghị cấp tín dụng"
                  filenamePattern="giay_de_nghi_vay_von.pdf"
                  file={enterpriseFiles.loan_application}
                  onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, loan_application: file })}
                />
                {/* File 2 */}
                <FileItem
                  label="2. CCCD Người đại diện theo pháp luật"
                  filenamePattern="cccd_nguoi_dai_dien_phap_luat.pdf"
                  file={enterpriseFiles.rep_national_id}
                  onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, rep_national_id: file })}
                />
                {/* File 3 */}
                <FileItem
                  label="3. Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD)"
                  filenamePattern="giay_chung_nhan_dang_ky_danh_nghiep.pdf"
                  file={enterpriseFiles.business_license}
                  onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, business_license: file })}
                />
                {/* File 4 */}
                <FileItem
                  label="4. Bảng kê khai người có liên quan"
                  filenamePattern="bang_ke_khai_lien_quan.pdf"
                  file={enterpriseFiles.related_declaration}
                  onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, related_declaration: file })}
                />
              </div>
            )}
          </div>

          {/* Nút Submit Tiếp theo */}
          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-mono">
              Trạng thái hồ sơ:{" "}
              {(customerType === "INDIVIDUAL" ? isIndividualReady : isEnterpriseReady) ? (
                <span className="text-emerald-700 font-bold">ĐÃ ĐỦ TÀI LIỆU</span>
              ) : (
                <span className="text-amber-700 font-bold">CHƯA ĐỦ TÀI LIỆU BẮT BUỘC</span>
              )}
            </div>

            <button
              disabled={!(customerType === "INDIVIDUAL" ? isIndividualReady : isEnterpriseReady)}
              onClick={() => {
                alert("Đã thu thập đầy đủ tài liệu hồ sơ! Sẵn sàng đưa vào Pipeline xử lý OCR & Đối soát thực thể ở bước tiếp theo.");
              }}
              className="px-8 py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-[#1F4A3B]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <span>Xác nhận & Bắt đầu thẩm định</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT TẢI TỪNG TỆP TÀI LIỆU CHUẨN FORM
// -------------------------------------------------------------
function FileItem({
  label,
  filenamePattern,
  file,
  onSelect,
}: {
  label: string;
  filenamePattern: string;
  file: File | null;
  onSelect: (file: File) => void;
}) {
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
      file ? "bg-emerald-50/50 border-emerald-300" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          file ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
        }`}>
          {file ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-xs font-bold text-gray-800">{label}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            {file ? file.name : `Tệp yêu cầu: ${filenamePattern}`}
          </div>
        </div>
      </div>

      <div>
        <label className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1.5 ${
          file 
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
        }`}>
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{file ? "Thay đổi tệp" : "Tải lên PDF"}</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onSelect(e.target.files[0]);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}