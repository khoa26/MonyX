"use client";

import React, { useState } from "react";
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
  FileSpreadsheet, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  Edit3, 
  RefreshCw,
  KeyRound,
  UserCheck
} from "lucide-react";

interface UserSession {
  username: string;
  role: "DATA_ADMIN" | "CREDIT_OFFICER" | string;
  access_token: string;
}

const INDIVIDUAL_RELATIONS = [
  "Vợ/chồng", "Bố đẻ, mẹ đẻ", "Bố nuôi, mẹ nuôi", "Bố chồng, mẹ chồng",
  "Bố vợ, mẹ vợ", "Con đẻ, con nuôi", "Con rể, con dâu", "Anh ruột, chị ruột, em ruột",
  "Doanh nghiệp sở hữu / Cổ đông", "Tùy chỉnh khác"
];

const CORP_RELATION_GROUPS = [
  {
    group: "1. Nhóm Công ty mẹ & Chủ thể liên quan",
    options: ["Công ty mẹ", "Người quản lý của công ty mẹ", "Người đại diện theo pháp luật của công ty mẹ", "Người có thẩm quyền bổ nhiệm người quản lý công ty mẹ"]
  },
  {
    group: "2. Nhóm Công ty con & Chủ thể liên quan",
    options: ["Công ty con", "Người quản lý của công ty con", "Người đại diện theo pháp luật của công ty con"]
  },
  {
    group: "3. Nhóm Cá nhân / Tổ chức có khả năng Chi phối",
    options: ["Cá nhân có khả năng chi phối hoạt động doanh nghiệp", "Tổ chức có khả năng chi phối hoạt động doanh nghiệp", "Chi phối thông qua sở hữu / thâu tóm cổ phần, vốn góp", "Chi phối thông qua việc ra quyết định của công ty"]
  },
  {
    group: "4. Nhóm Người quản lý, ĐDPL & Kiểm soát viên",
    options: ["Chủ tịch / Thành viên HĐQT", "Chủ tịch / Thành viên HĐTV", "Chủ tịch công ty", "Giám đốc / Tổng Giám đốc", "Người đại diện theo pháp luật", "Kiểm soát viên / Trưởng Ban kiểm soát", "Chủ doanh nghiệp tư nhân", "Thành viên hợp danh", "Cá nhân giữ chức danh quản lý khác theo Điều lệ"]
  },
  {
    group: "5. Nhóm Người có quan hệ gia đình",
    options: ["Vợ/chồng", "Bố đẻ, mẹ đẻ", "Bố nuôi, mẹ nuôi", "Bố chồng, mẹ chồng", "Bố vợ, mẹ vợ", "Con đẻ, con nuôi", "Con rể, con dâu", "Anh ruột, chị ruột, em ruột"]
  },
  {
    group: "6. Nhóm Người đại diện theo ủy quyền",
    options: ["Người đại diện theo ủy quyền của tổ chức / cổ đông"]
  },
  {
    group: "7. Khác",
    options: ["Tùy chỉnh khác"]
  }
];

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);

  // States Data Admin (4 Danh mục Master Data)
  const [adminCategory, setAdminCategory] = useState<"LOAN_CONTRACTS" | "PERSONS" | "COMPANIES" | "ACCOUNTS">("LOAN_CONTRACTS");
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminUploadSuccess, setAdminUploadSuccess] = useState(false);
  const [importedLoans, setImportedLoans] = useState<any[]>([]);
  const [importedPersons, setImportedPersons] = useState<any[]>([]);
  const [importedCompanies, setImportedCompanies] = useState<any[]>([]);
  const [importedUsers, setImportedUsers] = useState<any[]>([]);

  // States Credit Officer
  const [customerType, setCustomerType] = useState<"INDIVIDUAL" | "ENTERPRISE">("INDIVIDUAL");
  const [individualFiles, setIndividualFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null, national_id: null, related_declaration: null,
  });
  const [enterpriseFiles, setEnterpriseFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null, rep_national_id: null, business_license: null, related_declaration: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [appId, setAppId] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  
  // State Cá nhân
  const [borrowerForm, setBorrowerForm] = useState<any>(null);
  const [loanForm, setLoanForm] = useState<any>(null);
  const [relatedList, setRelatedList] = useState<any[]>([]);

  // State Doanh nghiệp
  const [enterpriseForm, setEnterpriseForm] = useState<any>(null);
  const [corpLoanForm, setCorpLoanForm] = useState<any>(null);
  const [repForm, setRepForm] = useState<any>(null);
  const [corpRelatedList, setCorpRelatedList] = useState<any[]>([]);

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
      if (!response.ok) throw new Error(data.detail || "Tên đăng nhập hoặc mật khẩu không chính xác.");

      setSession({ username, role: data.role, access_token: data.access_token });
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
    setBorrowerForm(null);
    setEnterpriseForm(null);
    setSavedSuccessMsg(null);
    setAdminFile(null);
    setAdminUploadSuccess(false);
    setImportedLoans([]);
    setImportedPersons([]);
    setImportedCompanies([]);
    setImportedUsers([]);
  };

  // Nạp dữ liệu Excel phía Admin
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
        headers: { Authorization: `Bearer ${session?.access_token}` },
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

  // Luồng thẩm định tự động
  const handleStartUnderwriting = async () => {
    setIsProcessing(true);
    setExtractError(null);

    const formData = new FormData();

    if (customerType === "INDIVIDUAL") {
      if (!individualFiles.loan_application || !individualFiles.national_id || !individualFiles.related_declaration) {
        alert("Vui lòng tải lên đủ 3 tài liệu PDF của Cá nhân.");
        setIsProcessing(false);
        return;
      }
      formData.append("loan_application", individualFiles.loan_application);
      formData.append("national_id", individualFiles.national_id);
      formData.append("related_declaration", individualFiles.related_declaration);

      try {
        const response = await fetch("http://localhost:8000/api/v1/credit/process-individual", {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Trích xuất thất bại");

        setAppId(data.application_id);
        setWarnings(data.validation_warnings || []);
        setBorrowerForm(data.borrower_profile);
        setLoanForm(data.loan_details);
        setRelatedList(data.related_group || []);
        setIsManualMode(false);
      } catch (err: any) {
        setExtractError(err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (!enterpriseFiles.loan_application || !enterpriseFiles.rep_national_id || !enterpriseFiles.business_license || !enterpriseFiles.related_declaration) {
        alert("Vui lòng tải lên đủ 4 tài liệu PDF của Doanh nghiệp.");
        setIsProcessing(false);
        return;
      }
      formData.append("loan_application", enterpriseFiles.loan_application);
      formData.append("rep_national_id", enterpriseFiles.rep_national_id);
      formData.append("business_license", enterpriseFiles.business_license);
      formData.append("related_declaration", enterpriseFiles.related_declaration);

      try {
        const response = await fetch("http://localhost:8000/api/v1/credit/process-enterprise", {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Trích xuất hồ sơ doanh nghiệp thất bại");

        setAppId(data.application_id);
        setEnterpriseForm(data.enterprise_profile);
        setCorpLoanForm(data.loan_details);
        setRepForm(data.representative);
        setCorpRelatedList(data.related_group || []);
        setIsManualMode(false);
      } catch (err: any) {
        setExtractError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Chế độ tự nhập thủ công
  const handleEnterManualMode = () => {
    const generatedId = `${customerType === "INDIVIDUAL" ? "APP" : "CORP"}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setAppId(generatedId);
    setWarnings([]);
    setIsManualMode(true);
    setExtractError(null);

    if (customerType === "INDIVIDUAL") {
      setBorrowerForm({
        full_name: "", cccd_id: "", dob: "", gender: "Nam", nationality: "Việt Nam",
        place_of_origin: "", place_of_residence: "", date_of_expiry: "", phone: "", email: "",
      });
      setLoanForm({
        purpose: "Vay bổ sung vốn kinh doanh", loan_amount: "500000000", term_months: "36",
        business_name: "", business_address: "",
      });
      setRelatedList([
        { id: "1", entity_type: "PERSON", full_name: "", identifier: "", relationship_type: "Vợ/chồng", custom_relationship: "", ownership_ratio: "0%" }
      ]);
    } else {
      setEnterpriseForm({
        company_name: "", short_name: "", tax_code: "", charter_capital: "10.000.000.000 VND",
        headquarters_address: "", business_sector: "",
      });
      setCorpLoanForm({
        loan_amount: "5000000000", purpose: "Vay bổ sung vốn lưu động phục vụ kinh doanh", term_months: "12",
        repayment_source: "Doanh thu từ hoạt động sản xuất kinh doanh",
      });
      setRepForm({
        full_name: "", cccd_id: "", issue_date: "", issue_place: "Cục Cảnh sát QLHC về TTXH",
        position: "Tổng Giám đốc", workplace: "", current_address: "", phone: "", email: "",
      });
      setCorpRelatedList([
        {
          id: "1",
          entity_type: "ORGANIZATION",
          name: "",
          identifier: "",
          nationality: "Việt Nam",
          issue_date: "",
          issue_place: "",
          position: "",
          relationship_group: "1. Nhóm Công ty mẹ & Chủ thể liên quan",
          specific_relationship: "Công ty mẹ",
          custom_relationship: "",
          ownership_ratio: "0%"
        }
      ]);
    }
  };

  // Thao tác mảng người liên quan Cá nhân
  const handleAddIndivRelated = () => {
    setRelatedList([
      ...relatedList,
      { id: String(Date.now()), entity_type: "PERSON", full_name: "", identifier: "", relationship_type: "Vợ/chồng", custom_relationship: "", ownership_ratio: "0%" }
    ]);
  };
  const handleRemoveIndivRelated = (index: number) => {
    setRelatedList(relatedList.filter((_, i) => i !== index));
  };
  const handleUpdateIndivRelated = (index: number, field: string, value: string) => {
    const updated = [...relatedList];
    updated[index][field] = value;
    setRelatedList(updated);
  };

  // Thao tác mảng người liên quan Doanh nghiệp
  const handleAddCorpRelated = () => {
    setCorpRelatedList([
      ...corpRelatedList,
      {
        id: String(Date.now()),
        entity_type: "ORGANIZATION",
        name: "",
        identifier: "",
        nationality: "Việt Nam",
        issue_date: "",
        issue_place: "",
        position: "",
        relationship_group: "1. Nhóm Công ty mẹ & Chủ thể liên quan",
        specific_relationship: "Công ty mẹ",
        custom_relationship: "",
        ownership_ratio: "0%"
      }
    ]);
  };
  const handleRemoveCorpRelated = (index: number) => {
    setCorpRelatedList(corpRelatedList.filter((_, i) => i !== index));
  };
  const handleUpdateCorpRelated = (index: number, field: string, value: string) => {
    const updated = [...corpRelatedList];
    updated[index][field] = value;
    setCorpRelatedList(updated);
  };

  // Lưu Cá nhân vào Neo4j
  const handleSaveIndividualToGraph = async () => {
    if (!borrowerForm.full_name || !borrowerForm.cccd_id || borrowerForm.cccd_id === "NOT_FOUND") {
      alert("Vui lòng điền đầy đủ Họ tên và Số CCCD của người vay.");
      return;
    }

    setIsSaving(true);
    setSavedSuccessMsg(null);

    const payload = {
      application_id: appId,
      borrower_profile: borrowerForm,
      loan_details: loanForm,
      related_group: relatedList,
    };

    try {
      const response = await fetch("http://localhost:8000/api/v1/credit/save-individual", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.detail || "Lưu đồ thị thất bại");

      setSavedSuccessMsg(res.message);
    } catch (err: any) {
      alert("Lỗi lưu cơ sở dữ liệu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu Doanh nghiệp vào Neo4j
  const handleSaveEnterpriseToGraph = async () => {
    if (!enterpriseForm.company_name || !enterpriseForm.tax_code || enterpriseForm.tax_code === "NOT_FOUND") {
      alert("Vui lòng điền Tên doanh nghiệp và Mã số doanh nghiệp (MSDN / MST).");
      return;
    }
    if (!repForm.full_name || !repForm.cccd_id || repForm.cccd_id === "NOT_FOUND") {
      alert("Vui lòng điền thông tin Họ tên và Số CCCD của Người đại diện.");
      return;
    }

    setIsSaving(true);
    setSavedSuccessMsg(null);

    const payload = {
      application_id: appId,
      enterprise_profile: enterpriseForm,
      loan_details: corpLoanForm,
      representative: repForm,
      related_group: corpRelatedList
    };

    try {
      const response = await fetch("http://localhost:8000/api/v1/credit/save-enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.detail || "Lưu đồ thị thất bại");

      setSavedSuccessMsg(res.message);
    } catch (err: any) {
      alert("Lỗi lưu cơ sở dữ liệu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isIndividualReady = individualFiles.loan_application && individualFiles.national_id && individualFiles.related_declaration;
  const isEnterpriseReady = enterpriseFiles.loan_application && enterpriseFiles.rep_national_id && enterpriseFiles.business_license && enterpriseFiles.related_declaration;

  // =============================================================
  // VIEW 1: ĐĂNG NHẬP
  // =============================================================
  if (!session) {
    return (
      <main className="min-h-screen w-full flex bg-[#F4F6F8]">
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-14 md:p-20 bg-white shadow-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F4A3B] flex items-center justify-center text-white font-bold text-xl shadow-md">M</div>
            <div>
              <span className="font-bold text-lg text-[#1F4A3B] tracking-tight block">MonyX Risk Engine</span>
              <span className="text-[11px] text-gray-400 font-mono block -mt-1">Law on Credit Institutions 2024</span>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto my-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Đăng nhập Hệ thống</h1>
            <p className="text-sm text-gray-500 mt-2">Truy cập trung tâm phân tích quan hệ thực thể & kiểm soát giới hạn tín dụng.</p>

            {errorMessage && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Tên tài khoản / Mã định danh</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4A3B] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Mật khẩu bảo mật</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4A3B] focus:bg-white transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#1F4A3B]/20 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Xác thực & Truy cập</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </div>

          <div className="text-xs text-gray-400 text-center">MonyX Compliance Platform © 2026. Phân tích tuân thủ Điều 136 Luật Các TCTD.</div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative bg-[#132A22] overflow-hidden items-center justify-center">
          <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A14] via-[#132A22]/80 to-transparent" />
          <div className="relative z-10 max-w-lg p-10 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-mono text-[#D4AF37] mb-6">
              <ShieldCheck className="w-4 h-4" /> Graph AI Engine Enabled
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">Phát hiện Tập trung Rủi ro & Nhóm Khách hàng Liên quan.</h2>
            <p className="text-gray-300 text-sm mt-4 leading-relaxed font-light">Tự động hóa bóc tách hồ sơ pháp lý, đối soát chéo mạng lưới sở hữu chéo phức tạp và tính toán chính xác hạn mức cấp tín dụng theo Điều 136 Luật Các TCTD 2024.</p>
          </div>
        </div>
      </main>
    );
  }

  // =============================================================
  // VIEW 2: DATA ADMIN (4 DANH MỤC MASTER DATA)
  // =============================================================
  if (session.role === "DATA_ADMIN") {
    return (
      <div className="min-h-screen bg-[#F4F6F8] text-[#1A241D]">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#AD7A21] flex items-center justify-center text-white font-bold">M</div>
              <div>
                <span className="font-bold text-sm text-gray-900 block">MonyX Master Data Manager</span>
                <span className="text-[11px] text-[#AD7A21] font-mono font-semibold">ROLE: DATA_ADMIN</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg border text-gray-600">Admin: <b>{session.username}</b></span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto py-10 px-6 space-y-8">
          {/* BƯỚC 1: CHỌN DANH MỤC */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[#AD7A21] uppercase tracking-wider">Bước 1: Chọn Phân loại Thực thể / Dữ liệu Nạp</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Lựa chọn Danh mục Master Data</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mỗi danh mục có bộ quy chuẩn schema file Excel riêng để đảm bảo tính toàn vẹn của Đồ thị DVBank.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button type="button" onClick={() => { setAdminCategory("LOAN_CONTRACTS"); setAdminFile(null); setAdminUploadSuccess(false); }} className={`p-4 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${adminCategory === "LOAN_CONTRACTS" ? "border-[#AD7A21] bg-amber-50/40 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${adminCategory === "LOAN_CONTRACTS" ? "bg-[#AD7A21] text-white" : "bg-gray-100 text-gray-500"}`}><CreditCard className="w-5 h-5" /></div>
                  {adminCategory === "LOAN_CONTRACTS" && <span className="text-[10px] font-bold font-mono bg-[#AD7A21] text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="mt-4"><div className="font-bold text-sm text-gray-900">1. Hồ sơ Tín dụng</div><div className="text-[11px] text-gray-500 mt-0.5">Mã HĐ, Dư nợ, CCCD, Lãi suất, Trạng thái</div></div>
              </button>

              <button type="button" onClick={() => { setAdminCategory("PERSONS"); setAdminFile(null); setAdminUploadSuccess(false); }} className={`p-4 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${adminCategory === "PERSONS" ? "border-[#AD7A21] bg-amber-50/40 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${adminCategory === "PERSONS" ? "bg-[#AD7A21] text-white" : "bg-gray-100 text-gray-500"}`}><User className="w-5 h-5" /></div>
                  {adminCategory === "PERSONS" && <span className="text-[10px] font-bold font-mono bg-[#AD7A21] text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="mt-4"><div className="font-bold text-sm text-gray-900">2. Thực thể Cá nhân</div><div className="text-[11px] text-gray-500 mt-0.5">CCCD, Họ tên, Địa chỉ & Nhóm liên quan</div></div>
              </button>

              <button type="button" onClick={() => { setAdminCategory("COMPANIES"); setAdminFile(null); setAdminUploadSuccess(false); }} className={`p-4 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${adminCategory === "COMPANIES" ? "border-[#AD7A21] bg-amber-50/40 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${adminCategory === "COMPANIES" ? "bg-[#AD7A21] text-white" : "bg-gray-100 text-gray-500"}`}><Building2 className="w-5 h-5" /></div>
                  {adminCategory === "COMPANIES" && <span className="text-[10px] font-bold font-mono bg-[#AD7A21] text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="mt-4"><div className="font-bold text-sm text-gray-900">3. Thực thể Doanh nghiệp</div><div className="text-[11px] text-gray-500 mt-0.5">MSDN, Tên công ty, ĐDPL, Điều 136</div></div>
              </button>

              <button type="button" onClick={() => { setAdminCategory("ACCOUNTS"); setAdminFile(null); setAdminUploadSuccess(false); }} className={`p-4 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${adminCategory === "ACCOUNTS" ? "border-[#AD7A21] bg-amber-50/40 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${adminCategory === "ACCOUNTS" ? "bg-[#AD7A21] text-white" : "bg-gray-100 text-gray-500"}`}><KeyRound className="w-5 h-5" /></div>
                  {adminCategory === "ACCOUNTS" && <span className="text-[10px] font-bold font-mono bg-[#AD7A21] text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="mt-4"><div className="font-bold text-sm text-gray-900">4. Tài khoản Người dùng</div><div className="text-[11px] text-gray-500 mt-0.5">Username, Mật khẩu, Quyền hạn cán bộ</div></div>
              </button>
            </div>
          </div>

          {/* 1. NẠP HỒ SƠ TÍN DỤNG */}
          {adminCategory === "LOAN_CONTRACTS" && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nạp File Hồ sơ Tín dụng Lịch sử (Master Loans)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Hệ thống sẽ đồng bộ các Node <code>:Loan</code> và liên kết trực tiếp với Node <code>:Person</code> tương ứng.</p>
                </div>
                <div className="text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-lg border text-gray-600">Schema: <b>danh_sach_tin_dung.xlsx</b></div>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-amber-50/30 hover:border-[#AD7A21] transition">
                  <UploadCloud className="w-12 h-12 text-[#AD7A21] mb-2" />
                  <p className="text-sm font-semibold text-gray-700">{adminFile ? adminFile.name : "Kéo thả hoặc nhấp để chọn tệp Excel hồ sơ tín dụng"}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Cột bắt buộc: <b>ma_tin_dung, cccd_nguoi_vay, ten_nguoi_vay, so_tien_vay, du_no_hien_tai, trang_thai</b></p>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAdminFile(e.target.files[0]); setAdminUploadSuccess(false); } }} />
                </label>
              </div>

              {adminFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-[#AD7A21]" />
                    <div><div className="text-sm font-bold text-gray-800">{adminFile.name}</div><div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div></div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={handleUploadAdminMasterData}
                    className="px-6 py-2.5 bg-[#AD7A21] hover:bg-[#8e6216] text-white text-xs font-semibold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Đang nạp vào Neo4j..." : "Xác nhận & Nạp vào Đồ thị"}
                  </button>
                </div>
              )}

              {adminUploadSuccess && importedLoans.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Xem trước dữ liệu tín dụng vừa đồng bộ:</span></div>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Mã Tín dụng</th>
                          <th className="p-3">CCCD Người vay</th>
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">Số tiền vay (VND)</th>
                          <th className="p-3">Dư nợ hiện tại (VND)</th>
                          <th className="p-3">Thời hạn</th>
                          <th className="p-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {importedLoans.map((loan: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-[#AD7A21]">{loan.loan_id}</td>
                            <td className="p-3 font-mono text-gray-700">{loan.cccd}</td>
                            <td className="p-3 font-bold text-gray-900">{loan.full_name}</td>
                            <td className="p-3 font-mono">{Number(loan.amount).toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-emerald-700">{Number(loan.balance).toLocaleString()}</td>
                            <td className="p-3">{loan.term_months} tháng</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${loan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{loan.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. NẠP THỰC THỂ CÁ NHÂN */}
          {adminCategory === "PERSONS" && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nạp File Thực thể Cá nhân & Nhóm Liên quan</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tự động Upsert Node <code>:Person</code> và tạo các mối quan hệ gia đình (Điều 136) hoặc sở hữu doanh nghiệp.</p>
                </div>
                <div className="text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-lg border text-gray-600">Schema: <b>danh_sach_ca_nhan.xlsx</b></div>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-amber-50/30 hover:border-[#AD7A21] transition">
                  <UploadCloud className="w-12 h-12 text-[#AD7A21] mb-2" />
                  <p className="text-sm font-semibold text-gray-700">{adminFile ? adminFile.name : "Kéo thả hoặc nhấp để chọn tệp Excel Thực thể Cá nhân"}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Cột bắt buộc: <b>cccd, ho_ten, loai_lien_quan, ten_nguoi_lien_quan, dinh_danh_lien_quan, moi_quan_he</b></p>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAdminFile(e.target.files[0]); setAdminUploadSuccess(false); } }} />
                </label>
              </div>

              {adminFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-[#AD7A21]" />
                    <div><div className="text-sm font-bold text-gray-800">{adminFile.name}</div><div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div></div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={handleUploadAdminMasterData}
                    className="px-6 py-2.5 bg-[#AD7A21] hover:bg-[#8e6216] text-white text-xs font-semibold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Đang đồng bộ vào Neo4j..." : "Xác nhận & Nạp vào Đồ thị"}
                  </button>
                </div>
              )}

              {adminUploadSuccess && importedPersons.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Xem trước các dòng dữ liệu Cá nhân & Quan hệ vừa nạp:</span></div>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">CCCD Chính</th>
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">Người/DN Liên quan</th>
                          <th className="p-3">Định danh Liên quan</th>
                          <th className="p-3">Mối quan hệ</th>
                          <th className="p-3">Tỷ lệ vốn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {importedPersons.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-gray-800">{p.cccd}</td>
                            <td className="p-3 font-bold text-[#1F4A3B]">{p.full_name}</td>
                            <td className="p-3 font-semibold text-gray-900">{p.rel_name || "--"}</td>
                            <td className="p-3 font-mono text-gray-600">{p.rel_id || "--"}</td>
                            <td className="p-3 text-indigo-700 font-semibold">{p.relationship || "--"}</td>
                            <td className="p-3 font-mono font-bold text-gray-700">{p.ownership_ratio || "0%"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. NẠP THỰC THỂ DOANH NGHIỆP */}
          {adminCategory === "COMPANIES" && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nạp File Thực thể Doanh nghiệp & Mạng lưới Điều 136</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tự động Upsert Node <code>:Company</code>, cập nhật Người ĐDPL mới nhất và tạo các liên kết Công ty mẹ/con/chi phối.</p>
                </div>
                <div className="text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-lg border text-gray-600">Schema: <b>danh_sach_doanh_nghiep.xlsx</b></div>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-amber-50/30 hover:border-[#AD7A21] transition">
                  <UploadCloud className="w-12 h-12 text-[#AD7A21] mb-2" />
                  <p className="text-sm font-semibold text-gray-700">{adminFile ? adminFile.name : "Kéo thả hoặc nhấp để chọn tệp Excel Thực thể Doanh nghiệp"}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Cột bắt buộc: <b>ma_so_doanh_nghiep, ten_doanh_nghiep, ho_ten_dai_dien, cccd_dai_dien</b></p>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAdminFile(e.target.files[0]); setAdminUploadSuccess(false); } }} />
                </label>
              </div>

              {adminFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-[#AD7A21]" />
                    <div><div className="text-sm font-bold text-gray-800">{adminFile.name}</div><div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div></div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={handleUploadAdminMasterData}
                    className="px-6 py-2.5 bg-[#AD7A21] hover:bg-[#8e6216] text-white text-xs font-semibold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Đang đồng bộ vào Neo4j..." : "Xác nhận & Nạp vào Đồ thị"}
                  </button>
                </div>
              )}

              {adminUploadSuccess && importedCompanies.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Xem trước các dòng dữ liệu Doanh nghiệp & Mạng lưới vừa nạp:</span></div>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Mã số DN</th>
                          <th className="p-3">Tên Doanh nghiệp</th>
                          <th className="p-3">Người ĐDPL</th>
                          <th className="p-3">CCCD ĐDPL</th>
                          <th className="p-3">Đối tượng liên quan</th>
                          <th className="p-3">Quan hệ chi tiết</th>
                          <th className="p-3">Tỷ lệ vốn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {importedCompanies.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-gray-800">{c.tax_code}</td>
                            <td className="p-3 font-bold text-[#1F4A3B]">{c.company_name}</td>
                            <td className="p-3 font-semibold text-gray-900">{c.rep_name}</td>
                            <td className="p-3 font-mono text-gray-600">{c.rep_cccd}</td>
                            <td className="p-3 font-semibold text-indigo-900">{c.rel_name || "--"}</td>
                            <td className="p-3 text-indigo-700 font-semibold">{c.rel_relationship || "--"}</td>
                            <td className="p-3 font-mono font-bold text-gray-700">{c.rel_ratio || "0%"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. NẠP TÀI KHOẢN NGƯỜI DÙNG HỆ THỐNG */}
          {adminCategory === "ACCOUNTS" && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nạp File Tài khoản Cán bộ & Quản trị viên</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tự động băm bảo mật mật khẩu (Bcrypt) và lưu trữ Node <code>:User</code> phục vụ đăng nhập hệ thống.</p>
                </div>
                <div className="text-xs font-mono bg-gray-50 px-3 py-1.5 rounded-lg border text-gray-600">Schema: <b>danh_sach_tai_khoan.xlsx</b></div>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-amber-50/30 hover:border-[#AD7A21] transition">
                  <UploadCloud className="w-12 h-12 text-[#AD7A21] mb-2" />
                  <p className="text-sm font-semibold text-gray-700">{adminFile ? adminFile.name : "Kéo thả hoặc nhấp để chọn tệp Excel Tài khoản Người dùng"}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Cột bắt buộc: <b>username, password, full_name, role</b> (CREDIT_OFFICER / DATA_ADMIN)</p>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setAdminFile(e.target.files[0]); setAdminUploadSuccess(false); } }} />
                </label>
              </div>

              {adminFile && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-[#AD7A21]" />
                    <div><div className="text-sm font-bold text-gray-800">{adminFile.name}</div><div className="text-xs text-gray-400 font-mono">{(adminFile.size / 1024).toFixed(1)} KB</div></div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={handleUploadAdminMasterData}
                    className="px-6 py-2.5 bg-[#AD7A21] hover:bg-[#8e6216] text-white text-xs font-semibold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Đang mã hóa & lưu vào Neo4j..." : "Xác nhận & Khởi tạo Tài khoản"}
                  </button>
                </div>
              )}

              {adminUploadSuccess && importedUsers.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs"><UserCheck className="w-4 h-4 text-emerald-600" /><span>Xem trước danh sách tài khoản vừa được khởi tạo thành công:</span></div>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Tên đăng nhập (Username)</th>
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">Quyền hạn (Role)</th>
                          <th className="p-3">Email công vụ</th>
                          <th className="p-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {importedUsers.map((u: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-[#1F4A3B]">{u.username}</td>
                            <td className="p-3 font-bold text-gray-900">{u.full_name}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                u.role === "DATA_ADMIN" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 font-mono">{u.email || "N/A"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700">
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
          )}
        </main>
      </div>
    );
  }

  // =============================================================
  // VIEW 3: GIAO DIỆN CREDIT OFFICER
  // =============================================================
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#1A241D]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1F4A3B] flex items-center justify-center text-white font-bold">M</div>
            <div>
              <span className="font-bold text-sm text-gray-900 block">MonyX Credit Underwriting</span>
              <span className="text-[11px] text-[#1F4A3B] font-mono font-semibold">ROLE: CREDIT_OFFICER</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono bg-gray-100 px-3 py-1.5 rounded-lg border text-gray-600">Cán bộ: <b>{session.username}</b></span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer">
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-10 px-6">
        {/* 1. FORM HIỆU CHỈNH DOANH NGHIỆP */}
        {enterpriseForm ? (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#AD7A21] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">MÃ HỒ SƠ: {appId}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#1F4A3B]/10 text-[#1F4A3B]">HỒ SƠ KHÁCH HÀNG DOANH NGHIỆP</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Bảng Dữ liệu Thẩm định Doanh nghiệp & Nhóm Liên quan</h2>
                <p className="text-xs text-gray-500 mt-1">Định danh theo MSDN / MST và kiểm soát giới hạn Điều 136 Luật Các TCTD 2024.</p>
              </div>
              <button onClick={() => { setEnterpriseForm(null); setSavedSuccessMsg(null); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer">
                <RotateCcw className="w-4 h-4" /> Quay lại tải file
              </button>
            </div>

            {savedSuccessMsg && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Đã nạp mạng lưới thực thể Doanh nghiệp vào Neo4j thành công!</div>
                  <p className="text-emerald-700 mt-1">{savedSuccessMsg}</p>
                </div>
              </div>
            )}

            {/* BẢNG 1: DOANH NGHIỆP */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                  <Building2 className="w-5 h-5 text-[#1F4A3B]" />
                  1. Pháp nhân Doanh nghiệp & Đề nghị Vay vốn (ĐKKD & Đơn vay)
                </div>
                <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-md border border-emerald-200">Định danh MSDN</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Tên doanh nghiệp (*)</label>
                  <input type="text" required placeholder="CÔNG TY CỔ PHẦN ĐẦU TƯ BÌNH MINH" value={enterpriseForm.company_name || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, company_name: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#1F4A3B] outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Mã số DN (MSDN / MST) (*)</label>
                  <input type="text" required placeholder="0312345678" value={enterpriseForm.tax_code || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, tax_code: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-[#1F4A3B] focus:bg-white focus:ring-2 focus:ring-[#1F4A3B] outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Tên viết tắt</label>
                  <input type="text" placeholder="BINH MINH CORP" value={enterpriseForm.short_name || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, short_name: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Vốn điều lệ (VND)</label>
                  <input type="text" placeholder="50.000.000.000" value={enterpriseForm.charter_capital || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, charter_capital: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Ngành nghề kinh doanh</label>
                  <input type="text" placeholder="Bất động sản / Xây dựng..." value={enterpriseForm.business_sector || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, business_sector: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Địa chỉ trụ sở chính</label>
                  <input type="text" placeholder="Tòa nhà Landmark 81, 720A Điện Biên Phủ, P.22, Q.Bình Thạnh, TP.HCM" value={enterpriseForm.headquarters_address || ""} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, headquarters_address: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Mục đích vay vốn (*)</label>
                  <input type="text" value={corpLoanForm.purpose || ""} onChange={(e) => setCorpLoanForm({ ...corpLoanForm, purpose: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số tiền đề nghị vay (VND) (*)</label>
                  <input type="text" placeholder="5000000000" value={corpLoanForm.loan_amount || ""} onChange={(e) => setCorpLoanForm({ ...corpLoanForm, loan_amount: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-emerald-700 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Thời hạn vay (tháng)</label>
                  <input type="text" placeholder="12" value={corpLoanForm.term_months || ""} onChange={(e) => setCorpLoanForm({ ...corpLoanForm, term_months: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Nguồn trả nợ dự kiến</label>
                  <input type="text" value={corpLoanForm.repayment_source || ""} onChange={(e) => setCorpLoanForm({ ...corpLoanForm, repayment_source: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
              </div>
            </div>

            {/* BẢNG 2: NGƯỜI ĐẠI DIỆN */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                  <User className="w-5 h-5 text-[#AD7A21]" />
                  2. Thông tin Người Đại diện Vay vốn / Đại diện Pháp luật
                </div>
                <span className="text-[11px] font-mono bg-amber-50 text-[#AD7A21] font-bold px-2.5 py-1 rounded-md border border-amber-200">Legal Representative</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Họ và tên (*)</label>
                  <input type="text" required placeholder="NGUYỄN VĂN DŨNG" value={repForm.full_name || ""} onChange={(e) => setRepForm({ ...repForm, full_name: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số CCCD / Hộ chiếu (*)</label>
                  <input type="text" required placeholder="079085001234" value={repForm.cccd_id || ""} onChange={(e) => setRepForm({ ...repForm, cccd_id: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-[#1F4A3B] focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Chức vụ (*)</label>
                  <input type="text" placeholder="Chủ tịch HĐQT / Tổng Giám đốc" value={repForm.position || ""} onChange={(e) => setRepForm({ ...repForm, position: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số điện thoại di động</label>
                  <input type="text" placeholder="0909123456" value={repForm.phone || ""} onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Email</label>
                  <input type="email" placeholder="dung.nguyen@binhminh.vn" value={repForm.email || ""} onChange={(e) => setRepForm({ ...repForm, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Địa chỉ hiện tại</label>
                  <input type="text" placeholder="Q.1, TP. Hồ Chí Minh" value={repForm.current_address || ""} onChange={(e) => setRepForm({ ...repForm, current_address: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
              </div>
            </div>

            {/* BẢNG 3: NHÓM LIÊN QUAN DOANH NGHIỆP */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                    <Users className="w-5 h-5 text-indigo-600" />
                    3. Danh sách Nhóm Người & Tổ chức có Liên quan (Điều 136)
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Khai báo đầy đủ nhóm công ty mẹ, công ty con, người quản lý, cổ đông chi phối và quan hệ nhân thân.</p>
                </div>
                <button type="button" onClick={handleAddCorpRelated} className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition border border-indigo-200 cursor-pointer">
                  <Plus className="w-4 h-4" /> Thêm người/tổ chức liên quan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-mono uppercase">
                    <tr>
                      <th className="p-3 w-8">STT</th>
                      <th className="p-3 w-28">Loại</th>
                      <th className="p-3">Họ tên / Tên Tổ chức (*)</th>
                      <th className="p-3">CCCD / Mã số ĐKDN</th>
                      <th className="p-3 w-28">Quốc tịch (*)</th>
                      <th className="p-3 w-72">Mối quan hệ pháp lý chi tiết (*)</th>
                      <th className="p-3 w-28">Chức vụ</th>
                      <th className="p-3 w-20">Tỷ lệ (%)</th>
                      <th className="p-3 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {corpRelatedList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="p-2">
                          <select value={item.entity_type || "ORGANIZATION"} onChange={(e) => handleUpdateCorpRelated(idx, "entity_type", e.target.value)} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:bg-white outline-none">
                            <option value="ORGANIZATION">Tổ chức</option>
                            <option value="INDIVIDUAL">Cá nhân</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.name || ""} onChange={(e) => handleUpdateCorpRelated(idx, "name", e.target.value)} placeholder="Tên đối tượng" className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.identifier || ""} onChange={(e) => handleUpdateCorpRelated(idx, "identifier", e.target.value)} placeholder="MSDN hoặc CCCD" className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-gray-700 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.nationality || "Việt Nam"} onChange={(e) => handleUpdateCorpRelated(idx, "nationality", e.target.value)} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-700 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.specific_relationship || "Công ty mẹ"}
                            onChange={(e) => {
                              const val = e.target.value;
                              let foundGroup = "4. Nhóm Người quản lý, ĐDPL & Kiểm soát viên";
                              for (const g of CORP_RELATION_GROUPS) {
                                if (g.options.includes(val)) {
                                  foundGroup = g.group;
                                  break;
                                }
                              }
                              handleUpdateCorpRelated(idx, "specific_relationship", val);
                              handleUpdateCorpRelated(idx, "relationship_group", foundGroup);
                            }}
                            className="w-full px-2 py-2 bg-indigo-50/60 border border-indigo-200 rounded-lg text-[11px] font-semibold text-indigo-900 focus:bg-white outline-none"
                          >
                            {CORP_RELATION_GROUPS.map((grp) => (
                              <optgroup key={grp.group} label={grp.group}>
                                {grp.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                              </optgroup>
                            ))}
                          </select>
                          {item.specific_relationship === "Tùy chỉnh khác" && (
                            <input type="text" placeholder="Nhập cụ thể quan hệ..." value={item.custom_relationship || ""} onChange={(e) => handleUpdateCorpRelated(idx, "custom_relationship", e.target.value)} className="w-full mt-1.5 px-2 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] outline-none" />
                          )}
                        </td>
                        <td className="p-2">
                          <input type="text" placeholder="Chức danh" value={item.position || ""} onChange={(e) => handleUpdateCorpRelated(idx, "position", e.target.value)} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.ownership_ratio || "0%"} onChange={(e) => handleUpdateCorpRelated(idx, "ownership_ratio", e.target.value)} className="w-full px-1.5 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-center text-gray-800 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => handleRemoveCorpRelated(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-mono">
                Trạng thái: <span className="text-indigo-700 font-bold">SẴN SÀNG KIỂM TRA HẠN MỨC ĐIỀU 136 DOANH NGHIỆP</span>
              </div>
              <button
                disabled={isSaving}
                onClick={handleSaveEnterpriseToGraph}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-[#1F4A3B]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang nạp vào Neo4j...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu & Nạp vào Đồ thị DVBank</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : borrowerForm ? (
          /* 2. FORM HIỆU CHỈNH CÁ NHÂN */
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">MÃ HỒ SƠ: {appId}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">KHÁCH HÀNG CÁ NHÂN</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Bảng Dữ liệu Thẩm định & Chuẩn hóa Hồ sơ Cá nhân</h2>
                <p className="text-xs text-gray-500 mt-1">Đối soát các trường thông tin và chọn đúng mối quan hệ pháp lý theo quy định Điều 136.</p>
              </div>
              <button onClick={() => { setBorrowerForm(null); setSavedSuccessMsg(null); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer">
                <RotateCcw className="w-4 h-4" /> Quay lại tải file
              </button>
            </div>

            {savedSuccessMsg && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Đã nạp mạng lưới thực thể Cá nhân vào Neo4j thành công!</div>
                  <p className="text-emerald-700 mt-1">{savedSuccessMsg}</p>
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-bold">Cảnh báo bất thường từ tài liệu:</div>
                  <ul className="list-disc pl-4 mt-1 space-y-1">{warnings.map((w, idx) => (<li key={idx}>{w}</li>))}</ul>
                </div>
              </div>
            )}

            {/* BẢNG 1: CCCD */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                  <CreditCard className="w-5 h-5 text-[#1F4A3B]" />
                  1. Thông tin Định danh Cá nhân (CCCD)
                </div>
                <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-md border border-emerald-200">Thông tin Bắt buộc</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Họ và tên (*)</label>
                  <input type="text" required placeholder="ví dụ: NGUYỄN BÁCH KHOA" value={borrowerForm.full_name || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, full_name: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#1F4A3B] outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số định danh CCCD (12 số) (*)</label>
                  <input type="text" required placeholder="074205008021" value={borrowerForm.cccd_id || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, cccd_id: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-[#1F4A3B] focus:bg-white focus:ring-2 focus:ring-[#1F4A3B] outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Ngày sinh (DD/MM/YYYY)</label>
                  <input type="text" placeholder="02/06/2005" value={borrowerForm.dob || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, dob: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Giới tính</label>
                  <select value={borrowerForm.gender || "Nam"} onChange={(e) => setBorrowerForm({ ...borrowerForm, gender: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none">
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Quốc tịch</label>
                  <input type="text" value={borrowerForm.nationality || "Việt Nam"} onChange={(e) => setBorrowerForm({ ...borrowerForm, nationality: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Quê quán</label>
                  <input type="text" placeholder="Quảng Nam" value={borrowerForm.place_of_origin || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, place_of_origin: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Địa chỉ thường trú</label>
                  <input type="text" placeholder="93/98/9 Tổ 3 Kp 9 Phú Hòa, TP. Thủ Dầu Một, Bình Dương" value={borrowerForm.place_of_residence || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, place_of_residence: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Giá trị đến ngày</label>
                  <input type="text" placeholder="02/06/2030" value={borrowerForm.date_of_expiry || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, date_of_expiry: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
              </div>
            </div>

            {/* BẢNG 2: KHOẢN VAY */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                  <FileText className="w-5 h-5 text-[#AD7A21]" />
                  2. Nhu cầu Cấp Tín dụng & Liên hệ
                </div>
                <span className="text-[11px] font-mono bg-amber-50 text-[#AD7A21] font-bold px-2.5 py-1 rounded-md border border-amber-200">Phương án Vay</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Mục đích vay vốn (*)</label>
                  <input type="text" value={loanForm.purpose || ""} onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số tiền đề nghị vay (VND) (*)</label>
                  <input type="text" placeholder="500000000" value={loanForm.loan_amount || ""} onChange={(e) => setLoanForm({ ...loanForm, loan_amount: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono text-emerald-700 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Thời hạn vay (tháng)</label>
                  <input type="text" placeholder="36" value={loanForm.term_months || ""} onChange={(e) => setLoanForm({ ...loanForm, term_months: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Số điện thoại liên hệ</label>
                  <input type="text" placeholder="0912345678" value={borrowerForm.phone || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1.5 uppercase font-mono">Email</label>
                  <input type="email" placeholder="example@gmail.com" value={borrowerForm.email || ""} onChange={(e) => setBorrowerForm({ ...borrowerForm, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:bg-white outline-none" />
                </div>
              </div>
            </div>

            {/* BẢNG 3: NGƯỜI LIÊN QUAN */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-100 gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2.5 font-bold text-gray-900 text-base">
                    <Users className="w-5 h-5 text-indigo-600" />
                    3. Danh sách Nhóm Người có Liên quan (Điều 136)
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Chọn chính xác quan hệ pháp lý từ danh mục chuẩn để xây dựng cấu trúc đồ thị mạng lưới.</p>
                </div>
                <button type="button" onClick={handleAddIndivRelated} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition border border-indigo-200 cursor-pointer">
                  <Plus className="w-4 h-4" /> Thêm đối tượng
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-mono uppercase">
                    <tr>
                      <th className="p-3 w-10">STT</th>
                      <th className="p-3 w-28">Loại thực thể</th>
                      <th className="p-3">Họ tên / Tên Doanh nghiệp (*)</th>
                      <th className="p-3">Số CCCD / Mã số thuế</th>
                      <th className="p-3 w-56">Mối quan hệ pháp lý (*)</th>
                      <th className="p-3 w-24">Tỷ lệ vốn</th>
                      <th className="p-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {relatedList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="p-2">
                          <select value={item.entity_type || "PERSON"} onChange={(e) => handleUpdateIndivRelated(idx, "entity_type", e.target.value)} className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white outline-none">
                            <option value="PERSON">Cá nhân</option>
                            <option value="COMPANY">Doanh nghiệp</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.full_name || ""} onChange={(e) => handleUpdateIndivRelated(idx, "full_name", e.target.value)} placeholder="Nhập tên người / tổ chức" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-800 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.identifier || ""} onChange={(e) => handleUpdateIndivRelated(idx, "identifier", e.target.value)} placeholder="CCCD hoặc MST" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-gray-700 focus:bg-white outline-none" />
                        </td>
                        <td className="p-2">
                          <select value={item.relationship_type || "Vợ/chồng"} onChange={(e) => handleUpdateIndivRelated(idx, "relationship_type", e.target.value)} className="w-full px-2.5 py-2 bg-indigo-50/60 border border-indigo-200 rounded-lg text-indigo-900 font-semibold focus:bg-white outline-none">
                            {INDIVIDUAL_RELATIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                          {item.relationship_type === "Tùy chỉnh khác" && (
                            <input type="text" placeholder="Nhập quan hệ cụ thể..." value={item.custom_relationship || ""} onChange={(e) => handleUpdateIndivRelated(idx, "custom_relationship", e.target.value)} className="w-full mt-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-[11px] outline-none" />
                          )}
                        </td>
                        <td className="p-2">
                          <input type="text" value={item.ownership_ratio || "0%"} onChange={(e) => handleUpdateIndivRelated(idx, "ownership_ratio", e.target.value)} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-gray-800 text-center focus:bg-white outline-none" />
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => handleRemoveIndivRelated(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-mono">
                Trạng thái: <span className="text-indigo-700 font-bold">CHUẨN HÓA ĐỒ THỊ MẠNG LƯỚI CÁ NHÂN</span>
              </div>
              <button
                disabled={isSaving}
                onClick={handleSaveIndividualToGraph}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-[#1F4A3B]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang nạp vào Neo4j...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu & Nạp vào Đồ thị DVBank</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CHỌN LOẠI HÌNH & NỘP TÀI LIỆU */
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            {extractError && (
              <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl text-xs">
                <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Không thể bóc tách tự động: {extractError}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={handleStartUnderwriting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer">
                    <RefreshCw className="w-4 h-4" /> Thử trích xuất lại
                  </button>
                  <button onClick={handleEnterManualMode} className="px-4 py-2 bg-white border border-red-300 text-red-800 hover:bg-red-100/50 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer">
                    <Edit3 className="w-4 h-4" /> Chuyển sang Nhập liệu thủ công
                  </button>
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-mono font-bold text-[#AD7A21] uppercase tracking-wider">Bước 1: Phân loại đối tượng vay vốn</span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">Lựa chọn Loại hình Khách hàng</h2>
              
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCustomerType("INDIVIDUAL")}
                  className={`p-5 rounded-xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${customerType === "INDIVIDUAL" ? "border-[#1F4A3B] bg-[#1F4A3B]/5 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${customerType === "INDIVIDUAL" ? "bg-[#1F4A3B] text-white" : "bg-gray-100 text-gray-500"}`}><User className="w-6 h-6" /></div>
                  <div><div className="font-bold text-sm text-gray-900">Khách hàng Cá nhân</div><div className="text-xs text-gray-500 mt-0.5">Yêu cầu 3 tệp tài liệu PDF (Định danh CCCD)</div></div>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerType("ENTERPRISE")}
                  className={`p-5 rounded-xl border-2 flex items-center gap-4 transition cursor-pointer text-left ${customerType === "ENTERPRISE" ? "border-[#1F4A3B] bg-[#1F4A3B]/5 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${customerType === "ENTERPRISE" ? "bg-[#1F4A3B] text-white" : "bg-gray-100 text-gray-500"}`}><Building2 className="w-6 h-6" /></div>
                  <div><div className="font-bold text-sm text-gray-900">Khách hàng Doanh nghiệp / Tổ chức</div><div className="text-xs text-gray-500 mt-0.5">Yêu cầu 4 tệp tài liệu PDF (Định danh MSDN / MST)</div></div>
                </button>
              </div>
            </div>

            <hr className="my-8 border-gray-100" />

            <div>
              <span className="text-[11px] font-mono font-bold text-[#AD7A21] uppercase tracking-wider">Bước 2: Cung cấp tài liệu hồ sơ bắt buộc</span>
              <h3 className="text-lg font-bold text-gray-900 mt-1">
                {customerType === "INDIVIDUAL" ? "Bộ hồ sơ Khách hàng Cá nhân (3 tệp PDF)" : "Bộ hồ sơ Khách hàng Doanh nghiệp (4 tệp PDF)"}
              </h3>

              {customerType === "INDIVIDUAL" && (
                <div className="mt-6 space-y-4">
                  <FileItem label="1. Giấy đề nghị vay vốn" filenamePattern="giay_de_nghi_vay_von.pdf" file={individualFiles.loan_application} onSelect={(file) => setIndividualFiles({ ...individualFiles, loan_application: file })} />
                  <FileItem label="2. Căn cước công dân (CCCD)" filenamePattern="cccd.pdf" file={individualFiles.national_id} onSelect={(file) => setIndividualFiles({ ...individualFiles, national_id: file })} />
                  <FileItem label="3. Bảng kê khai người có liên quan" filenamePattern="bang_ke_khai_lien_quan.pdf" file={individualFiles.related_declaration} onSelect={(file) => setIndividualFiles({ ...individualFiles, related_declaration: file })} />
                </div>
              )}

              {customerType === "ENTERPRISE" && (
                <div className="mt-6 space-y-4">
                  <FileItem label="1. Giấy đề nghị cấp tín dụng Doanh nghiệp" filenamePattern="giay_de_nghi_cap_tin_dung_dn.pdf" file={enterpriseFiles.loan_application} onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, loan_application: file })} />
                  <FileItem label="2. CCCD Người đại diện theo pháp luật" filenamePattern="cccd_nguoi_dai_dien_phap_luat.pdf" file={enterpriseFiles.rep_national_id} onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, rep_national_id: file })} />
                  <FileItem label="3. Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD/ĐKMST)" filenamePattern="giay_chung_nhan_dang_ky_doanh_nghiep.pdf" file={enterpriseFiles.business_license} onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, business_license: file })} />
                  <FileItem label="4. Bảng kê khai người có liên quan (Biểu mẫu Doanh nghiệp)" filenamePattern="bang_ke_khai_nguoi_co_lien_quan_dn.pdf" file={enterpriseFiles.related_declaration} onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, related_declaration: file })} />
                </div>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleEnterManualMode}
                className="text-xs font-semibold text-gray-500 hover:text-[#1F4A3B] flex items-center gap-1.5 py-2 px-3 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> <span>Bỏ qua trích xuất & Tự nhập dữ liệu thủ công</span>
              </button>

              <button
                disabled={!(customerType === "INDIVIDUAL" ? isIndividualReady : isEnterpriseReady) || isProcessing}
                onClick={handleStartUnderwriting}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#1F4A3B] hover:bg-[#153429] text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-[#1F4A3B]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang trích xuất...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận & Bắt đầu thẩm định</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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