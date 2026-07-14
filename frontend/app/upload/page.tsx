"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import { uploadScan } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const valid = /\.(dcm|png|jpe?g)$/i.test(file.name);
    if (!valid) {
      setError("Unsupported file type. Please upload a DICOM, PNG, or JPG chest X-ray.");
      return;
    }
    setUploading(true);
    try {
      const scan = await uploadScan(file);
      router.push(`/scan/${scan.id}`);
    } catch {
      setError("Upload failed. Check your connection and try again.");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-xl font-semibold text-ink mb-1">New scan</h1>
      <p className="text-sm text-ink-muted mb-8">
        Upload a chest X-ray to run pneumonia detection, generate a structured report, and
        enable the study-specific chat assistant.
      </p>

      <UploadDropzone onFileSelected={handleFile} uploading={uploading} />

      {error && (
        <p className="mt-4 text-sm text-red border border-red/30 bg-red/10 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4 font-mono text-[11px] text-ink-muted">
        <div className="border border-line rounded px-3 py-2">1. UPLOAD → preprocess</div>
        <div className="border border-line rounded px-3 py-2">2. MODEL → Grad-CAM</div>
        <div className="border border-line rounded px-3 py-2">3. REPORT → RAG-grounded</div>
      </div>
    </div>
  );
}
