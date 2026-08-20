"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Users, Share2, FileText, Settings, Search, Bell,
  ChevronDown, Shield, TrendingUp, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, Plus, ChevronRight, LogOut, ListFilter, FolderPlus, Database
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { UserSession } from "@/types";
import PipelineMonitor from "@/components/officer/PipelineMonitor";
import IntakeWizard from "@/components/officer/IntakeWizard";
import DataAdminView from "@/components/admin/DataAdminView";

/* ---------------- Design tokens ----------------
   Primary  #6D2CFF   Secondary #8B5CF6   Pale #C4B5FD
   Surface  #F6F4FF   Ink #170B33          Mint #22C55E   Amber #F5A524
------------------------------------------------ */

interface DashboardProps {
  session: UserSession;
  onLogout: () => void;
}

const trendData = [
  { m: "T1", v: 62 }, { m: "T2", v: 68 }, { m: "T3", v: 71 }, { m: "T4", v: 66 },
  { m: "T5", v: 78 }, { m: "T6", v: 84 }, { m: "T7", v: 91 }, { m: "T8", v: 97 },
];

const riskData = [
  { name: "Thấp", value: 62, color: "#8B5CF6" },
  { name: "Trung bình", value: 27, color: "#C4B5FD" },
  { name: "Cao", value: 11, color: "#F5A524" },
];

const segmentData = [
  { s: "DN nhỏ", v: 34 }, { s: "DN vừa", v: 48 }, { s: "Tập đoàn", v: 21 }, { s: "Cá nhân", v: 58 },
];

// Dữ liệu demo lấy từ seed_data.cypher của MonyX (DVBank)
const clients = [
  { name: "Công ty CP Sông Hồng Invest", segment: "Tập đoàn", limit: "1.200 tỷ", used: 68, risk: "Thấp" },
  { name: "Công ty TNHH Sông Hồng Land", segment: "Doanh nghiệp vừa", limit: "763 tỷ", used: 82, risk: "Trung bình" },
  { name: "Công ty TNHH Đầu tư Cửu Long", segment: "Doanh nghiệp nhỏ", limit: "420 tỷ", used: 93, risk: "Cao" },
  { name: "Trần Quốc Bảo", segment: "Cá nhân", limit: "320 tỷ", used: 41, risk: "Thấp" },
];

const riskStyle: Record<string, { bg: string; fg: string }> = {
  "Thấp": { bg: "#EAF8EE", fg: "#1F9D55" },
  "Trung bình": { bg: "#FFF4E0", fg: "#B9770E" },
  "Cao": { bg: "#FDE9EA", fg: "#D23B3B" },
};

const roleLabel: Record<string, string> = {
  CREDIT_OFFICER: "Cán bộ thẩm định",
  DATA_ADMIN: "Quản trị dữ liệu",
};

const notifications = [
  { text: "Cảnh báo Điểm g: Công ty TNHH Đầu tư Cửu Long vượt 85% hạn mức", time: "5 phút trước" },
  { text: "Hồ sơ LN-202608-0001 đang chờ thẩm định", time: "1 giờ trước" },
  { text: "Nhóm liên quan Tập đoàn Sông Hồng gần ngưỡng 18% vốn tự có", time: "Hôm qua" },
];

/* ---------------- Global animation styles ---------------- */
function GlobalStyles() {
  return (
    <style>{`
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes pingPulse {
        0% { transform: scale(1); opacity: 0.7; }
        70% { transform: scale(2.4); opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes floatY {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      .monyx-hero {
        background-size: 200% 200%;
        animation: gradientShift 10s ease infinite;
      }
      .monyx-search {
        transition: box-shadow .2s ease, border-color .2s ease;
        border: 1px solid transparent;
      }
      .monyx-search:focus-within {
        box-shadow: 0 0 0 3px rgba(109,44,255,0.15);
        border-color: #8B5CF6;
      }
      .monyx-row:hover {
        background: #FAF8FF;
      }
      .monyx-nav-btn:hover {
        background: rgba(255,255,255,0.06);
      }
      .monyx-nav-btn.active:hover {
        background: transparent;
      }
      .monyx-float {
        animation: floatY 3.4s ease-in-out infinite;
      }
      * { box-sizing: border-box; }
    `}</style>
  );
}

