"use client";

import React, { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DataAdminView from "@/components/admin/DataAdminView";
import OfficerPortal from "@/components/officer/OfficerPortal";
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

  // 2. Màn hình làm việc Quản trị viên (Data Admin)
  if (session.role === "DATA_ADMIN") {
    return <DataAdminView session={session} onLogout={handleLogout} />;
  }

  // 3. Màn hình làm việc Cán bộ Thẩm định (Officer Portal)
  return <OfficerPortal session={session} onLogout={handleLogout} />;
}