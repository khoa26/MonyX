"use client";

import React, { useState } from "react";
import { Lock, User, Sparkles, ArrowRight } from "lucide-react";
import { UserSession } from "@/types";

interface LoginFormProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Đăng nhập thất bại");

      // Đảm bảo username và role luôn có giá trị hợp lệ
      const finalUsername = data.username || username;
      const finalRole = data.role || (username.toLowerCase().includes("admin") ? "DATA_ADMIN" : "CREDIT_OFFICER");

      onLoginSuccess({
        username: finalUsername,
        role: finalRole,
        access_token: data.access_token,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F7FC] bg-[url('/background.png')] bg-cover bg-fixed bg-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-purple-100 shadow-2xl shadow-purple-900/10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block p-2 bg-white rounded-2xl shadow-sm border border-purple-100">
            <img src="/logo.png" alt="MonyX Logo" className="h-12 w-auto object-contain mx-auto" />
          </div>
          <div className="text-xs font-mono font-bold text-purple-600 uppercase tracking-wider">
            Risk Intelligence Platform
          </div>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Hệ thống Quản trị & Giám sát Rủi ro Tín dụng theo Điều 136 Luật Các TCTD
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">Tên đăng nhập (*)</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="officer hoặc admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-purple-50/40 border border-purple-100 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#7C3AED] outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">Mật khẩu (*)</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-purple-50/40 border border-purple-100 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#7C3AED] outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? "Đang xác thực..." : "Đăng nhập Hệ thống"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-purple-50 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>DVBank Core System</span>
          <span>Phiên bản 2026.1</span>
        </div>
      </div>
    </div>
  );
}