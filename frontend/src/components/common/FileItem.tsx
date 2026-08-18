"use client";

import React from "react";
import { CheckCircle2, FileText, UploadCloud } from "lucide-react";

interface FileItemProps {
  label: string;
  filenamePattern: string;
  file: File | null;
  onSelect: (file: File) => void;
}

export default function FileItem({ label, filenamePattern, file, onSelect }: FileItemProps) {
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition ${
      file ? "bg-emerald-50/50 border-emerald-300" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          file ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
        }`}>
          {file ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-xs font-bold text-gray-800">{label}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            {file ? file.name : `Tệp yêu cầu: ${filenamePattern}`}
          </div>
        </div>
      </div>

      <label className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1.5 ${
        file ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-white border text-gray-700 hover:bg-gray-100 shadow-sm"
      }`}>
        <UploadCloud className="w-3.5 h-3.5" />
        <span>{file ? "Thay đổi tệp" : "Tải lên PDF"}</span>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onSelect(e.target.files[0]);
          }}
        />
      </label>
    </div>
  );
}