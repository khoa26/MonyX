"use client";

import React from "react";
import { CreditCard, FileText, Users, Plus, Trash2, GitFork } from "lucide-react";
import { INDIVIDUAL_RELATION_TAXONOMY, BridgeKind } from "@/types";

interface IntakeStep3IndividualFormProps {
  loanId: string;
  borrowerForm: any;
  setBorrowerForm: (form: any) => void;
  loanForm: any;
  setLoanForm: (form: any) => void;
  relatedList: any[];
  setRelatedList: (list: any[]) => void;
  onAddRelated: () => void;
}

export default function IntakeStep3IndividualForm({
  loanId,
  borrowerForm,
  setBorrowerForm,
  loanForm,
  setLoanForm,
  relatedList,
  setRelatedList,
  onAddRelated,
}: IntakeStep3IndividualFormProps) {
  return (
    <div className="space-y-6">
      {/* 1. THÔNG TIN CCCD */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
            <CreditCard className="w-5 h-5 text-[#5B21B6]" />
            <span>1. Thông tin Định danh Cá nhân (CCCD)</span>
          </div>
          <span className="text-[11px] font-mono bg-purple-50 text-purple-900 font-bold px-3 py-1 rounded-full border border-purple-100">
            Lưu/Cập nhật vào Master DB
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-gray-500 font-semibold mb-1">Họ và tên (*)</label>
            <input
              type="text"
              required
              placeholder="Họ và tên đầy đủ"
              value={borrowerForm.full_name || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-bold text-gray-900 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Số định danh CCCD (12 số) (*)</label>
            <input
              type="text"
              required
              placeholder="số CCCD"
              value={borrowerForm.cccd_id || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, cccd_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono font-bold text-[#5B21B6] focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Ngày sinh (DD/MM/YYYY)</label>
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={borrowerForm.dob || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, dob: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Giới tính</label>
            <select
              value={borrowerForm.gender || "Nam"}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, gender: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none font-medium"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Quốc tịch (*)</label>
            <input
              type="text"
              value={borrowerForm.nationality || "Việt Nam"}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, nationality: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Quê quán</label>
            <input
              type="text"
              placeholder="Bình Dương"
              value={borrowerForm.place_of_origin || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, place_of_origin: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-500 font-semibold mb-1">Địa chỉ thường trú</label>
            <input
              type="text"
              placeholder="Thủ Dầu Một, Bình Dương"
              value={borrowerForm.place_of_residence || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, place_of_residence: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Giá trị đến ngày</label>
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={borrowerForm.date_of_expiry || ""}
              onChange={(e) => setBorrowerForm({ ...borrowerForm, date_of_expiry: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. NHU CẦU CẤP TÍN DỤNG */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
            <FileText className="w-5 h-5 text-[#6D28D9]" />
            <span>2. Nhu cầu Cấp Tín dụng Đề xuất ({loanId})</span>
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
              value={loanForm.purpose || ""}
              onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-semibold text-gray-800 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Số tiền đề nghị vay (VND) (*)</label>
            <input
              type="text"
              placeholder="500000000"
              value={loanForm.loan_amount || ""}
              onChange={(e) => setLoanForm({ ...loanForm, loan_amount: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-mono font-bold text-purple-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Thời hạn vay (tháng)</label>
            <input
              type="text"
              placeholder="36"
              value={loanForm.term_months || ""}
              onChange={(e) => setLoanForm({ ...loanForm, term_months: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl font-bold outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-500 font-semibold mb-1">Nguồn trả nợ dự kiến</label>
            <input
              type="text"
              value={loanForm.repayment_source || ""}
              onChange={(e) => setLoanForm({ ...loanForm, repayment_source: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-purple-50/30 border border-purple-100 rounded-xl text-gray-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. BẢNG QUAN HỆ TRỰC TIẾP & BẮC CẦU */}
      <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-purple-50">
          <div>
            <div className="flex items-center gap-2.5 font-extrabold text-gray-900 text-base">
              <Users className="w-5 h-5 text-purple-700" />
              <span>3. Danh sách Người & Doanh nghiệp có Quan hệ (Điều 136)</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Khai báo trực tiếp 0-Hop (Điểm d, c, b, e) hoặc bắc cầu qua Người thân trung gian (Điểm đ).
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
              {relatedList.map((item, idx) => (
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
                        const u = [...relatedList];
                        u[idx].name = e.target.value;
                        setRelatedList(u);
                      }}
                      placeholder="Họ tên hoặc tên DN đích"
                      className="w-full px-3 py-2 bg-white border border-purple-100 rounded-xl font-bold text-gray-900 outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={item.identifier || ""}
                      onChange={(e) => {
                        const u = [...relatedList];
                        u[idx].identifier = e.target.value;
                        setRelatedList(u);
                      }}
                      placeholder="CCCD hoặc MST"
                      className="w-full px-3 py-2 bg-white border border-purple-100 rounded-xl font-mono text-gray-700 outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={item.specific_relationship || "Vợ/chồng"}
                      onChange={(e) => {
                        const val = e.target.value;
                        let point = "d";
                        let reqPct = false;
                        let bKind: BridgeKind = "NONE";
                        let targetType: "INDIVIDUAL" | "ORGANIZATION" = "INDIVIDUAL";

                        for (const g of INDIVIDUAL_RELATION_TAXONOMY) {
                          const found = g.options.find(o => o.label === val);
                          if (found) {
                            point = found.point;
                            reqPct = found.requires_percentage;
                            bKind = found.bridge_kind;
                            targetType = found.target_type;
                            break;
                          }
                        }

                        const u = [...relatedList];
                        u[idx].specific_relationship = val;
                        u[idx].relation_point = point;
                        u[idx].requires_percentage = reqPct;
                        u[idx].bridge_kind = bKind;
                        u[idx].entity_type = targetType;
                        setRelatedList(u);
                      }}
                      className="w-full px-2.5 py-2 border border-purple-100 rounded-xl text-[11px] font-semibold outline-none bg-purple-50/50 text-purple-900"
                    >
                      {INDIVIDUAL_RELATION_TAXONOMY.map((grp) => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.options.map((opt) => (
                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>

                  {/* CỘT THỰC THỂ BẮC CẦU XÁC ĐỊNH CHÍNH XÁC */}
                  <td className="p-2">
                    {item.bridge_kind === "INDIV_RELATIVE_TO_CORP" ? (
                      <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 text-[11px]">
                        <div className="flex items-center gap-1 text-[#5B21B6] font-bold">
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Người thân trung gian (Person):</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Họ tên người thân (vợ/chồng/con...)"
                          value={item.bridge_entity?.name || ""}
                          onChange={(e) => {
                            const u = [...relatedList];
                            u[idx].bridge_entity = { ...u[idx].bridge_entity, name: e.target.value };
                            setRelatedList(u);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-100 rounded-xl outline-none font-bold"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="Số CCCD người thân"
                            value={item.bridge_entity?.identifier || ""}
                            onChange={(e) => {
                              const u = [...relatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, identifier: e.target.value };
                              setRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl font-mono outline-none text-[10px]"
                          />
                          <select
                            value={item.bridge_entity?.role_or_relationship || "Vợ/chồng"}
                            onChange={(e) => {
                              const u = [...relatedList];
                              u[idx].bridge_entity = { ...u[idx].bridge_entity, role_or_relationship: e.target.value };
                              setRelatedList(u);
                            }}
                            className="w-full px-2 py-1.5 bg-white border border-purple-100 rounded-xl outline-none text-[10px]"
                          >
                            <option value="Vợ/chồng">Là Vợ/chồng</option>
                            <option value="Con đẻ">Là Con đẻ</option>
                            <option value="Cha mẹ đẻ">Là Cha mẹ đẻ</option>
                            <option value="Anh/chị/em ruột">Là Anh/chị/em ruột</option>
                          </select>
                        </div>
                      </div>
                    ) : (
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
                          const u = [...relatedList];
                          u[idx].ownership_ratio = e.target.value;
                          setRelatedList(u);
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
                      onClick={() => setRelatedList(relatedList.filter((_, i) => i !== idx))}
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