/* ---------------- Count-up hook ---------------- */
function useCountUp(value: number | string, duration = 900) {
  const isPureInt = /^\d+$/.test(String(value));
  const target = isPureInt ? parseInt(value as string, 10) : null;
  const [display, setDisplay] = useState<number | string>(isPureInt ? 0 : value);

  useEffect(() => {
    if (!isPureInt) { setDisplay(value); return; }
    let raf: number;
    let start: number | undefined;
    const step = (ts: number) => {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round((target as number) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

/* ---------------- Logo ---------------- */
function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="mx-g" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4C1FD9" />
        </linearGradient>
      </defs>
      <path d="M24 3 L43 13.5 V34.5 L24 45 L5 34.5 V13.5 Z" fill="url(#mx-g)" />
      <path d="M24 14 L30 24 L24 34 L18 24 Z" fill="white" fillOpacity="0.92" />
    </svg>
  );
}

/* ---------------- Network watermark ---------------- */
function NetworkMotif({ className }: { className?: string }) {
  const pts = [[20, 30], [80, 15], [150, 45], [210, 20], [260, 60], [120, 80], [60, 90], [190, 95]];
  return (
    <svg className={className} viewBox="0 0 280 110" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {pts.map((p, i) => i < pts.length - 1 && (
        <motion.line
          key={i}
          x1={p[0]} y1={p[1]} x2={pts[i + 1][0]} y2={pts[i + 1][1]}
          stroke="white" strokeOpacity="0.18" strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
        />
      ))}
      <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[4][0]} y2={pts[4][1]} stroke="white" strokeOpacity="0.12" strokeWidth="1" />
      {pts.map((p, i) => (
        <motion.circle
          key={i} cx={p[0]} cy={p[1]} r={i % 3 === 0 ? 3 : 1.8} fill="white" fillOpacity="0.5"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300 }}
        />
      ))}
    </svg>
  );
}

/* ---------------- Shared bits ---------------- */
function Card({ children, style, className = "", hoverable = false, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; className?: string; hoverable?: boolean; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hoverable ? { y: -4, boxShadow: "0 14px 28px rgba(109,44,255,0.14)" } : undefined}
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #ECE7FB",
        boxShadow: "0 1px 2px rgba(23,11,51,0.04)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ label, value, delta, positive, icon: Icon, delay = 0 }: { label: string; value: string; delta: string; positive: boolean; icon: LucideIcon; delay?: number }) {
  const displayValue = useCountUp(value);
  return (
    <Card hoverable delay={delay} style={{ padding: "20px 22px", flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "#6E6480", fontWeight: 500 }}>{label}</span>
        <motion.div
          whileHover={{ rotate: 8, scale: 1.08 }}
          style={{ width: 34, height: 34, borderRadius: 10, background: "#F1ECFF", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon size={17} color="#6D2CFF" />
        </motion.div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#170B33", marginTop: 14, letterSpacing: -0.5 }}>{displayValue}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
        {positive ? <ArrowUpRight size={14} color="#1F9D55" /> : <ArrowDownRight size={14} color="#D23B3B" />}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: positive ? "#1F9D55" : "#D23B3B" }}>{delta}</span>
        <span style={{ fontSize: 12.5, color: "#9C93AE" }}>so với tháng trước</span>
      </div>
    </Card>
  );
}

function Pill({ text }: { text: string }) {
  const s = riskStyle[text] || { bg: "#F1ECFF", fg: "#6D2CFF" };
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>
      {text}
    </span>
  );
}

