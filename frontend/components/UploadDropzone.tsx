"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileImage, Loader2 } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  uploading?: boolean;
}

const ACCEPTED = [".dcm", ".png", ".jpg", ".jpeg"];

export function UploadDropzone({ onFileSelected, uploading }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) selectFile(file);
    },
    [selectFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={[
        "relative rounded-card border-2 border-dashed cursor-pointer transition-colors",
        "flex flex-col items-center justify-center text-center px-8 py-16",
        dragActive
          ? "border-sage bg-sage-soft"
          : "border-line bg-white hover:border-sage-muted",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) selectFile(file);
        }}
      />

      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 text-sage animate-spin mb-4" strokeWidth={1.5} />
          <p className="text-sm text-sage-muted">Uploading study…</p>
        </>
      ) : fileName ? (
        <>
          <FileImage className="h-8 w-8 text-sage mb-3" strokeWidth={1.5} />
          <p className="font-medium text-ink mb-1">{fileName}</p>
          <p className="text-sm text-sage-muted">
            Ready to review. Drop a different file to replace it.
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="h-8 w-8 text-sage-muted mb-3" strokeWidth={1.5} />
          <p className="font-medium text-ink mb-1">
            Drag a chest X-ray here, or click to browse
          </p>
          <p className="text-sm text-sage-muted">
            Accepts {ACCEPTED.join(" · ").toUpperCase()}
          </p>
        </>
      )}
    </div>
  );
}