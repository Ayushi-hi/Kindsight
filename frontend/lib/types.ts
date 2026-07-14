export type ScanStatus = "uploaded" | "processing" | "done" | "failed";

export interface Scan {
  id: string;
  modality: "chest_xray";
  fileUrl: string;
  fileType: "dicom" | "png" | "jpg";
  uploadedAt: string;
  status: ScanStatus;
  patientRef?: string;
}

export interface Prediction {
  scanId: string;
  modelName: string;
  label: "pneumonia" | "normal";
  confidence: number; // 0..1, calibrated
  gradcamUrl: string;
  inferenceTimeMs: number;
}

export type Severity = "mild" | "moderate" | "severe";

export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
}

export interface Report {
  scanId: string;
  findings: string;
  impression: string;
  severity: Severity;
  recommendation: string;
  citations: Citation[];
  generatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  ts: string;
}
