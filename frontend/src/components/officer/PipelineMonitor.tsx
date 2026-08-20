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
  CreditCard,
  Landmark,
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Edit3,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
  ChevronDown,
  ChevronUp
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
  const [relationFilter, setRelationFilter] = useState<string>("ALL");
  const [layoutMode, setLayoutMode] = useState<"FORCE" | "HIERARCHICAL">("HIERARCHICAL");
  const [showLegend, setShowLegend] = useState<boolean>(false); // Mặc định ẩn ghi chú để không che khuất đồ thị
  
  const networkContainerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  useEffect(() => {
    setIsGraphConfirmed(false);
  }, [selectedDraftDetail?.application?.app_code]);

  // Hàm chuẩn hóa hiển thị dư nợ (hỗ trợ cả dạng 850 tỷ lẫn 850,000,000,000)
  const formatLoanDisplay = (balance: any) => {
    const num = Number(balance) || 0;
    if (num === 0) return "0 Tỷ VNĐ";
    if (num >= 1e9) return `${(num / 1e9).toLocaleString()} Tỷ VNĐ`;
    return `${num.toLocaleString()} Tỷ VNĐ`;
  };

  const formatLoanEdge = (balance: any) => {
    const num = Number(balance) || 0;
    if (num === 0) return "0 Tỷ";
    if (num >= 1e9) return `${(num / 1e9).toLocaleString()} Tỷ`;
    return `${num.toLocaleString()} Tỷ`;
  };

  // Vẽ đồ thị Vis.js phân tầng chuẩn 5 Level
  useEffect(() => {
    if (selectedDraftDetail && networkContainerRef.current) {
      const nodesArray: any[] = [];
      const edgesArray: any[] = [];
      const addedNodes = new Set<string>();

      const mainId = selectedDraftDetail.application.identifier;
      const mainName = selectedDraftDetail.application.borrower_name;
      const isIndiv = selectedDraftDetail.application.customer_type === "INDIVIDUAL";

      // 1. Starting Node (Bên Vay Chính) - Level 0 (Đỉnh cao nhất)
      nodesArray.push({
        id: mainId,
        label: `👑 ${mainName}\n(BÊN VAY CHÍNH)`,
        color: { 
          background: isIndiv ? "#4C1D95" : "#065F46", 
          border: isIndiv ? "#2E1065" : "#047857", 
          highlight: { background: "#7C3AED", border: "#4C1D95" } 
        },
        font: { color: "#ffffff", bold: true, size: 12 },
        shape: "box",
        margin: 12,
        borderRadius: 14,
        level: 0
      });
      addedNodes.add(mainId);

      // Map mã định danh P001, C001
      const memberCodeMap: Record<string, string> = {};
      selectedDraftDetail.exposure_analytics?.connected_group?.members?.forEach((m: any) => {
        memberCodeMap[m.member_id] = m.code;
      });

      // 2. Nạp Cạnh Quan hệ Thực thể (:FAMILY, :RELATED_TO, :LEGAL_REPRESENTATIVE)
      selectedDraftDetail.relationships?.forEach((rel: any, idx: number) => {
        const sProps = rel.source_props || {};
        const tProps = rel.target_props || {};
        const rProps = rel.relation_props || {};

        const sId = sProps.cccd || sProps.tax_code;
        const sName = sProps.full_name || sProps.name;
        const isSourcePerson = !!sProps.cccd;

        const tId = tProps.cccd || tProps.tax_code;
        const tName = tProps.full_name || tProps.name;
        const isTargetPerson = !!tProps.cccd;

        // Bỏ qua các node rác
        if (!sId || !tId || !sName || !tName) return;

        if (relationFilter === "FAMILY" && rel.relation_type !== "FAMILY") return;
        if (relationFilter === "OWNERSHIP" && (rProps.relation_point !== "c" && rProps.relation_point !== "a")) return;
        if (relationFilter === "MANAGEMENT" && rProps.relation_point !== "b") return;

        // Xác định Level chuẩn: Cá nhân = Level 1, Doanh nghiệp = Level 2
        if (!addedNodes.has(sId)) {
          const sCode = memberCodeMap[sId] ? `${memberCodeMap[sId]}\n` : "";
          const sLevel = sId === mainId ? 0 : (isSourcePerson ? 1 : 2);

          nodesArray.push({
            id: sId,
            label: `${isSourcePerson ? '👤 ' : '🏢 '}${sCode}${sName}`,
            shape: "box",
            color: isSourcePerson 
              ? { background: "#EDE9FE", border: "#7C3AED", highlight: { background: "#DDD6FE", border: "#6D28D9" } } 
              : { background: "#D1FAE5", border: "#059669", highlight: { background: "#A7F3D0", border: "#047857" } },
            font: { color: isSourcePerson ? "#4C1D95" : "#065F46", bold: true, size: 11 },
            borderRadius: 10,
            margin: 8,
            level: sLevel
          });
          addedNodes.add(sId);
        }

        if (!addedNodes.has(tId)) {
          const tCode = memberCodeMap[tId] ? `${memberCodeMap[tId]}\n` : "";
          const tLevel = tId === mainId ? 0 : (isTargetPerson ? 1 : 2);

          nodesArray.push({
            id: tId,
            label: `${isTargetPerson ? '👤 ' : '🏢 '}${tCode}${tName}`,
            shape: "box",
            color: isTargetPerson 
              ? { background: "#EDE9FE", border: "#7C3AED", highlight: { background: "#DDD6FE", border: "#6D28D9" } } 
              : { background: "#D1FAE5", border: "#059669", highlight: { background: "#A7F3D0", border: "#047857" } },
            font: { color: isTargetPerson ? "#4C1D95" : "#065F46", bold: true, size: 11 },
            borderRadius: 10,
            margin: 8,
            level: tLevel
          });
          addedNodes.add(tId);
        }

        // Tự động chuẩn hóa nhãn quan hệ rõ ràng 100% (Không bị trống)
        let edgeColor = "#059669";
        let edgeLabel = "";

        if (rel.relation_type === "FAMILY" || rProps.relation_point === "d") {
          edgeColor = "#7C3AED";
          edgeLabel = rProps.relationship || rProps.relation_subtype || "Quan hệ Gia đình (Điểm d)";
        } else if (rProps.relation_point === "b") {
          edgeColor = "#2563EB";
          edgeLabel = rProps.position || rProps.relation_subtype || "Quản lý / Điều hành (Điểm b)";
        } else if (rProps.relation_point === "c") {
          edgeColor = "#059669";
          edgeLabel = rProps.relation_subtype || "Cổ đông sở hữu (Điểm c)";
        } else if (rProps.relation_point === "a") {
          edgeColor = "#059669";
          edgeLabel = rProps.relation_subtype || "Công ty mẹ / con (Điểm a)";
        } else if (rProps.relation_point === "e") {
          edgeColor = "#2563EB";
          edgeLabel = rProps.relation_subtype || "Đại diện phần vốn (Điểm e)";
        } else {
          edgeLabel = rProps.relation_subtype || rProps.relationship || rel.relation_type || "Người liên quan";
        }

        if (rProps.ownership_ratio && rProps.ownership_ratio !== "–" && rProps.ownership_ratio !== "0%" && !edgeLabel.includes(rProps.ownership_ratio)) {
          edgeLabel += ` (${rProps.ownership_ratio})`;
        }

        // Tạo đường nối
        const isSameLevel = (isSourcePerson && isTargetPerson);
        edgesArray.push({
          id: `mandatory-edge-${idx}`,
          from: sId,
          to: tId,
          label: edgeLabel,
          color: { color: edgeColor, highlight: edgeColor, hover: edgeColor },
          width: 2,
          arrows: rel.relation_type === "FAMILY" ? "to;from" : "to",
          font: { 
            size: 10, 
            align: "horizontal", // Luôn hiển thị chữ nằm ngang dễ đọc
            background: "#ffffff", 
            strokeWidth: 3, 
            strokeColor: "#ffffff",
            color: edgeColor, 
            bold: true 
          },
          smooth: isSameLevel
            ? { enabled: true, type: "curvedCW", roundness: 0.3 } // Uốn cong các quan hệ gia đình cùng hàng
            : { enabled: true, type: "cubicBezier", forceDirection: "vertical", roundness: 0.35 }
        });
      });

      // 3. Nạp Cạnh Vàng Điểm g (Risk-Based)
      selectedDraftDetail.risk_based_flags?.forEach((flag: any, idx: number) => {
        const sId = flag.source_id;
        const tId = flag.target_id;

        if (relationFilter !== "ALL" && relationFilter !== "RISK") return;

        if (!addedNodes.has(sId)) {
          nodesArray.push({ id: sId, label: flag.source_name, shape: "box", color: { background: "#FEF3C7", border: "#D97706" }, margin: 8, level: 2 });
          addedNodes.add(sId);
        }
        if (!addedNodes.has(tId)) {
          nodesArray.push({ id: tId, label: flag.target_name, shape: "box", color: { background: "#FEF3C7", border: "#D97706" }, margin: 8, level: 2 });
          addedNodes.add(tId);
        }

        edgesArray.push({
          id: `risk-edge-${idx}`,
          from: sId,
          to: tId,
          label: `⚠️ ${flag.rule_id}`,
          color: { color: "#D97706", highlight: "#B45309" },
          width: 2.5,
          dashes: [6, 4],
          arrows: "to;from",
          font: { size: 9, color: "#92400E", background: "#FFFBEB", bold: true, align: "horizontal" },
          smooth: { enabled: true, type: "curvedCW", roundness: 0.25 }
        });
      });

      // 4. Nạp Node Khoản Vay (:Loan) - Level 3 & Node Ngân Hàng (:Bank) - Level 4
      if (relationFilter === "ALL" || relationFilter === "LOANS") {
        const bankNodeId = "BANK_DVBANK";
        let hasBankNode = false;

        selectedDraftDetail.active_loans?.forEach((ln: any, idx: number) => {
          const loanNodeId = `LOAN_${ln.loan_id}`;
          const balanceFormatted = formatLoanDisplay(ln.balance);
          const edgeBalanceFormatted = formatLoanEdge(ln.balance);

          if (!addedNodes.has(loanNodeId)) {
            nodesArray.push({
              id: loanNodeId,
              label: `📄 ${ln.loan_id}\n${balanceFormatted}`,
              shape: "box",
              color: { background: "#E0F2FE", border: "#0284C7", highlight: { background: "#BAE6FD", border: "#0369A1" } },
              font: { color: "#0369A1", bold: true, size: 10, face: "monospace" },
              borderRadius: 8,
              margin: 6,
              level: 3
            });
            addedNodes.add(loanNodeId);
          }

          edgesArray.push({
            id: `borrowed-edge-${idx}`,
            from: ln.borrower_id,
            to: loanNodeId,
            label: edgeBalanceFormatted,
            color: { color: "#0284C7" },
            width: 1.5,
            arrows: "to",
            font: { size: 9, color: "#0369A1", background: "#F0F9FF", strokeWidth: 2, strokeColor: "#F0F9FF", align: "horizontal" },
            smooth: { enabled: true, type: "cubicBezier", forceDirection: "vertical", roundness: 0.3 }
          });

          if (!hasBankNode) {
            nodesArray.push({
              id: bankNodeId,
              label: "🏦 DVBank\n(Hệ thống)",
              shape: "box",
              color: { background: "#1E3A8A", border: "#1E40AF", highlight: { background: "#1D4ED8", border: "#1E3A8A" } },
              font: { color: "#ffffff", bold: true, size: 11 },
              borderRadius: 12,
              margin: 10,
              level: 4
            });
            addedNodes.add(bankNodeId);
            hasBankNode = true;
          }

          edgesArray.push({
            id: `from-bank-edge-${idx}`,
            from: loanNodeId,
            to: bankNodeId,
            color: { color: "#94A3B8" },
            width: 1,
            arrows: "to",
            smooth: { enabled: true, type: "cubicBezier", forceDirection: "vertical", roundness: 0.2 }
          });
        });
      }

      const data = {
        nodes: new DataSet(nodesArray),
        edges: new DataSet(edgesArray),
      };

      const options: any = {
        layout: {
          hierarchical: layoutMode === "HIERARCHICAL" ? {
            enabled: true,
            direction: "UD",
            sortMethod: "directed",
            levelSeparation: 150,
            nodeSpacing: 240,
            treeSpacing: 260,
            blockShifting: true,
            edgeMinimization: true,
            parentCentralization: true
          } : { enabled: false }
        },
        physics: layoutMode === "FORCE" ? {
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -140,
            centralGravity: 0.015,
            springLength: 190,
            springConstant: 0.08,
            damping: 0.4,
            avoidOverlap: 1.0
          },
          stabilization: { iterations: 200 }
        } : false,
        interaction: { 
          hover: true, 
          tooltipDelay: 150, 
          navigationButtons: false,
          keyboard: false
        },
      };

      if (networkRef.current) networkRef.current.destroy();
      networkRef.current = new Network(networkContainerRef.current, data, options);

      // Tự động căn giữa đồ thị
      setTimeout(() => {
        if (networkRef.current) {
          networkRef.current.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } } as any);
        }
      }, 350);

      return () => {
        if (networkRef.current) networkRef.current.destroy();
      };
    }
  }, [selectedDraftDetail, relationFilter, layoutMode]);

  // Các hàm điều khiển Zoom & Fit
  const handleZoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 1.25, animation: { duration: 250 } } as any);
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 0.8, animation: { duration: 250 } } as any);
    }
  };

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } } as any);
    }
  };

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
    const topExposures = analytics?.top_exposures || [];
    const maxBalance = topExposures.length > 0 ? topExposures[0].balance : 1;
    const membersList = analytics?.connected_group?.members || [];

    return (
      <div className="space-y-6">
        {/* TOP BAR */}
        <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-xs flex items-center justify-between">
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
              HỒ SƠ: {selectedDraftDetail.application.app_code}
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* GIAI ĐOẠN 1: THẨM ĐỊNH MẠNG LƯỚI ĐỒ THỊ & REVIEW ĐIỂM G */}
        {/* =================================================================== */}
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-50 gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[#5B21B6]" />
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase font-mono">
                  1. Relationship Graph (Mạng lưới Quan hệ & Khoản vay)
                </h3>
                <p className="text-xs text-gray-400">
                  {isGraphConfirmed 
                    ? "Đồ thị đã được cán bộ chốt xác nhận để tính toán hạn mức tín dụng." 
                    : "Cán bộ thẩm định đối soát các cạnh quan hệ và xử lý cảnh báo Điểm g trước khi hoàn thành đồ thị."}
                </p>
              </div>
            </div>

            {/* BỘ LỌC & CÔNG CỤ ĐIỀU KHIỂN */}
            <div className="flex items-center gap-2 text-xs">
              <select
                value={layoutMode}
                onChange={(e: any) => setLayoutMode(e.target.value)}
                className="px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl font-bold text-purple-950 outline-none cursor-pointer"
              >
                <option value="HIERARCHICAL">Layout: Hierarchical (Phân tầng)</option>
                <option value="FORCE">Layout: Force Directed (Mạng quạt)</option>
              </select>

              <select
                value={relationFilter}
                onChange={(e) => setRelationFilter(e.target.value)}
                className="px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl font-bold text-purple-950 outline-none cursor-pointer"
              >
                <option value="ALL">Filter: All Relationships</option>
                <option value="OWNERSHIP">Ownership / Shareholding</option>
                <option value="FAMILY">Family</option>
                <option value="MANAGEMENT">Management / Control</option>
                <option value="LOANS">Loan / Credit Exposure</option>
                <option value="RISK">Risk-Based Alerts</option>
              </select>

              {/* Nút Ẩn/Hiện Chú giải */}
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition"
                title="Ẩn/Hiện bảng chú giải đồ thị"
              >
                <HelpCircle className="w-3.5 h-3.5 text-purple-700" />
                <span>{showLegend ? "Ẩn Ghi chú" : "Hiện Ghi chú"}</span>
                {showLegend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* VÙNG CANVAS VIS.JS KÈM TOOLBAR ZOOM & LEGEND THÔNG MINH */}
          <div className="relative w-full h-[580px] bg-[#FDFCFE] border border-purple-100/80 rounded-2xl overflow-hidden shadow-inner">
            {/* TOOLBAR ĐIỀU KHIỂN ZOOM / FIT Ở GÓC PHẢI TRÊN */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-xl border border-purple-100 shadow-sm">
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-purple-50 text-gray-700 hover:text-purple-900 rounded-lg transition cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-purple-50 text-gray-700 hover:text-purple-900 rounded-lg transition cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleFit}
                className="p-2 hover:bg-purple-50 text-gray-700 hover:text-purple-900 rounded-lg transition cursor-pointer"
                title="Căn giữa toàn màn hình"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* BẢNG GHI CHÚ (LEGEND BOX) */}
            {showLegend && (
              <div className="absolute top-3 left-3 z-10 p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100 shadow-md text-[11px] space-y-3 pointer-events-auto max-w-[210px] animate-fadeIn">
                <div className="space-y-1.5">
                  <div className="font-bold text-gray-900 text-[10px] uppercase font-mono tracking-wider">
                    Relationship Types
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 bg-[#059669] inline-block rounded" />
                      <span>Ownership (Điểm c, a)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 bg-[#7C3AED] inline-block rounded" />
                      <span>Family (Điểm d)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 bg-[#2563EB] inline-block rounded" />
                      <span>Management (Điểm b)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 bg-[#0284C7] inline-block rounded" />
                      <span>Loan / Exposure</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#D97706] inline-block" />
                      <span>Risk Alert (Điểm g)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-purple-50">
                  <div className="font-bold text-gray-900 text-[10px] uppercase font-mono tracking-wider">
                    Node Types
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#EDE9FE] border border-[#7C3AED] inline-block" />
                      <span>👤 Person (Cá nhân)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#D1FAE5] border border-[#059669] inline-block" />
                      <span>🏢 Company (Pháp nhân)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#E0F2FE] border border-[#0284C7] inline-block" />
                      <span>📄 Loan (Khoản vay)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[#1E3A8A] inline-block" />
                      <span>🏦 Bank (Ngân hàng)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Canvas DOM vis.js */}
            <div ref={networkContainerRef} className="w-full h-full" />
          </div>

          {/* DANH SÁCH CẢNH BÁO RISK-BASED (CẠNH VÀNG) */}
          {!isGraphConfirmed && riskFlags.length > 0 && (
            <div className="p-5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Phát hiện {riskFlags.length} Cảnh báo Quan hệ Rủi ro Tiềm ẩn (Điểm g - Bắt buộc thẩm định)</span>
                </div>
                <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Cần xử lý trước khi chốt đồ thị
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

          {/* NÚT CHỐT HOÀN THÀNH ĐỒ THỊ */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-purple-50">
            <div className="text-xs text-gray-500 font-mono">
              Tổng thành viên: <b className="text-purple-950">{analytics?.connected_group?.member_count || 0}</b> | Khoản vay trong đồ thị: <b className="text-purple-950">{selectedDraftDetail.active_loans?.length || 0}</b>
            </div>

            {isGraphConfirmed ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đồ thị đã xác nhận (Đã mở khóa Phân tích Dư nợ)</span>
                </span>
                <button
                  onClick={() => setIsGraphConfirmed(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa lại đồ thị</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsGraphConfirmed(true)}
                className="px-7 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white hover:from-[#3B1878] hover:to-[#5B21B6]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận & Hoàn thành Đồ thị Liên quan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* GIAI ĐOẠN 2: CHỈ HIỂN THỊ KHI ĐÃ BẤM XÁC NHẬN HOÀN THÀNH ĐỒ THỊ */}
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

            {/* HÀNG 3 CỘT: 2. EXPOSURE SUMMARY | 3. TOP EXPOSURES | 4. RISK ALERTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2. EXPOSURE SUMMARY */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-gray-900 uppercase font-mono">
                    2. Exposure Summary
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-900 px-2 py-0.5 rounded">
                    {statutory?.year_label}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500 font-medium truncate">
                    Nhóm liên quan: <b>{selectedDraftDetail.application.borrower_name}</b>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">Tổng dư nợ nhóm sau đề xuất:</div>
                  <div className="text-3xl font-black text-purple-900 font-mono">
                    {Number(analytics?.connected_group?.total_group_exposure / 1e9).toLocaleString()} Tỷ VND
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    = {analytics?.connected_group?.actual_ratio_pct}% Vốn tự có ({Number(analytics?.bank_equity_capital / 1e9).toLocaleString()} Tỷ)
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-50 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giới hạn Điều 136 ({statutory?.group_limit_ratio * 100}%):</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {Number(analytics?.connected_group?.limit_amount / 1e9).toLocaleString()} Tỷ VND
                    </span>
                  </div>

                  {room?.is_exceeded ? (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Vượt giới hạn:</span>
                      <span className="font-mono">
                        {Number(room.exceeded_amount / 1e9).toLocaleString()} Tỷ VND ({(analytics?.connected_group?.total_group_exposure / analytics?.connected_group?.limit_amount).toFixed(2)} lần)
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Room khả dụng còn lại:</span>
                      <span className="font-mono">
                        + {Number(room?.remaining_room_after_loan / 1e9).toLocaleString()} Tỷ VND
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 pt-1">
                    Dự kiến lộ trình tiếp theo: <b>{statutory?.next_phase}</b>
                  </div>
                </div>
              </div>

              {/* 3. TOP EXPOSURES BY ENTITY */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="text-xs font-black text-gray-900 uppercase font-mono">
                  3. Top Exposures by Entity
                </div>
                <div className="space-y-2.5 pt-1">
                  {topExposures.slice(0, 5).map((exp: any, idx: number) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800 truncate max-w-[170px]" title={exp.name}>
                          <b className="font-mono text-purple-900">{exp.code}</b> - {exp.name}
                        </span>
                        <span className="font-mono font-bold text-purple-950">
                          {exp.balance_billion.toLocaleString()} Tỷ
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${exp.is_primary ? "bg-[#4C1D95]" : "bg-[#6D28D9]"}`}
                          style={{ width: `${Math.min((exp.balance / maxBalance) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. RISK ALERTS */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="text-xs font-black text-gray-900 uppercase font-mono">
                  4. Risk Alerts
                </div>
                <div className="space-y-2 pt-1 text-xs">
                  {analytics?.risk_alerts?.map((alert: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                        alert.level === "CRITICAL" ? "bg-red-50/70 border-red-200 text-red-950" : "bg-amber-50/70 border-amber-200 text-amber-950"
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.level === "CRITICAL" ? "text-red-600" : "text-amber-600"}`} />
                      <div className="space-y-0.5">
                        <div className="font-bold text-[11px] leading-tight">{alert.title}</div>
                        <p className="text-[10px] text-gray-600 leading-snug">{alert.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BẢNG KẾT LUẬN ROOM TÍN DỤNG & CẢNH BÁO MÀU SẮC */}
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
                <div className="p-4 bg-white/90 rounded-2xl border border-current/10 space-y-1">
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

                <div className="p-4 bg-white/90 rounded-2xl border border-current/10 space-y-1">
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

            {/* =============================================================== */}
            {/* BẢNG THỐNG KÊ TOÀN BỘ THỰC THỂ LIÊN QUAN VÀ DƯ NỢ HIỆN TẠI */}
            {/* =============================================================== */}
            <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-50 gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase font-mono">
                  <TrendingUp className="w-4 h-4 text-[#5B21B6]" />
                  <span>DANH SÁCH DƯ NỢ HIỆN TẠI CỦA {membersList.length} THÀNH VIÊN TRONG ĐỒ THỊ</span>
                </div>
                <div className="text-[11px] font-mono text-gray-500">
                  Tổng dư nợ nhóm cũ: <b className="text-purple-950">{Number(analytics.connected_group?.existing_group_debt).toLocaleString()} VNĐ</b> ({Number(analytics.connected_group?.existing_group_debt / 1e9).toFixed(1)} Tỷ)
                </div>
              </div>

              <div className="overflow-x-auto border border-purple-100 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50/50 font-mono text-purple-900 uppercase">
                    <tr>
                      <th className="p-3.5 font-bold w-12">STT</th>
                      <th className="p-3.5 font-bold w-28">LOẠI</th>
                      <th className="p-3.5 font-bold">MÃ ĐỊNH DANH</th>
                      <th className="p-3.5 font-bold">TÊN THÀNH VIÊN</th>
                      <th className="p-3.5 font-bold text-right">DƯ NỢ HIỆN TẠI (VND)</th>
                      <th className="p-3.5 font-bold text-center">VAI TRÒ HỒ SƠ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium">
                    {membersList.map((m: any, idx: number) => {
                      const isPrimary = m.member_id === selectedDraftDetail.application.identifier;
                      return (
                        <tr key={idx} className={`hover:bg-purple-50/30 transition ${isPrimary ? "bg-purple-50/40 font-semibold" : ""}`}>
                          <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                              m.member_type === "Company" ? "bg-blue-50 text-blue-700" : "bg-purple-100 text-purple-800"
                            }`}>
                              {m.member_type === "Company" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              <span>{m.member_type === "Company" ? "Doanh nghiệp" : "Cá nhân"}</span>
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-700">{m.member_id}</td>
                          <td className="p-3 font-bold text-gray-900">{m.member_name}</td>
                          <td className="p-3 font-mono font-bold text-right text-purple-950">
                            {Number(m.active_loan_balance).toLocaleString()} VNĐ
                          </td>
                          <td className="p-3 text-center">
                            {isPrimary ? (
                              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#5B21B6] text-white shadow-xs">
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

            {/* 3 KHỐI: 5. INSIGHTS | 6. TIMELINE | 7. ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 5. RELATIONSHIP INSIGHTS */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="text-xs font-black text-gray-900 uppercase font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5B21B6]" />
                  <span>5. Relationship Insights (AI Discovery)</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-700 list-disc pl-4">
                  {analytics.insights?.map((ins: string, idx: number) => (
                    <li key={idx} className="leading-snug">{ins}</li>
                  ))}
                </ul>
              </div>

              {/* 6. RECENT TIMELINE */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="text-xs font-black text-gray-900 uppercase font-mono flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5B21B6]" />
                  <span>6. Recent Timeline (Temporal View)</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">Khởi tạo Hợp đồng Tín dụng</div>
                      <div className="text-[10px] text-gray-500 font-mono">Thời hạn: {selectedDraftDetail.loan?.term_months} tháng</div>
                    </div>
                    <span className="font-mono font-bold text-purple-900">{Number(selectedDraftDetail.application?.loan_amount / 1e9).toFixed(1)} Tỷ</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-gray-600">
                    <div>
                      <div className="font-medium">Tổng Dư nợ Nhóm Cũ</div>
                      <div className="text-[10px] text-gray-400 font-mono">Đã giải ngân trước đó</div>
                    </div>
                    <span className="font-mono font-bold text-gray-800">{Number(analytics.connected_group?.existing_group_debt / 1e9).toFixed(1)} Tỷ</span>
                  </div>
                </div>
              </div>

              {/* 7. RECOMMENDED ACTIONS */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-3">
                <div className="text-xs font-black text-gray-900 uppercase font-mono flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>7. Recommended Actions</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-700">
                  {analytics.recommended_actions?.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-700 mt-1.5 flex-shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* THANH PHÊ DUYỆT CUỐI CÙNG */}
            <div className="p-6 bg-white rounded-3xl border border-purple-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-mono">
                Căn cứ phê duyệt: <b className="text-purple-950">Điều 136 Luật Các TCTD (Năm 2026 - Trần Đơn lẻ 13%, Nhóm 21%)</b>
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