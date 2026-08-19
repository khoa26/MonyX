"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  RefreshCw, 
  Layers, 
  Eye, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CheckCircle2, 
  ShieldCheck,
  AlertTriangle,
  Building2,
  User,
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertOctagon,
  ArrowRight
} from "lucide-react";
import { UserSession } from "@/types";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

interface PipelineMonitorProps {
  session: UserSession;
  draftApplications: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function PipelineMonitor({ session, draftApplications, isLoading, onRefresh }: PipelineMonitorProps) {
  const [selectedDraftDetail, setSelectedDraftDetail] = useState<any>(null);
  const [isGraphConfirmed, setIsGraphConfirmed] = useState<boolean>(false);
  const [dismissNotes, setDismissNotes] = useState<{ [key: string]: string }>({});
  const networkContainerRef = useRef<HTMLDivElement>(null);

  // Reset trạng thái khi chọn hồ sơ khác
  useEffect(() => {
    setIsGraphConfirmed(false);
  }, [selectedDraftDetail?.application?.app_code]);

  // Vẽ đồ thị Vis.js kết hợp Cạnh Xanh (Direct) và Cạnh Vàng (Risk-based flags)
  useEffect(() => {
    if (selectedDraftDetail && networkContainerRef.current) {
      const nodesArray: any[] = [];
      const edgesArray: any[] = [];
      const addedNodes = new Set();

      const mainId = selectedDraftDetail.application.identifier;
      const mainName = selectedDraftDetail.application.borrower_name;

      // Starting Node
      nodesArray.push({
        id: mainId,
        label: `${mainName}\n(KH VAY CHÍNH)`,
        color: { background: "#4C1D95", border: "#2E1065", highlight: { background: "#6D28D9", border: "#4C1D95" } },
        font: { color: "#ffffff", bold: true },
        shape: "box",
        margin: 12,
        borderRadius: 12
      });
      addedNodes.add(mainId);

      // 1. Nạp các Cạnh Xanh (Mandatory)
      selectedDraftDetail.relationships?.forEach((rel: any, idx: number) => {
        const sProps = rel.source_props || {};
        const tProps = rel.target_props || {};
        const rProps = rel.relation_props || {};

        const sId = sProps.cccd || sProps.tax_code || mainId;
        const sName = sProps.full_name || sProps.name || "Chính";
        const tId = tProps.cccd || tProps.tax_code || `target-${idx}`;
        const tName = tProps.full_name || tProps.name || "Liên quan";

        if (!addedNodes.has(sId)) {
          nodesArray.push({ id: sId, label: sName, shape: "box", color: { background: "#DDD6FE", border: "#7C3AED" } });
          addedNodes.add(sId);
        }
        if (!addedNodes.has(tId)) {
          nodesArray.push({ id: tId, label: tName, shape: "box", color: { background: "#EDE9FE", border: "#6D28D9" } });
          addedNodes.add(tId);
        }

        edgesArray.push({
          id: `mandatory-edge-${idx}`,
          from: sId,
          to: tId,
          label: `${rProps.relation_subtype || rel.relation_type} (Điểm ${rProps.relation_point || 'd'})`,
          color: { color: "#059669", highlight: "#047857" },
          width: 2.5,
          arrows: "to",
          font: { size: 10, align: "middle", background: "#ffffff" }
        });
      });

      // 2. Nạp các Cạnh Vàng / Cam (Risk-Based từ Rule Engine)
      selectedDraftDetail.risk_based_flags?.forEach((flag: any, idx: number) => {
        const sId = flag.source_id;
        const tId = flag.target_id;

        if (!addedNodes.has(sId)) {
          nodesArray.push({ id: sId, label: flag.source_name, shape: "box", color: { background: "#FEF3C7", border: "#D97706" } });
          addedNodes.add(sId);
        }
        if (!addedNodes.has(tId)) {
          nodesArray.push({ id: tId, label: flag.target_name, shape: "box", color: { background: "#FEF3C7", border: "#D97706" } });
          addedNodes.add(tId);
        }

        edgesArray.push({
          id: `risk-edge-${idx}`,
          from: sId,
          to: tId,
          label: `CẢNH BÁO ĐIỂM G: ${flag.rule_id}`,
          color: { color: "#D97706", highlight: "#B45309" },
          width: 3,
          dashes: [6, 4],
          arrows: "to;from",
          font: { size: 10, color: "#92400E", background: "#FFFBEB", bold: true }
        });
      });

      const data = {
        nodes: new DataSet(nodesArray),
        edges: new DataSet(edgesArray),
      };

      const options = {
        physics: { barnesHut: { gravitationalConstant: -3500, centralGravity: 0.3, springLength: 140 } },
        interaction: { hover: true },
      };

      const network = new Network(networkContainerRef.current, data, options);
      return () => {
        network.destroy();
      };
    }
  }, [selectedDraftDetail]);

  const handleReviewRelationship = async (id1: string, id2: string, status: "confirmed_related" | "dismissed", note?: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/credit/draft-applications/${selectedDraftDetail.application.app_code}/review-relationship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          relationship_id: `${id1}-${id2}`,
          entity_id_1: id1,
          entity_id_2: id2,
          review_status: status,
          review_note: note || ""
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Thao tác thất bại");

      alert(data.message);
      const refreshRes = await fetch(`http://localhost:8000/api/v1/credit/draft-applications/${selectedDraftDetail.application.app_code}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setSelectedDraftDetail(await refreshRes.json());
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleMakeDecision = async (appCode: string, decision: "APPROVED" | "REJECTED") => {
    let syncToMaster = false;
    if (decision === "APPROVED") {
      syncToMaster = window.confirm(
        "Bạn có muốn ĐỒNG BỘ và CHUYỂN TOÀN BỘ hồ sơ tín dụng, người vay và các thực thể liên quan này vào CSDL CHÍNH THỨC (Master Database) không?"
      );
    }

    try {
      const res = await fetch(`http://localhost:8000/api/v1/credit/draft-applications/${appCode}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ decision, sync_to_master: syncToMaster }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Thao tác thất bại");

      alert(data.message);
      setSelectedDraftDetail(null);
      onRefresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  if (selectedDraftDetail) {
    const analytics = selectedDraftDetail.exposure_analytics;
    const riskFlags = selectedDraftDetail.risk_based_flags || [];
    const room = analytics?.room_analysis;
    const statutory = analytics?.statutory_schedule;

    return (
      <div className="space-y-6">
        {/* TOP BAR */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs flex items-center justify-between">
          <button
            onClick={() => setSelectedDraftDetail(null)}
            className="flex items-center gap-2 text-xs font-bold text-purple-900 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-2xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-purple-100 text-purple-900 px-3.5 py-1.5 rounded-full border border-purple-200">
              MÃ TÍN DỤNG: {selectedDraftDetail.application.loan_id}
            </span>
            <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-full">
              MÃ HỒ SƠ: {selectedDraftDetail.application.app_code}
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* GIAI ĐOẠN 1: XÁC ĐỊNH MẠNG LƯỚI ĐỒ THỊ & REVIEW CẠNH VÀNG */}
        {/* =================================================================== */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-purple-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#5B21B6]" />
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Giai đoạn 1: Sơ đồ Mạng lưới Quan hệ (Related Party Graph)
                </h3>
                <p className="text-xs text-gray-400">
                  Đối soát các cạnh quan hệ và xử lý cảnh báo Điểm g trước khi hoàn thành đồ thị.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Cạnh Xanh (Mandatory Điểm a,b,c,d,đ,e)
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Cạnh Vàng (Risk-Based Điểm g)
              </span>
            </div>
          </div>

          <div ref={networkContainerRef} className="w-full h-[400px] bg-purple-50/20 border border-purple-100 rounded-2xl" />

          {/* CẢNH BÁO RISK-BASED (CẠNH VÀNG) */}
          {riskFlags.length > 0 && (
            <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Phát hiện {riskFlags.length} Cảnh báo Quan hệ Rủi ro Tiềm ẩn (Điểm g - Cần Review)</span>
                </div>
                <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Cần xử lý trước khi tính hạn mức
                </span>
              </div>

              <div className="space-y-2.5">
                {riskFlags.map((flag: any, idx: number) => {
                  const id1 = flag.source_id;
                  const id2 = flag.target_id;
                  const noteKey = `${id1}-${id2}`;

                  return (
                    <div key={idx} className="p-3.5 bg-white rounded-xl border border-amber-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono text-[10px]">
                            {flag.rule_id}
                          </span>
                          <span>{flag.rule_name}</span>
                        </div>
                        <p className="text-gray-600 text-[11px]">{flag.reason_summary}</p>
                      </div>

                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        <input
                          type="text"
                          placeholder="Lý do nếu bác bỏ..."
                          value={dismissNotes[noteKey] || ""}
                          onChange={(e) => setDismissNotes({ ...dismissNotes, [noteKey]: e.target.value })}
                          className="px-2.5 py-1.5 bg-gray-50 border rounded-lg text-[11px] w-48 outline-none"
                        />
                        <button
                          onClick={() => handleReviewRelationship(id1, id2, "confirmed_related")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition"
                        >
                          Xác nhận liên quan
                        </button>
                        <button
                          onClick={() => {
                            const note = dismissNotes[noteKey];
                            if (!note) {
                              alert("Vui lòng nhập lý do (review_note) khi bác bỏ quan hệ.");
                              return;
                            }
                            handleReviewRelationship(id1, id2, "dismissed", note);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition"
                        >
                          Bác bỏ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NÚT XÁC NHẬN HOÀN THÀNH ĐỒ THỊ */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsGraphConfirmed(true)}
              className={`px-7 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md ${
                isGraphConfirmed
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                  : "bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white hover:from-[#3B1878] hover:to-[#5B21B6]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isGraphConfirmed ? "Đồ thị Đã Xác nhận Hoàn tất" : "Xác nhận & Hoàn thành Đồ thị Liên quan"}
              </span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* GIAI ĐOẠN 2: PHÂN TÍCH TOÀN BỘ DƯ NỢ & HẠN MỨC ĐIỀU 136 */}
        {/* =================================================================== */}
        {isGraphConfirmed && analytics && (
          <div className="space-y-6 animate-fadeIn">
            {/* THÔNG TIN LỘ TRÌNH & VỐN TỰ CÓ */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/20 text-purple-200 font-bold">
                    LỘ TRÌNH ĐIỀU 136: NĂM {statutory?.year_label}
                  </span>
                  <span className="text-xs text-purple-200">{statutory?.phase}</span>
                </div>
                <div className="text-xl font-black">{analytics.bank_name}</div>
              </div>
              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <div className="text-purple-300 text-[10px] uppercase font-bold">Vốn Tự Có Ngân Hàng</div>
                  <div className="text-lg font-black text-white">
                    {Number(analytics.bank_equity_capital / 1e9).toLocaleString()} Tỷ VNĐ
                  </div>
                </div>
                <div>
                  <div className="text-purple-300 text-[10px] uppercase font-bold">Trần Tín Dụng Áp Dụng</div>
                  <div className="text-sm font-bold text-amber-300">
                    Đơn lẻ: {statutory?.single_limit_ratio * 100}% | Nhóm: {statutory?.group_limit_ratio * 100}%
                  </div>
                </div>
              </div>
            </div>

            {/* THẺ ĐỐI SOÁT HẠN MỨC & ROOM TÍN DỤNG (MÀU XANH LÁ HOẶC ĐỎ) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Thẻ 1: Khách hàng Đơn lẻ */}
              <div className={`rounded-3xl p-6 border shadow-xs space-y-3 ${
                analytics.single_borrower.is_exceeded ? "bg-red-50/60 border-red-200" : "bg-white border-purple-100"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-600 uppercase font-mono">
                    1. Khách hàng Đơn lẻ (Trần ≤ {analytics.single_borrower.limit_ratio_allowed_pct}%)
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    analytics.single_borrower.is_exceeded ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {analytics.single_borrower.is_exceeded ? "VƯỢT TRẦN ĐƠN LẺ" : "TRONG HẠN MỨC"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    analytics.single_borrower.is_exceeded ? "text-red-700" : "text-purple-900"
                  }`}>
                    {analytics.single_borrower.actual_ratio_pct}%
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    / {analytics.single_borrower.limit_ratio_allowed_pct}% Vốn tự có
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${
                      analytics.single_borrower.is_exceeded ? 'bg-red-600' : 'bg-[#5B21B6]'
                    }`}
                    style={{ width: `${Math.min((analytics.single_borrower.actual_ratio_pct / analytics.single_borrower.limit_ratio_allowed_pct) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 font-mono flex justify-between pt-1">
                  <span>Dư nợ cũ: {Number(analytics.single_borrower.existing_debt / 1e9).toFixed(1)} Tỷ</span>
                  <span className="font-bold text-purple-950">
                    Tổng sau vay: {Number(analytics.single_borrower.total_exposure / 1e9).toFixed(1)} Tỷ / Trần {Number(analytics.single_borrower.limit_amount / 1e9).toFixed(1)} Tỷ
                  </span>
                </div>
              </div>

              {/* Thẻ 2: Nhóm Khách hàng Liên quan */}
              <div className={`rounded-3xl p-6 border shadow-xs space-y-3 ${
                analytics.connected_group.is_exceeded ? "bg-red-50/60 border-red-200" : "bg-white border-purple-100"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-600 uppercase font-mono">
                    2. Nhóm Liên quan ({analytics.connected_group.member_count} thành viên - Trần ≤ {analytics.connected_group.limit_ratio_allowed_pct}%)
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    analytics.connected_group.is_exceeded ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {analytics.connected_group.is_exceeded ? "VƯỢT TRẦN NHÓM" : "TRONG HẠN MỨC"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    analytics.connected_group.is_exceeded ? "text-red-700" : "text-purple-900"
                  }`}>
                    {analytics.connected_group.actual_ratio_pct}%
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    / {analytics.connected_group.limit_ratio_allowed_pct}% Vốn tự có
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${
                      analytics.connected_group.is_exceeded ? 'bg-red-600' : 'bg-[#7C3AED]'
                    }`}
                    style={{ width: `${Math.min((analytics.connected_group.actual_ratio_pct / analytics.connected_group.limit_ratio_allowed_pct) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 font-mono flex justify-between pt-1">
                  <span>Dư nợ nhóm cũ: {Number(analytics.connected_group.existing_group_debt / 1e9).toFixed(1)} Tỷ</span>
                  <span className="font-bold text-purple-950">
                    Tổng sau vay: {Number(analytics.connected_group.total_group_exposure / 1e9).toFixed(1)} Tỷ / Trần {Number(analytics.connected_group.limit_amount / 1e9).toFixed(1)} Tỷ
                  </span>
                </div>
              </div>
            </div>

            {/* BẢNG KẾT LUẬN ROOM TÍN DỤNG & CẢNH BÁO MÀU SẮC TRỰC QUAN */}
            <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              room?.is_exceeded ? "bg-red-50 border-red-300 text-red-950" : "bg-emerald-50 border-emerald-300 text-emerald-950"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-black text-base">
                  {room?.is_exceeded ? (
                    <AlertOctagon className="w-6 h-6 text-red-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  )}
                  <span>
                    {room?.is_exceeded
                      ? "CẢNH BÁO: KHOẢN VAY VƯỢT HẠN MỨC AN TOÀN TÍN DỤNG ĐIỀU 136"
                      : "XÁC NHẬN: KHOẢN VAY ĐỦ ĐIỀU KIỆN HẠN MỨC TÍN DỤNG ĐIỀU 136"}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  room?.is_exceeded ? "bg-red-200 text-red-900" : "bg-emerald-200 text-emerald-900"
                }`}>
                  {analytics.compliance_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                {/* Khung bên trái: Khoản vay còn dư HOẶC Phần vượt trần */}
                <div className="p-4 bg-white/80 rounded-2xl border border-current/10 space-y-1">
                  <div className="text-gray-500 font-bold uppercase font-mono text-[10px]">
                    {room?.is_exceeded ? "Phần Dư Nợ Vượt Ngưỡng (Bắt buộc giảm)" : "Khoản Vay Còn Dư Có Thể Tăng Thêm"}
                  </div>
                  <div className={`text-2xl font-black font-mono ${room?.is_exceeded ? "text-red-600" : "text-emerald-700"}`}>
                    {room?.is_exceeded ? (
                      <span>- {Number(room.exceeded_amount).toLocaleString()} VNĐ</span>
                    ) : room?.remaining_room_after_loan === 0 ? (
                      <span>0 VNĐ (Vừa chạm đúng trần)</span>
                    ) : (
                      <span>+ {Number(room.remaining_room_after_loan).toLocaleString()} VNĐ</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {room?.is_exceeded
                      ? `Tổng mức cấp tín dụng vượt quá giới hạn Điều 136 là ${Number(room.exceeded_amount / 1e9).toFixed(1)} Tỷ VNĐ.`
                      : `Hạn mức room tín dụng khả dụng còn lại của nhóm sau khi giải ngân khoản vay này.`}
                  </p>
                </div>

                {/* Khung bên phải: Số tiền tối đa hồ sơ có thể vay */}
                <div className="p-4 bg-white/80 rounded-2xl border border-current/10 space-y-1">
                  <div className="text-gray-500 font-bold uppercase font-mono text-[10px]">
                    Hạn Mức Tối Đa Hồ Sơ Này Có Thể Được Cấp
                  </div>
                  <div className="text-2xl font-black font-mono text-purple-900">
                    {Number(room?.max_allowable_loan).toLocaleString()} VNĐ
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Số tiền tối đa mà ngân hàng có thể phê duyệt cho hồ sơ hiện tại mà không làm vượt trần đơn lẻ hoặc trần nhóm.
                  </p>
                </div>
              </div>
            </div>

            {/* DANH SÁCH CHI TIẾT DƯ NỢ TỪNG THÀNH VIÊN TRONG ĐỒ THỊ */}
            <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase font-mono">
                  <TrendingUp className="w-4 h-4 text-[#5B21B6]" />
                  <span>Danh sách Dư nợ Hiện tại của {analytics.connected_group.member_count} Thành viên trong Đồ thị</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  Tổng dư nợ nhóm cũ: <b className="text-purple-950">{Number(analytics.connected_group.existing_group_debt).toLocaleString()} VNĐ</b>
                </span>
              </div>

              <div className="overflow-x-auto border border-purple-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
                    <tr>
                      <th className="p-3.5 font-bold">STT</th>
                      <th className="p-3.5 font-bold">Loại</th>
                      <th className="p-3.5 font-bold">Mã Định Danh</th>
                      <th className="p-3.5 font-bold">Tên Thành Viên</th>
                      <th className="p-3.5 font-bold text-right">Dư Nợ Hiện Tại (VND)</th>
                      <th className="p-3.5 font-bold text-center">Vai Trò Hồ Sơ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium">
                    {analytics.connected_group.members.map((m: any, idx: number) => {
                      const isPrimary = m.member_id === selectedDraftDetail.application.identifier;
                      return (
                        <tr key={idx} className={`hover:bg-purple-50/30 transition ${isPrimary ? "bg-purple-50/50" : ""}`}>
                          <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              m.member_type === "Company" ? "bg-blue-50 text-blue-700" : "bg-purple-100 text-purple-800"
                            }`}>
                              {m.member_type === "Company" ? "Doanh nghiệp" : "Cá nhân"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-700">{m.member_id}</td>
                          <td className="p-3 font-bold text-gray-900">{m.member_name}</td>
                          <td className="p-3 font-mono font-bold text-right text-purple-950">
                            {Number(m.active_loan_balance).toLocaleString()} VNĐ
                          </td>
                          <td className="p-3 text-center">
                            {isPrimary ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5B21B6] text-white">
                                Bên vay chính
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">Người liên quan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* THANH PHÊ DUYỆT CUỐI CÙNG */}
            <div className="p-6 bg-white rounded-3xl border border-purple-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-mono">
                Quyết định tín dụng căn cứ theo: <b className="text-purple-950">Điều 136 Luật Các TCTD (Năm 2026)</b>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleMakeDecision(selectedDraftDetail.application.app_code, "REJECTED")}
                  className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  Từ chối cấp tín dụng (REJECT)
                </button>
                <button
                  disabled={room?.is_exceeded}
                  onClick={() => handleMakeDecision(selectedDraftDetail.application.app_code, "APPROVED")}
                  className={`px-8 py-3 text-xs font-bold rounded-2xl transition shadow-lg flex items-center gap-2 cursor-pointer ${
                    room?.is_exceeded
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white shadow-purple-900/20"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt & Đồng bộ Master DB</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-purple-50 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2 border border-purple-100">
            <Sparkles className="w-3 h-3" />
            <span>Sandbox Underwriting Pipeline</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hồ sơ Tín dụng Tạm thời</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Danh sách các khoản vay đang được phân tích quan hệ thực thể trước khi nạp chính thức.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-2xl text-xs font-bold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {draftApplications.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Chưa có hồ sơ tín dụng nào trong Sandbox</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Hãy chọn "Tạo Khoản vay Mới" ở thanh menu bên trái để bắt đầu tiếp nhận hồ sơ đầu tiên.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-purple-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
              <tr>
                <th className="p-4 font-bold">Mã Tín dụng</th>
                <th className="p-4 font-bold">Loại hình</th>
                <th className="p-4 font-bold">Bên vay vốn</th>
                <th className="p-4 font-bold">Định danh</th>
                <th className="p-4 font-bold">Số tiền đề nghị</th>
                <th className="p-4 font-bold">Thời hạn</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 font-medium">
              {draftApplications.map((app, idx) => (
                <tr key={idx} className="hover:bg-purple-50/30 transition">
                  <td className="p-4 font-mono font-bold text-[#5B21B6]">{app.loan_id}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                      app.customer_type === "INDIVIDUAL" ? "bg-blue-50 text-blue-700" : "bg-purple-100 text-purple-800"
                    }`}>
                      {app.customer_type === "INDIVIDUAL" ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      <span>{app.customer_type === "INDIVIDUAL" ? "Cá nhân" : "Doanh nghiệp"}</span>
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-900">{app.borrower_name}</td>
                  <td className="p-4 font-mono text-gray-600">{app.identifier}</td>
                  <td className="p-4 font-mono font-bold text-purple-900">{Number(app.loan_amount).toLocaleString()} VND</td>
                  <td className="p-4 font-medium">{app.term_months} tháng</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                      app.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : app.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {app.status === "APPROVED" && <CheckCircle className="w-3 h-3" />}
                      {app.status === "REJECTED" && <XCircle className="w-3 h-3" />}
                      {app.status === "PENDING" && <Clock className="w-3 h-3" />}
                      <span>{app.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={async () => {
                        const res = await fetch(`http://localhost:8000/api/v1/credit/draft-applications/${app.app_code}`, {
                          headers: { Authorization: `Bearer ${session.access_token}` }
                        });
                        const data = await res.json();
                        setSelectedDraftDetail(data);
                      }}
                      className="px-3.5 py-1.5 bg-purple-50 hover:bg-[#5B21B6] text-[#5B21B6] hover:text-white rounded-xl transition font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Thẩm định</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}