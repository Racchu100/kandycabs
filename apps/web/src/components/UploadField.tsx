'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, Loader2, RefreshCw, FileText, AlertTriangle } from 'lucide-react';

export interface UploadFieldProps {
  label: string;
  required?: boolean;
  accept?: string;
  helperText?: string;
  selectedFile: File | null;
  storedPath?: string;
  uploadStatus?: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
  onFileSelect: (file: File | null) => void;
  showValidationError?: boolean;
}

export const UploadField: React.FC<UploadFieldProps> = ({
  label,
  required = false,
  accept = 'image/*,.pdf',
  helperText = 'JPG, PNG or PDF, up to 10MB',
  selectedFile,
  storedPath,
  uploadStatus = 'idle',
  errorMessage,
  onFileSelect,
  showValidationError = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isUploaded = uploadStatus === 'uploaded' || (!selectedFile && !!storedPath);
  const isUploading = uploadStatus === 'uploading';
  const hasError = uploadStatus === 'error' || !!errorMessage || (showValidationError && !isUploaded && !selectedFile);

  const displayFilename = selectedFile
    ? selectedFile.name
    : storedPath
    ? storedPath.split('/').pop() || label
    : '';

  const isImageFile =
    selectedFile?.type.startsWith('image/') ||
    (storedPath && !storedPath.endsWith('.pdf'));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const filePreviewUrl = selectedFile
    ? URL.createObjectURL(selectedFile)
    : storedPath
    ? `/api/driver/documents/file?path=${encodeURIComponent(storedPath)}`
    : null;

  return (
    <div className="w-full space-y-1">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
        className="hidden"
      />

      {/* UPLOADING STATE */}
      {isUploading ? (
        <div className="border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl p-3.5 sm:p-4 text-center flex flex-col items-center justify-center gap-1.5 shadow-2xs">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
          <span className="text-xs font-bold text-amber-800">Uploading {label}...</span>
          <span className="text-[10px] text-amber-600 font-medium">Please wait while file is optimized</span>
        </div>
      ) : isUploaded || selectedFile ? (
        /* UPLOADED STATE */
        <div className="border border-emerald-300/90 bg-emerald-50/50 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xs transition hover:border-emerald-400">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Image Preview or File Icon Badge */}
            {isImageFile && filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt={label}
                className="w-10 h-10 object-cover rounded-lg border border-emerald-300 shrink-0 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold border border-emerald-200 shrink-0">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-extrabold text-slate-800 truncate" title={displayFilename}>
                  {displayFilename || label}
                </p>
              </div>
              <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>✓ Uploaded</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-kandy-orange border border-slate-200 hover:border-kandy-orange text-[11px] font-extrabold rounded-lg shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Replace</span>
          </button>
        </div>
      ) : (
        /* EMPTY STATE / DROPZONE */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group border-2 border-dashed rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-kandy-orange bg-orange-50/50 scale-[0.99]'
              : hasError
              ? 'border-red-400 bg-red-50/30'
              : 'border-slate-300 hover:border-kandy-orange bg-slate-50/50 hover:bg-orange-50/20'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-orange-100 text-slate-400 group-hover:text-kandy-orange flex items-center justify-center mb-1.5 transition-colors">
            <UploadCloud className="w-4 h-4" />
          </div>
          
          <p className="text-xs font-extrabold text-slate-800 group-hover:text-kandy-orange transition-colors">
            {label} {required && <span className="text-red-500">*</span>}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 mb-2">{helperText}</p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-700 group-hover:text-kandy-orange border border-slate-300 group-hover:border-kandy-orange font-bold text-xs rounded-lg shadow-2xs group-hover:shadow-xs transition"
          >
            <span>Choose file</span>
          </button>
        </div>
      )}

      {/* Validation / Error text */}
      {hasError && errorMessage && (
        <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
      {hasError && !errorMessage && showValidationError && (
        <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <span>{label} is required</span>
        </p>
      )}
    </div>
  );
};
