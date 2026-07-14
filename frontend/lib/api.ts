const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface ScanOut {
  id: string;
  modality: string;
  file_url: string;
  preview_url: string;
  status: "uploaded" | "processing" | "done" | "failed";
  uploaded_at: string;
  screening_types?: string[];
}

export interface PredictionOut {
  scan_id: string;
  model_name: string;
  label: "pneumonia" | "normal";
  confidence: number;
  gradcam_url: string | null;
  inference_time_ms: number;
  created_at: string;
}

export interface ReportOut {
  scan_id: string;
  findings: string;
  impression: string;
  severity: "none" | "mild" | "moderate" | "severe";
  recommendation: string;
  citations: string[];
  generated_at: string;
}

export interface ChatCitation {
  text: string;
  source: string;
  title?: string;
  url?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  ts: string;
}

export interface ChatReply {
  reply: string;
  citations: ChatCitation[];
}

export interface Finding {
  condition: string;
  confidence: number;
  gradcam_url: string;
}

export interface PredictionMultiOut {
  scan_id: string;
  model_name: string;
  findings: Finding[];
  all_probabilities: Record<string, number>;
  created_at: string;
}

export interface ReportMultiOut {
  scan_id: string;
  findings: string;
  impression: string;
  severity: "none" | "moderate" | "significant";
  recommendation: string;
  citations: string[];
  generated_at: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers:
      options?.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body?.error?.message || body?.detail || detail;
    } catch {
      // response body wasn't JSON - fall back to statusText
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

/** Converts a backend-relative file path (e.g. "./uploads/gradcam/x.png")
 * into a fully qualified URL served by the backend's /files static mount. */
export function toFileUrl(path: string): string {
  const cleaned = path.replace(/^\.\//, "").replace(/^uploads\//, "");
  return `${API_BASE_URL}/files/${cleaned}`;
}

export const api = {
  uploadScan: (file: File): Promise<{ scan_id: string; status: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/scans/upload", { method: "POST", body: formData });
  },

  getScan: (scanId: string): Promise<ScanOut> => request(`/scans/${scanId}`),

  listScans: (limit = 10): Promise<{ scans: ScanOut[] }> => request(`/scans?limit=${limit}`),

  runPrediction: (scanId: string): Promise<PredictionOut> =>
    request(`/predict/${scanId}`, { method: "POST" }),

  getPrediction: (scanId: string): Promise<PredictionOut> => request(`/predict/${scanId}`),

  createReport: (scanId: string): Promise<ReportOut> =>
    request(`/report/${scanId}`, { method: "POST" }),

  getReport: (scanId: string): Promise<ReportOut> => request(`/report/${scanId}`),

  sendChatMessage: (scanId: string, message: string): Promise<ChatReply> =>
    request(`/chat/${scanId}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  getChatHistory: (scanId: string): Promise<{ messages: ChatMessage[] }> =>
    request(`/chat/${scanId}/history`),

  runMultiPrediction: (scanId: string): Promise<PredictionMultiOut> =>
    request(`/predict-multi/${scanId}`, { method: "POST" }),

  getMultiPrediction: (scanId: string): Promise<PredictionMultiOut> =>
    request(`/predict-multi/${scanId}`),

  createMultiReport: (scanId: string): Promise<ReportMultiOut> =>
    request(`/report-multi/${scanId}`, { method: "POST" }),

  getMultiReport: (scanId: string): Promise<ReportMultiOut> =>
    request(`/report-multi/${scanId}`),
};

export { ApiError };