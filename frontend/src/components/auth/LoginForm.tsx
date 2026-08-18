"use client";

import React, { useState } from "react";
import { ArrowRight, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { UserSession } from "@/types";

interface LoginFormProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

      onLoginSuccess({
        username,
        role: data.role,
        access_token: data.access_token,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể kết nối đến máy chủ backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex bg-[#F8F7FC]">
      {/* KHUNG ĐĂNG NHẬP TRÁI */}
      <div className="w-full lg:w-[48%] flex flex-col justify-between p-8 sm:p-14 md:p-20 bg-white shadow-2xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#3B1878] via-[#5B21B6] to-[#7C3AED] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-purple-900/20">
            ✦
          </div>
          <div>
            <span className="font-extrabold text-xl text-[#2E1065] tracking-tight block">MonyX</span>
            <span className="text-[10px] text-purple-600 font-mono font-semibold tracking-wider uppercase block -mt-1">
              Relationship Intelligence
            </span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-3 border border-purple-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Credit Underwriting & Risk Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Đăng nhập Hệ thống</h1>
          <p className="text-sm text-gray-500 mt-2">
            Truy cập nền tảng đối soát mạng lưới quan hệ & thẩm định trần hạn mức Điều 136.
          </p>

          {errorMessage && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-mono">
                Tên tài khoản / Mã định danh
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ví dụ: officer hoặc admin"
                className="w-full px-4 py-3.5 bg-purple-50/30 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:bg-white transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-mono">
                Mật khẩu bảo mật
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-purple-50/30 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:bg-white transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white font-bold rounded-2xl text-sm shadow-xl shadow-purple-900/25 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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

        <div className="text-xs text-gray-400 text-center font-medium">
          MonyX Compliance Platform © 2026. Phân tích tuân thủ Luật Các TCTD.
        </div>
      </div>

      {/* BANNER PHẢI TÍM GRADIENT */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-[#200B4D] via-[#35156B] to-[#4C1D95] overflow-hidden items-center justify-center">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#7C3AED]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#A78BFA]/20 blur-3xl" />

        <div className="relative z-10 max-w-lg p-12 text-white">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono text-[#DDD6FE] mb-8 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#A78BFA]" />
            Graph Neural Compliance Engine
          </div>
          
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white font-serif">
            SEE THE NETWORK<br />BEHIND THE LOAN.
          </h2>
          
          <p className="text-purple-200 text-base mt-6 leading-relaxed font-light">
            "Risk isn't in the record. It's in the relationship."
          </p>
          <p className="text-purple-300/80 text-xs mt-3 leading-relaxed">
            Phát hiện sở hữu chéo, liên kết người có liên quan và kiểm soát tập trung rủi ro tín dụng theo Điều 136.
          </p>
        </div>
      </div>
    </main>
  );
}