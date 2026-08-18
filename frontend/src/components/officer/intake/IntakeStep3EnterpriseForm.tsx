"use client";

import React from "react";
import { Building2, User, FileText, Users, Plus, Trash2, GitFork } from "lucide-react";
import { ENTERPRISE_RELATION_TAXONOMY, BridgeKind } from "@/types";

interface IntakeStep3EnterpriseFormProps {
  loanId: string;
  enterpriseForm: any;
  setEnterpriseForm: (form: any) => void;
  repForm: any;
  setRepForm: (form: any) => void;
  corpLoanForm: any;
  setCorpLoanForm: (form: any) => void;
  corpRelatedList: any[];
  setCorpRelatedList: (list: any[]) => void;
  onAddRelated: () => void;
}

export default function IntakeStep3EnterpriseForm({
  loanId,
  enterpriseForm,
  setEnterpriseForm,
  repForm,
  setRepForm,
  corpLoanForm,
  setCorpLoanForm,
  corpRelatedList,
  setCorpRelatedList,
  onAddRelated,
}: IntakeStep3EnterpriseFormProps) {
  return (
    <div className="space-y-6">
      {/* 1. THÔNG TIN PHÁP NHÂN DOANH NGHIỆP */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
            <Building2 className="w-5 h-5 text-[#5B21B6]" />
            <span>1. Thông tin Pháp nhân Doanh nghiệp (ĐKKD/MST)</span>
          </div>
          <span className="text-[11px] font-mono bg-purple-50 text-purple-900 font-bold px-3 py-1 rounded-full border border-purple-100">
            Lưu/Cập nhật vào Master DB
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-gray-500 font-semibold mb-1">Tên Doanh nghiệp theo ĐKKD (*)</label>
            <input
              type="text"
              required
              placeholder="CÔNG TY CỔ PHẦN ĐẦU TƯ BÌNH MINH"
              value={enterpriseForm.company_name || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, company_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-bold text-gray-900 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Mã số DN (MSDN / MST) (*)</label>
            <input
              type="text"
              required
              placeholder="0312345678"
              value={enterpriseForm.tax_code || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, tax_code: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono font-bold text-[#5B21B6] focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Tên viết tắt / Tên giao dịch</label>
            <input
              type="text"
              placeholder="BINH MINH CORP"
              value={enterpriseForm.short_name || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, short_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Vốn điều lệ (VND)</label>
            <input
              type="text"
              placeholder="50.000.000.000 VND"
              value={enterpriseForm.charter_capital || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, charter_capital: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Ngành nghề kinh doanh chính</label>
            <input
              type="text"
              placeholder="Bất động sản / Xây dựng..."
              value={enterpriseForm.business_sector || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, business_sector: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-gray-500 font-semibold mb-1">Địa chỉ trụ sở chính</label>
            <input
              type="text"
              placeholder="Tòa nhà Landmark 81, TP.HCM"
              value={enterpriseForm.headquarters_address || ""}
              onChange={(e) => setEnterpriseForm({ ...enterpriseForm, headquarters_address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. NGƯỜI ĐẠI DIỆN PHÁP LUẬT */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
            <User className="w-5 h-5 text-[#5B21B6]" />
            <span>2. Thông tin Người Đại diện theo Pháp luật (Điểm b)</span>
          </div>
          <span className="text-[11px] font-mono bg-purple-50 text-purple-900 font-bold px-3 py-1 rounded-full border border-purple-100">
            Legal Representative
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-gray-500 font-semibold mb-1">Họ và tên Người ĐDPL (*)</label>
            <input
              type="text"
              required
              placeholder="NGUYỄN VĂN DŨNG"
              value={repForm.full_name || ""}
              onChange={(e) => setRepForm({ ...repForm, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-bold text-gray-900 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Số CCCD / Hộ chiếu ĐDPL (*)</label>
            <input
              type="text"
              required
              placeholder="079085001234"
              value={repForm.cccd_id || ""}
              onChange={(e) => setRepForm({ ...repForm, cccd_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono font-bold text-[#5B21B6] focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Chức vụ điều hành (*)</label>
            <input
              type="text"
              placeholder="Tổng Giám đốc"
              value={repForm.position || ""}
              onChange={(e) => setRepForm({ ...repForm, position: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-semibold focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Số điện thoại di động</label>
            <input
              type="text"
              placeholder="0909123456"
              value={repForm.phone || ""}
              onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Email liên hệ công việc</label>
            <input
              type="email"
              placeholder="dung.nguyen@binhminh.vn"
              value={repForm.email || ""}
              onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Địa chỉ thường trú / Nơi ở</label>
            <input
              type="text"
              placeholder="Q.1, TP. Hồ Chí Minh"
              value={repForm.current_address || ""}
              onChange={(e) => setRepForm({ ...repForm, current_address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. NHU CẦU CẤP TÍN DỤNG */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
            <FileText className="w-5 h-5 text-[#6D28D9]" />
            <span>3. Nhu cầu Cấp Tín dụng Đề xuất ({loanId})</span>
          </div>
          <span className="text-[11px] font-mono bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200">
            Lưu vào Sandbox
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-gray-500 font-semibold mb-1">Mục đích vay vốn (*)</label>
            <input
              type="text"
              value={corpLoanForm.purpose || ""}
              onChange={(e) => setCorpLoanForm({ ...corpLoanForm, purpose: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-semibold text-gray-800 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Số tiền đề nghị vay (VND) (*)</label>
            <input
              type="text"
              placeholder="5000000000"
              value={corpLoanForm.loan_amount || ""}
              onChange={(e) => setCorpLoanForm({ ...corpLoanForm, loan_amount: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono font-bold text-purple-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Thời hạn vay (tháng)</label>
            <input
              type="text"
              placeholder="12"
              value={corpLoanForm.term_months || ""}
              onChange={(e) => setCorpLoanForm({ ...corpLoanForm, term_months: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-bold outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-500 font-semibold mb-1">Nguồn trả nợ dự kiến</label>
            <input
              type="text"
              value={corpLoanForm.repayment_source || ""}
              onChange={(e) => setCorpLoanForm({ ...corpLoanForm, repayment_source: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl text-gray-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. BẢNG QUAN HỆ TRỰC TIẾP & BẮC CẦU CHO DOANH NGHIỆP */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div>
            <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
              <Users className="w-5 h-5 text-purple-700" />
              <span>4. Danh sách Người & Tổ chức có Liên quan (Điều 136)</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Khai báo trực tiếp 0-Hop (Điểm a, b, c, e) hoặc bắc cầu qua Công ty con/mẹ (Điểm a) và Người thân Lãnh đạo (Điểm đ).
            </p>
          </div>
          <button
            type="button"
            onClick={onAddRelated}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded-2xl cursor-pointer transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm đối tượng
          </button>
        </div>

        <div className="overflow-x-auto border border-purple-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 uppercase font-mono text-purple-900">
              <tr>
                <th className="p-3.5 w-8">STT</th>
                <th className="p-3.5 w-28">Loại Đích</th>
                <th className="p-3.5">Tên Đối tượng Đích (*)</th>
                <th className="p-3.5 w-36">CCCD / Mã số ĐKDN</th>
                <th className="p-3.5 w-64">Mối quan hệ pháp lý (*)</th>
                <th className="p-3.5 w-80">Thông tin Thực thể Bắc cầu</th>
                <th className="p-3.5 w-20 text-center">% Vốn</th>
                <th className="p-3.5 w-10 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 font-medium">
              {corpRelatedList.map((item, idx) => (
                <tr key={idx} className="hover:bg-purple-50/30 transition">
                  <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                  <td className="p-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono inline-block ${
                      item.entity_type === "ORGANIZATION" ? "bg-purple-100 text-purple-800" : "bg-blue-50 text-blue-700"
                    }`}>
                      {item.entity_type === "ORGANIZATION" ? "Doanh nghiệp" : "Cá nhân"}
                    </span>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.name || ""}
                      onChange={(e) => {
                        const u = [...corpRelatedList];
                        u[idx].name = e.target.value;
                        setCorpRelatedList(u);
                      }}
                      placeholder="Tên công ty hoặc họ tên cá nhân đích"
                      className="w-full px-3 py-2 bg-white border border-purple-100 rounded-xl font-bold text-gray-900 outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.identifier || ""}
                      onChange={(e) => {
                        const u = [...corpRelatedList];
                        u[idx].identifier = e.target.value;
                        setCorpRelatedList(u);
                      }}
                      placeholder="MSDN hoặc CCCD"
                      className="w-full px-3 py-2 bg-white border border-purple-100 rounded-xl font-mono text-gray-700 outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={item.specific_relationship || "Công ty mẹ"}
                      onChange={(e) => {
                        const val = e.target.value;
                        let point = "a";
                        let reqPct = false;
                        let bKind: BridgeKind = "NONE";
                        let targetType: "INDIVIDUAL" | "ORGANIZATION" = "ORGANIZATION";

                        for (const g of ENTERPRISE_RELATION_TAXONOMY) {
                          const found = g.options.find(o => o.label === val);
                          if (found) {
                            point = found.point;
                            reqPct = found.requires_percentage;
                            bKind = found.bridge_kind;
                            targetType = found.target_type;
                            break;
                          }
                        }

                        const u = [...corpRelatedList];
                        u[idx].specific_relationship = val;
                        u[idx].relation_point = point;
                        u[idx].requires_percentage = reqPct;
                        u[idx].bridge_kind = bKind;
                        u[idx].entity_type = targetType;
                        setCorpRelatedList(u);
                      }}
                      className="w-full px-2.5 py-2 border border-purple-100 rounded-xl text-[11px] font-semibold outline-none bg-purple-50/50 text-purple-900"
                    >
                      {ENTERPRISE_RELATION_TAXONOMY.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.options.map((opt) => (
                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>

                  {/* CỘT THỰC THỂ BẮC CẦU XÁC ĐỊNH CỤ THỂ CHO DOANH NGHIỆP */}
                  <td className="p-2">
                    {/* TRƯỜNG HỢP 1: CÔNG TY CON F1 TRUNG GIAN */}
                    {item.bridge_kind === "CORP_F1_SUBSIDIARY" && (
                      <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 text-[11px]">
                        <div className="flex items-center gap-1 text-[#5B21B6] font-bold">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Công ty con F1 trung gian (Company):</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Tên Công ty con F1..."
                          value={item.bridge_entity?.name || ""}
                          onChange={(e) => {
                            const u = [...corpRelatedList];
                            u[idx].bridge_entity = { ...u[idx].bridge_entity, name: e.target.value };
                            setCorpRelatedList(u);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl outline-none font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Mã số thuế F1"
                            value={item.bridge_entity?.identifier || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, identifier: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl font-mono outline-none text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="% DN vay nắm tại F1 (vd 60%)"
                            value={item.bridge_entity?.role_or_relationship || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, role_or_relationship: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl outline-none text-[10px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRƯỜNG HỢP 2: CÔNG TY MẸ CHUNG */}
                    {item.bridge_kind === "CORP_COMMON_PARENT" && (
                      <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 text-[11px]">
                        <div className="flex items-center gap-1 text-[#5B21B6] font-bold">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Công ty Mẹ chung (Company):</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Tên Công ty Mẹ chung..."
                          value={item.bridge_entity?.name || ""}
                          onChange={(e) => {
                            const u = [...corpRelatedList];
                            u[idx].bridge_entity = { ...u[idx].bridge_entity, name: e.target.value };
                            setCorpRelatedList(u);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl outline-none font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Mã số thuế Công ty Mẹ"
                            value={item.bridge_entity?.identifier || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, identifier: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl font-mono outline-none text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="% Mẹ sở hữu tại DN vay"
                            value={item.bridge_entity?.role_or_relationship || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, role_or_relationship: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl outline-none text-[10px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRƯỜNG HỢP 3: CÔNG TY MẸ CỦA NGƯỜI QUẢN LÝ */}
                    {item.bridge_kind === "CORP_PARENT_MANAGER_BRIDGE" && (
                      <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 text-[11px]">
                        <div className="flex items-center gap-1 text-[#5B21B6] font-bold">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Công ty Mẹ (Company):</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Tên Công ty Mẹ..."
                          value={item.bridge_entity?.name || ""}
                          onChange={(e) => {
                            const u = [...corpRelatedList];
                            u[idx].bridge_entity = { ...u[idx].bridge_entity, name: e.target.value };
                            setCorpRelatedList(u);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl outline-none font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Mã số thuế Mẹ"
                            value={item.bridge_entity?.identifier || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, identifier: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl font-mono outline-none text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="Chức vụ người này tại Mẹ"
                            value={item.bridge_entity?.role_or_relationship || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, role_or_relationship: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl outline-none text-[10px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* TRƯỜNG HỢP 4: LÃNH ĐẠO / CỔ ĐÔNG LỚN TRUNG GIAN */}
                    {item.bridge_kind === "CORP_LEADER_FAMILY_BRIDGE" && (
                      <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 text-[11px]">
                        <div className="flex items-center gap-1 text-[#5B21B6] font-bold">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Lãnh đạo / Cổ đông lớn của DN vay:</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Họ tên Lãnh đạo/Cổ đông lớn..."
                          value={item.bridge_entity?.name || ""}
                          onChange={(e) => {
                            const u = [...corpRelatedList];
                            u[idx].bridge_entity = { ...u[idx].bridge_entity, name: e.target.value };
                            setCorpRelatedList(u);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl outline-none font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Số CCCD của Lãnh đạo"
                            value={item.bridge_entity?.identifier || ""}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, identifier: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl font-mono outline-none text-[10px]"
                          />
                          <select
                            value={item.bridge_entity?.role_or_relationship || "Chủ tịch HĐQT"}
                            onChange={(e) => {
                              const u = [...corpRelatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, role_or_relationship: e.target.value };
                              setCorpRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl outline-none text-[10px]"
                          >
                            <option value="Chủ tịch HĐQT">Là Chủ tịch HĐQT</option>
                            <option value="Thành viên HĐQT">Là Thành viên HĐQT</option>
                            <option value="Tổng Giám đốc">Là Tổng Giám đốc</option>
                            <option value="Cổ đông ≥5%">Là Cổ đông ≥5%</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {item.bridge_kind === "NONE" && (
                      <span className="text-gray-400 font-mono text-center block text-[11px]">Trực tiếp (0-Hop)</span>
                    )}
                  </td>

                  {/* CỘT TỶ LỆ % VỐN */}
                  <td className="p-2 text-center">
                    {item.requires_percentage ? (
                      <input
                        type="text"
                        value={item.ownership_ratio || "0%"}
                        onChange={(e) => {
                          const u = [...corpRelatedList];
                          u[idx].ownership_ratio = e.target.value;
                          setCorpRelatedList(u);
                        }}
                        className="w-full px-1.5 py-2 bg-white border border-purple-100 rounded-xl font-mono font-bold text-center text-gray-800 outline-none"
                      />
                    ) : (
                      <span className="text-gray-300 font-mono font-bold">--</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setCorpRelatedList(corpRelatedList.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}