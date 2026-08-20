"use client";

import React, { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Dashboard from "@/components/Dashboard";
import { UserSession } from "@/types";

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);

  const handleLogout = () => {
    setSession(null);
  };

  // 1. Màn hình Đăng nhập (nếu chưa xác thực)
  if (!session) {
    return <LoginForm onLoginSuccess={setSession} />;
  }

  // 2. Dashboard (màn hình chính sau đăng nhập, tự phân vai theo role)
  return <Dashboard session={session} onLogout={handleLogout} />;
}
