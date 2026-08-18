"use client";

import React from "react";
import { Edit3, ArrowRight } from "lucide-react";
import FileItem from "@/components/common/FileItem";

interface IntakeStep2UploadProps {
  customerType: "INDIVIDUAL" | "ENTERPRISE";
  individualFiles: { [key: string]: File | null };
  setIndividualFiles: (files: any) => void;
  enterpriseFiles: { [key: string]: File | null };
  setEnterpriseFiles: (files: any) => void;
  isProcessing: boolean;
  onStartExtract: () => void;
  onEnterManualMode: () => void;
}

export default function IntakeStep2Upload({
  customerType,
  individualFiles,
  setIndividualFiles,
  enterpriseFiles,
  setEnterpriseFiles,
  isProcessing,
  onStartExtract,
  onEnterManualMode,
}: IntakeStep2UploadProps) {
  const isIndividualReady = individualFiles.loan_application && individualFiles.national_id && individualFiles.related_declaration;
  const isEnterpriseReady = enterpriseFiles.loan_application && enterpriseFiles.rep_national_id && enterpriseFiles.business_license && enterpriseFiles.related_declaration;
  const isReady = customerType === "INDIVIDUAL" ? isIndividualReady : isEnterpriseReady;

  return (
    <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-xs space-y-6">
      <div>
        <span className="text-[11px] font-mono font-bold text-purple-600 uppercase tracking-wider">
          Bước 2: Cung cấp tài liệu hồ sơ bắt buộc ({customerType === "INDIVIDUAL" ? "Cá nhân (3 tệp)" : "Doanh nghiệp (4 tệp)"})
        </span>
        <h2 className="text-2xl font-black text-gray-900 mt-1">Đính kèm Hồ sơ</h2>
      </div>

      {customerType === "INDIVIDUAL" ? (
        <div className="space-y-4">
          <FileItem
            label="1. Giấy đề nghị vay vốn"
            filenamePattern="giay_de_nghi_vay_von.pdf"
            file={individualFiles.loan_application}
            onSelect={(file) => setIndividualFiles({ ...individualFiles, loan_application: file })}
          />
          <FileItem
            label="2. Căn cước công dân (CCCD)"
            filenamePattern="cccd.pdf"
            file={individualFiles.national_id}
            onSelect={(file) => setIndividualFiles({ ...individualFiles, national_id: file })}
          />
          <FileItem
            label="3. Bảng kê khai người có liên quan"
            filenamePattern="bang_ke_khai_lien_quan.pdf"
            file={individualFiles.related_declaration}
            onSelect={(file) => setIndividualFiles({ ...individualFiles, related_declaration: file })}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <FileItem
            label="1. Giấy đề nghị cấp tín dụng Doanh nghiệp"
            filenamePattern="giay_de_nghi_cap_tin_dung_dn.pdf"
            file={enterpriseFiles.loan_application}
            onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, loan_application: file })}
          />
          <FileItem
            label="2. CCCD Người đại diện theo pháp luật"
            filenamePattern="cccd_nguoi_dai_dien_phap_luat.pdf"
            file={enterpriseFiles.rep_national_id}
            onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, rep_national_id: file })}
          />
          <FileItem
            label="3. Giấy chứng nhận Đăng ký Doanh nghiệp (ĐKKD/ĐKMST)"
            filenamePattern="giay_chung_nhan_dang_ky_doanh_nghiep.pdf"
            file={enterpriseFiles.business_license}
            onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, business_license: file })}
          />
          <FileItem
            label="4. Bảng kê khai người có liên quan (Biểu mẫu Doanh nghiệp)"
            filenamePattern="bang_ke_khai_nguoi_co_lien_quan_dn.pdf"
            file={enterpriseFiles.related_declaration}
            onSelect={(file) => setEnterpriseFiles({ ...enterpriseFiles, related_declaration: file })}
          />
        </div>
      )}

      <div className="pt-6 border-t border-purple-50 flex items-center justify-between">
        <button
          onClick={onEnterManualMode}
          className="text-xs font-bold text-gray-500 hover:text-[#5B21B6] flex items-center gap-1.5 cursor-pointer"
        >
          <Edit3 className="w-4 h-4" /> Bỏ qua trích xuất & Nhập dữ liệu thủ công
        </button>
        <button
          disabled={!isReady || isProcessing}
          onClick={onStartExtract}
          className="px-8 py-3.5 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-sm font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? "Đang trích xuất OCR..." : "Bắt đầu trích xuất & Chuẩn hóa"}
        </button>
      </div>
    </div>
  );
}