/* ---------------- Pages ---------------- */
function HomePage({ greeting }: { greeting: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card className="monyx-hero" style={{
        padding: "26px 28px", position: "relative", overflow: "hidden",
        background: "linear-gradient(120deg, #6D2CFF 0%, #4C1FD9 50%, #8B5CF6 100%)", color: "white", border: "none",
      }}>
        <NetworkMotif />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.75, fontWeight: 600, textTransform: "uppercase" }}>Tổng quan mạng lưới tín dụng</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, letterSpacing: -0.5 }}>{greeting}, mọi thứ đang ổn định</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6, maxWidth: 460 }}>
              97% hạn mức tín dụng đang được kiểm soát trong ngưỡng an toàn theo Điều 136 Luật Các TCTD.
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: "white", color: "#4C1FD9", border: "none", borderRadius: 12, padding: "11px 18px",
              fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            }}
          >
            <Plus size={16} /> Tạo hồ sơ tín dụng
          </motion.button>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Tổng dư nợ" value="18.436 tỷ" delta="+4.2%" positive icon={TrendingUp} delay={0.05} />
        <StatCard label="Khách hàng đang theo dõi" value="12.406" delta="+318" positive icon={Users} delay={0.1} />
        <StatCard label="Tỷ lệ sử dụng hạn mức" value="83.6%" delta="-1.1%" positive={false} icon={Shield} delay={0.15} />
        <StatCard label="Cảnh báo Điểm g" value="24" delta="+6" positive={false} icon={Bell} delay={0.2} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card delay={0.1} style={{ padding: "20px 22px", flex: 2, minWidth: 340 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#170B33", fontSize: 15 }}>Xu hướng dư nợ</div>
              <div style={{ fontSize: 12.5, color: "#9C93AE" }}>8 tháng gần nhất, đơn vị: nghìn tỷ</div>
            </div>
          </div>
          <div style={{ height: 200, marginTop: 6 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -18, top: 10 }}>
                <defs>
                  <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D2CFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6D2CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F1ECFF" />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#9C93AE" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9C93AE" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #ECE7FB", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="#6D2CFF" strokeWidth={2.5} fill="url(#fillTrend)" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card delay={0.15} style={{ padding: "20px 22px", flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, color: "#170B33", fontSize: 15 }}>Phân bố rủi ro</div>
          <div style={{ fontSize: 12.5, color: "#9C93AE" }}>Theo nhóm khách hàng</div>
          <div style={{ height: 160, marginTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={3} animationDuration={1000}>
                  {riskData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #ECE7FB", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {riskData.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: r.color, display: "inline-block" }} />
                  <span style={{ color: "#4A4160" }}>{r.name}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#170B33" }}>{r.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card delay={0.2} style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: "#170B33", fontSize: 15 }}>Khách hàng cần chú ý</div>
          <motion.button
            whileHover={{ x: 2 }}
            style={{ background: "none", border: "none", color: "#6D2CFF", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
          >
            Xem tất cả <ChevronRight size={14} />
          </motion.button>
        </div>
        <ClientTable rows={clients.filter((c) => c.risk !== "Thấp")} />
      </Card>
    </div>
  );
}

function ClientTable({ rows }: { rows: typeof clients }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#9C93AE", fontWeight: 500, fontSize: 12 }}>
            <th style={{ padding: "8px 10px" }}>Khách hàng</th>
            <th style={{ padding: "8px 10px" }}>Phân khúc</th>
            <th style={{ padding: "8px 10px" }}>Hạn mức</th>
            <th style={{ padding: "8px 10px" }}>Đã sử dụng</th>
            <th style={{ padding: "8px 10px" }}>Rủi ro</th>
            <th style={{ padding: "8px 10px" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <motion.tr
              key={c.name}
              className="monyx-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              style={{ borderTop: "1px solid #F1ECFF" }}
            >
              <td style={{ padding: "12px 10px", fontWeight: 600, color: "#170B33" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "#F1ECFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6D2CFF" }}>
                    {c.name.trim().charAt(0)}
                  </div>
                  {c.name}
                </div>
              </td>
              <td style={{ padding: "12px 10px", color: "#6E6480" }}>{c.segment}</td>
              <td style={{ padding: "12px 10px", color: "#170B33" }}>{c.limit}</td>
              <td style={{ padding: "12px 10px", width: 140 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#F1ECFF", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.used}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                      style={{ height: 6, borderRadius: 999, background: c.used > 80 ? "#F5A524" : "#8B5CF6" }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#9C93AE" }}>{c.used}%</span>
                </div>
              </td>
              <td style={{ padding: "12px 10px" }}><Pill text={c.risk} /></td>
              <td style={{ padding: "12px 10px" }}>
                <motion.div whileHover={{ scale: 1.2 }} style={{ cursor: "pointer", display: "inline-flex" }}>
                  <MoreHorizontal size={16} color="#B4ABC9" />
                </motion.div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NetworkPage() {
  const nodes: [number, number, number, string][] = [
    [80, 160, 7, "#C4B5FD"], [180, 80, 5, "#8B5CF6"], [180, 240, 5, "#8B5CF6"], [300, 160, 12, "#FFFFFF"],
    [420, 90, 5, "#8B5CF6"], [420, 230, 5, "#8B5CF6"], [520, 160, 7, "#C4B5FD"], [300, 60, 4, "#6D2CFF"], [300, 260, 4, "#6D2CFF"]
  ];
  const lines: [number, number, number, number][] = [
    [80, 160, 300, 160], [300, 160, 520, 160], [300, 160, 180, 80], [300, 160, 420, 230],
    [180, 80, 300, 60], [180, 240, 300, 260], [420, 90, 300, 60], [420, 230, 300, 260]
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#170B33" }}>Mạng lưới quan hệ</div>
        <div style={{ fontSize: 13, color: "#9C93AE" }}>Các mối liên kết giữa khách hàng, đối tác và bên bảo lãnh</div>
      </div>
      <Card style={{ padding: 24, minHeight: 360, position: "relative", overflow: "hidden", background: "#170B33" }}>
        <svg viewBox="0 0 600 320" style={{ width: "100%", height: 340 }}>
          {lines.map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#8B5CF6" strokeWidth="1.4" strokeOpacity="0.55"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.55 }}
              transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
            />
          ))}
          {nodes.map(([x, y, r, c], i) => (
            <motion.circle
              key={i} cx={x} cy={y} r={r} fill={c}
              className={r >= 10 ? "monyx-float" : ""}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 260, damping: 16 }}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 24, bottom: 20, color: "white", fontSize: 12.5, opacity: 0.75 }}>
          Nút trung tâm biểu thị Công ty CP Sông Hồng Invest — 8 liên kết trực tiếp
        </div>
      </Card>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Tổng số liên kết" value="1284" delta="+42" positive icon={Share2} delay={0.05} />
        <StatCard label="Cụm rủi ro liên đới" value="7" delta="+1" positive={false} icon={Shield} delay={0.1} />
        <StatCard label="Node trung tâm mới" value="3" delta="+3" positive icon={TrendingUp} delay={0.15} />
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#170B33" }}>Báo cáo</div>
        <div style={{ fontSize: 13, color: "#9C93AE" }}>Relationship Intelligence Report theo phân khúc</div>
      </div>
      <Card style={{ padding: "20px 22px" }}>
        <div style={{ fontWeight: 700, color: "#170B33", fontSize: 15, marginBottom: 4 }}>Dư nợ theo phân khúc</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={segmentData} margin={{ left: -18, top: 10 }}>
              <CartesianGrid vertical={false} stroke="#F1ECFF" />
              <XAxis dataKey="s" tick={{ fontSize: 12, fill: "#9C93AE" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9C93AE" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #ECE7FB", fontSize: 12 }} />
              <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#6D2CFF" animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {["Báo cáo tháng 8", "Báo cáo quý III", "Đánh giá rủi ro liên đới"].map((t, i) => (
          <Card key={t} hoverable delay={i * 0.06} style={{ padding: "18px 20px", flex: 1, minWidth: 220, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F1ECFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={17} color="#6D2CFF" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "#170B33" }}>{t}</div>
                <div style={{ fontSize: 12, color: "#9C93AE" }}>PDF · Cập nhật hôm nay</div>
              </div>
            </div>
            <ChevronRight size={16} color="#B4ABC9" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const rows = [
    { label: "Nền tảng", value: "MonyX — Credit Risk Intelligence" },
    { label: "Ngân hàng đối soát", value: "DVBank" },
    { label: "Múi giờ", value: "GMT+7 — Hồ Chí Minh" },
    { label: "Ngưỡng cảnh báo rủi ro", value: "Dư nợ nhóm liên quan ≥ 18% vốn tự có" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 640 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#170B33" }}>Cài đặt</div>
        <div style={{ fontSize: 13, color: "#9C93AE" }}>Thông tin tổ chức và cấu hình hệ thống</div>
      </div>
      <Card style={{ padding: 6 }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderTop: i ? "1px solid #F1ECFF" : "none" }}>
            <span style={{ fontSize: 13.5, color: "#6E6480" }}>{r.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#170B33" }}>{r.value}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------- App shell ---------------- */
export default function Dashboard({ session, onLogout }: DashboardProps) {
  const isAdmin = session.role === "DATA_ADMIN";
  const [page, setPage] = useState("home");
  const [draftApplications, setDraftApplications] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const searchResults = search.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const fetchDraftApplications = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/credit/draft-applications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setDraftApplications(data.applications || []);
    } catch (err: any) {
      console.error("Lỗi tải danh sách hồ sơ:", err);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    if (!isAdmin && page === "pipeline") {
      fetchDraftApplications();
    }
  }, [page, isAdmin, fetchDraftApplications]);

  const navItems: { id: string; label: string; icon: LucideIcon }[] = [
    { id: "home", label: "Trang chủ", icon: LayoutGrid },
    ...(isAdmin
      ? [{ id: "admin", label: "Quản trị dữ liệu", icon: Database }]
      : [
          { id: "pipeline", label: "Theo dõi hồ sơ", icon: ListFilter },
          { id: "intake", label: "Tạo khoản vay", icon: FolderPlus },
        ]),
    { id: "network", label: "Mạng lưới quan hệ", icon: Share2 },
    { id: "reports", label: "Báo cáo", icon: FileText },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  const titleMap: Record<string, string> = {
    home: "Trang chủ",
    pipeline: "Theo dõi hồ sơ",
    intake: "Tạo khoản vay",
    admin: "Quản trị dữ liệu",
    network: "Mạng lưới quan hệ",
    reports: "Báo cáo",
    settings: "Cài đặt",
  };
  const greeting = roleLabel[session.role] || session.username;

  const renderContent = () => {
    switch (page) {
      case "pipeline":
        return <PipelineMonitor session={session} draftApplications={draftApplications} isLoading={isLoadingDrafts} onRefresh={fetchDraftApplications} />;
      case "intake":
        return (
          <IntakeWizard
            session={session}
            onSuccessComplete={() => {
              setPage("pipeline");
              fetchDraftApplications();
            }}
          />
        );
      case "admin":
        return <DataAdminView session={session} />;
      case "network":
        return <NetworkPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage greeting={greeting} />;
    }
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", display: "flex", minHeight: "100vh", background: "#F6F4FF", color: "#170B33" }}>
      <GlobalStyles />
      {/* Sidebar */}
      <aside style={{ width: 232, background: "#170B33", display: "flex", flexDirection: "column", padding: "22px 16px", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 22px" }}>
          <Logo size={30} />
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>MonyX</div>
            <div style={{ color: "#8B5CF6", fontSize: 9, letterSpacing: 0.6, fontWeight: 600 }}>RELATIONSHIP INTELLIGENCE</div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {navItems.map((n) => {
            const active = page === n.id;
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`monyx-nav-btn${active ? " active" : ""}`}
                style={{
                  position: "relative", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10,
                  border: "none", cursor: "pointer", textAlign: "left", fontSize: 13.5, fontWeight: 500,
                  color: active ? "white" : "#B4ABC9", background: "transparent", overflow: "hidden",
                }}
              >
                {active && (
                  <motion.div
                    layoutId="navIndicator"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(90deg, #6D2CFF, #4C1FD9)", zIndex: 0 }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 11 }}>
                  <Icon size={16} />
                  {n.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: "linear-gradient(135deg,#8B5CF6,#4C1FD9)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {session.username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "white", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.username}</div>
              <div style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 600 }}>{session.role}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="monyx-nav-btn"
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "#B4ABC9", fontSize: 13.5, width: "100%", cursor: "pointer" }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #ECE7FB", background: "white", position: "relative", zIndex: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{titleMap[page]}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Tìm kiếm */}
            <div style={{ position: "relative" }}>
              <div className="monyx-search" style={{ display: "flex", alignItems: "center", gap: 8, background: "#F6F4FF", borderRadius: 10, padding: "8px 12px", width: 240 }}>
                <Search size={14} color="#9C93AE" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm khách hàng, hồ sơ..."
                  style={{ border: "none", outline: "none", fontSize: 13, flex: 1, color: "#170B33", background: "transparent" }}
                />
              </div>
              {search.trim() !== "" && (
                <div style={{ position: "absolute", top: 46, left: 0, width: 280, background: "white", borderRadius: 12, border: "1px solid #ECE7FB", boxShadow: "0 12px 32px rgba(23,11,51,0.12)", zIndex: 60, padding: 8 }}>
                  {searchResults.length > 0 ? (
                    searchResults.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => { setPage("home"); setSearch(""); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8FF")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: "#F1ECFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#6D2CFF", flexShrink: 0 }}>
                          {c.name.trim().charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#170B33", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "#9C93AE" }}>{c.segment}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div style={{ fontSize: 12.5, color: "#9C93AE", padding: "12px 10px", textAlign: "center" }}>Không tìm thấy kết quả</div>
                  )}
                </div>
              )}
            </div>

            {/* Thông báo */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setAccountOpen(false); }}
                style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
              >
                <Bell size={18} color="#6E6480" />
                <span style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: 999, background: "#F5A524", animation: "pingPulse 1.8s cubic-bezier(0,0,0.2,1) infinite" }} />
                <span style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: 999, background: "#F5A524" }} />
              </button>
              {notifOpen && (
                <div style={{ position: "absolute", top: 38, right: 0, width: 320, background: "white", borderRadius: 12, border: "1px solid #ECE7FB", boxShadow: "0 12px 32px rgba(23,11,51,0.12)", zIndex: 60, padding: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#170B33", padding: "6px 10px 10px", borderBottom: "1px solid #F1ECFF" }}>Thông báo</div>
                  {notifications.map((n, i) => (
                    <button
                      key={i}
                      onClick={() => setNotifOpen(false)}
                      style={{ display: "block", width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8FF")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ fontSize: 12.5, color: "#170B33", fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: "#9C93AE", marginTop: 3 }}>{n.time}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tài khoản */}
            <div style={{ position: "relative" }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setAccountOpen(!accountOpen); setNotifOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "none", border: "none", padding: 0 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 999, background: "linear-gradient(135deg,#8B5CF6,#4C1FD9)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700 }}>
                  {session.username.slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown size={14} color="#9C93AE" />
              </motion.button>
              {accountOpen && (
                <div style={{ position: "absolute", top: 42, right: 0, width: 220, background: "white", borderRadius: 12, border: "1px solid #ECE7FB", boxShadow: "0 12px 32px rgba(23,11,51,0.12)", zIndex: 60, padding: 8 }}>
                  <div style={{ padding: "10px", borderBottom: "1px solid #F1ECFF" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#170B33" }}>{session.username}</div>
                    <div style={{ fontSize: 11, color: "#9C93AE", marginTop: 2 }}>{roleLabel[session.role] || session.role}</div>
                  </div>
                  <button
                    onClick={onLogout}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#D23B3B", fontWeight: 600, textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FDE9EA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ padding: "24px 28px", overflowY: "auto" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
