"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import IntakeStep1LoanId from "./intake/IntakeStep1LoanId";
import IntakeStep2Upload from "./intake/IntakeStep2Upload";
import IntakeStep3IndividualForm from "./intake/IntakeStep3IndividualForm";
import IntakeStep3EnterpriseForm from "./intake/IntakeStep3EnterpriseForm";
import { UserSession } from "@/types";

interface IntakeWizardProps {
  session: UserSession;
  onSuccessComplete: () => void;
}

export default function IntakeWizard({ session, onSuccessComplete }: IntakeWizardProps) {
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3>(1);
  const [customerType, setCustomerType] = useState<"INDIVIDUAL" | "ENTERPRISE">("INDIVIDUAL");
  const [loanId, setLoanId] = useState<string>("");
  const [appId, setAppId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Files
  const [individualFiles, setIndividualFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null, national_id: null, related_declaration: null,
  });
  const [enterpriseFiles, setEnterpriseFiles] = useState<{ [key: string]: File | null }>({
    loan_application: null, rep_national_id: null, business_license: null, related_declaration: null,
  });

  // Forms Cá nhân
  const [borrowerForm, setBorrowerForm] = useState<any>({
    full_name: "", cccd_id: "", dob: "", gender: "Nam", nationality: "Việt Nam",
    place_of_origin: "", place_of_residence: "", date_of_expiry: "", phone: "", email: ""
  });
  const [loanForm, setLoanForm] = useState<any>({
    purpose: "Vay bổ sung vốn sản xuất kinh doanh",
    loan_amount: "500000000",
    term_months: "36",
    repayment_source: "Doanh thu hoạt động sản xuất kinh doanh"
  });
  const [relatedList, setRelatedList] = useState<any[]>([
    {
      id: "1",
      entity_type: "INDIVIDUAL",
      name: "",
      identifier: "",
      nationality: "Việt Nam",
      relation_point: "d",
      relation_tier: "mandatory",
      specific_relationship: "Vợ/chồng",
      position: "N/A",
      ownership_ratio: "0%",
      requires_percentage: false,
      requires_bridge: false,
      bridge_entity: { name: "", identifier: "", role_or_relationship: "" }
    }
  ]);

  // Forms Doanh nghiệp
  const [enterpriseForm, setEnterpriseForm] = useState<any>({
    company_name: "", short_name: "", tax_code: "", charter_capital: "50.000.000.000 VND",
    headquarters_address: "", business_sector: "", nationality: "Việt Nam",
    is_foreign_entity: false, ownership_chain_verified: true
  });
  const [repForm, setRepForm] = useState<any>({
    full_name: "", cccd_id: "", dob: "", gender: "Nam", nationality: "Việt Nam",
    position: "Tổng Giám đốc", phone: "", email: "", current_address: ""
  });
  const [corpLoanForm, setCorpLoanForm] = useState<any>({
    purpose: "Vay bổ sung vốn lưu động phục vụ sản xuất kinh doanh",
    loan_amount: "5000000000",
    term_months: "12",
    repayment_source: "Doanh thu từ hoạt động sản xuất kinh doanh"
  });
  const [corpRelatedList, setCorpRelatedList] = useState<any[]>([
    {
      id: "1",
      entity_type: "ORGANIZATION",
      name: "",
      identifier: "",
      nationality: "Việt Nam",
      relation_point: "a",
      relation_tier: "mandatory",
      specific_relationship: "Công ty mẹ",
      position: "N/A",
      ownership_ratio: "51%",
      requires_percentage: true,
      requires_bridge: false,
      bridge_entity: { name: "", identifier: "", role_or_relationship: "" }
    }
  ]);

  const handleGenerateLoanId = async (cType: "INDIVIDUAL" | "ENTERPRISE") => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/credit/generate-loan-id?customer_type=${cType}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setLoanId(data.suggested_loan_id);
    } catch (err) {
      const prefix = cType === "INDIVIDUAL" ? "LN" : "CORP";
      setLoanId(`${prefix}-${new Date().toISOString().slice(0,7).replace("-","")}-0001`);
    }
  };

  useEffect(() => {
    handleGenerateLoanId("INDIVIDUAL");
  }, []);

  const handleProceedToUploadStep = () => {
    if (!loanId.trim()) {
      alert("Vui lòng nhập hoặc tạo mã tín dụng.");
      return;
    }
    const prefix = customerType === "INDIVIDUAL" ? "APP" : "CORP";
    setAppId(`${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setIntakeStep(2);
  };

  const handleStartUnderwriting = async () => {
    setIsProcessing(true);
    const formData = new FormData();

    if (customerType === "INDIVIDUAL") {
      formData.append("loan_application", individualFiles.loan_application!);
      formData.append("national_id", individualFiles.national_id!);
      formData.append("related_declaration", individualFiles.related_declaration!);

      try {
        const res = await fetch("http://localhost:8000/api/v1/credit/process-individual", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const data = await res.json();
        setBorrowerForm(data.borrower_profile);
        setLoanForm(data.loan_details);
        setRelatedList(data.related_group?.length ? data.related_group : relatedList);
        setIntakeStep(3);
      } catch (err: any) {
        alert("Lỗi trích xuất: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      formData.append("loan_application", enterpriseFiles.loan_application!);
      formData.append("rep_national_id", enterpriseFiles.rep_national_id!);
      formData.append("business_license", enterpriseFiles.business_license!);
      formData.append("related_declaration", enterpriseFiles.related_declaration!);

      try {
        const res = await fetch("http://localhost:8000/api/v1/credit/process-enterprise", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const data = await res.json();
        setEnterpriseForm(data.enterprise_profile);
        setRepForm(data.representative);
        setCorpLoanForm(data.loan_details);
        setCorpRelatedList(data.related_group?.length ? data.related_group : corpRelatedList);
        setIntakeStep(3);
      } catch (err: any) {
        alert("Lỗi trích xuất: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleAddRelated = () => {
    if (customerType === "INDIVIDUAL") {
      setRelatedList([
        ...relatedList,
        {
          id: String(Date.now()),
          entity_type: "INDIVIDUAL",
          name: "",
          identifier: "",
          nationality: "Việt Nam",
          relation_point: "d",
          relation_tier: "mandatory",
          specific_relationship: "Vợ/chồng",
          position: "N/A",
          ownership_ratio: "0%",
          requires_percentage: false,
          requires_bridge: false,
          bridge_entity: { name: "", identifier: "", role_or_relationship: "" }
        }
      ]);
    } else {
      setCorpRelatedList([
        ...corpRelatedList,
        {
          id: String(Date.now()),
          entity_type: "ORGANIZATION",
          name: "",
          identifier: "",
          nationality: "Việt Nam",
          relation_point: "a",
          relation_tier: "mandatory",
          specific_relationship: "Công ty mẹ",
          position: "N/A",
          ownership_ratio: "51%",
          requires_percentage: true,
          requires_bridge: false,
          bridge_entity: { name: "", identifier: "", role_or_relationship: "" }
        }
      ]);
    }
  };

  const handleSaveDraftApplicationToSandbox = async () => {
    if (customerType === "INDIVIDUAL") {
      if (!borrowerForm.full_name || !borrowerForm.cccd_id || borrowerForm.cccd_id === "NOT_FOUND") {
        alert("Vui lòng nhập đầy đủ Họ tên và Số CCCD của người vay.");
        return;
      }
    } else {
      if (!enterpriseForm.company_name || !enterpriseForm.tax_code || enterpriseForm.tax_code === "NOT_FOUND") {
        alert("Vui lòng nhập Tên doanh nghiệp và Mã số doanh nghiệp (MSDN/MST).");
        return;
      }
      if (!repForm.full_name || !repForm.cccd_id || repForm.cccd_id === "NOT_FOUND") {
        alert("Vui lòng nhập Họ tên và Số CCCD của Người đại diện pháp luật.");
        return;
      }
    }

    setIsSaving(true);
    setSavedSuccessMsg(null);

    const payload = {
      application_id: appId,
      loan_id: loanId,
      customer_type: customerType,
      individual_profile: customerType === "INDIVIDUAL" ? borrowerForm : null,
      enterprise_profile: customerType === "ENTERPRISE" ? enterpriseForm : null,
      representative: customerType === "ENTERPRISE" ? repForm : null,
      loan_details: {
        loan_id: loanId,
        purpose: customerType === "INDIVIDUAL" ? loanForm.purpose : corpLoanForm.purpose,
        loan_amount: customerType === "INDIVIDUAL" ? loanForm.loan_amount : corpLoanForm.loan_amount,
        term_months: customerType === "INDIVIDUAL" ? loanForm.term_months : corpLoanForm.term_months,
        repayment_source: customerType === "INDIVIDUAL" ? loanForm.repayment_source : corpLoanForm.repayment_source,
      },
      related_group: customerType === "INDIVIDUAL" ? relatedList : corpRelatedList
    };

    try {
      const res = await fetch("http://localhost:8000/api/v1/credit/save-draft-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lưu thất bại");

      setSavedSuccessMsg(data.message);
      setTimeout(() => {
        onSuccessComplete();
      }, 1500);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {intakeStep === 1 && (
        <IntakeStep1LoanId
          customerType={customerType}
          setCustomerType={setCustomerType}
          loanId={loanId}
          setLoanId={setLoanId}
          onGenerateLoanId={handleGenerateLoanId}
          onProceed={handleProceedToUploadStep}
        />
      )}

      {intakeStep === 2 && (
        <IntakeStep2Upload
          customerType={customerType}
          individualFiles={individualFiles}
          setIndividualFiles={setIndividualFiles}
          enterpriseFiles={enterpriseFiles}
          setEnterpriseFiles={setEnterpriseFiles}
          isProcessing={isProcessing}
          onStartExtract={handleStartUnderwriting}
          onEnterManualMode={() => setIntakeStep(3)}
        />
      )}

      {intakeStep === 3 && (
        <div className="space-y-8">
          {savedSuccessMsg && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-emerald-900 text-xs flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Đã ghi nhận dữ liệu thành công!</div>
                <p className="text-emerald-700 mt-1">{savedSuccessMsg}</p>
              </div>
            </div>
          )}

          {customerType === "INDIVIDUAL" ? (
            <IntakeStep3IndividualForm
              loanId={loanId}
              borrowerForm={borrowerForm}
              setBorrowerForm={setBorrowerForm}
              loanForm={loanForm}
              setLoanForm={setLoanForm}
              relatedList={relatedList}
              setRelatedList={setRelatedList}
              onAddRelated={handleAddRelated}
            />
          ) : (
            <IntakeStep3EnterpriseForm
              loanId={loanId}
              enterpriseForm={enterpriseForm}
              setEnterpriseForm={setEnterpriseForm}
              repForm={repForm}
              setRepForm={setRepForm}
              corpLoanForm={corpLoanForm}
              setCorpLoanForm={setCorpLoanForm}
              corpRelatedList={corpRelatedList}
              setCorpRelatedList={setCorpRelatedList}
              onAddRelated={handleAddRelated}
            />
          )}

          <div className="p-6 bg-white rounded-3xl border border-purple-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 font-mono">
              Cơ chế lưu: <span className="text-purple-900 font-bold">UPSERT THỰC THỂ (TRỰC TIẾP & BẮC CẦU) VÀO MASTER DB + LƯU KHOẢN VAY VÀO SANDBOX</span>
            </div>
            <button
              disabled={isSaving}
              onClick={handleSaveDraftApplicationToSandbox}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B1878] hover:to-[#5B21B6] text-white text-sm font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Đang lưu & nạp dữ liệu..." : "Lưu & Chuyển sang Theo dõi Pipeline"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}