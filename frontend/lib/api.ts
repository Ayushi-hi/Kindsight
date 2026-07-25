import { getToken, clearSession } from "./auth";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface ScanOut {
  id: string;
  modality: string;
  file_url: string;
  preview_url: string;
  status: "uploaded" | "processing" | "done" | "failed";
  uploaded_at: string;
  screening_types?: string[];
  label?: string | null;
  confidence?: number | null;
}

export interface ScanListResponse {
  scans: ScanOut[];
  total: number;
  page: number;
  page_size: number;
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

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

// NEW: for the Reports list page - one row per generated report, covering
// BOTH the pneumonia ("single") and 14-condition ("multilabel") pipelines.
export interface ReportListItem {
  scan_id: string;
  report_type: "single" | "multilabel";
  impression: string;
  severity: string;
  recommendation: string;
  citations: string[];
  generated_at: string;
  preview_url: string | null;
  modality: string | null;
}

export interface ReportListResponse {
  reports: ReportListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface KnowledgeChunk {
  id: string;
  text: string;
  source: string;
  title: string;
  url: string;
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
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
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

    if (response.status === 401 && typeof window !== "undefined") {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
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

  register: (payload: { email: string; password: string; full_name: string }): Promise<AuthTokenResponse> =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }): Promise<AuthTokenResponse> =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  me: (): Promise<AuthUser> => request("/auth/me"),

  updateMe: (payload: { full_name?: string; email?: string }): Promise<AuthUser> =>
    request("/auth/me", { method: "PUT", body: JSON.stringify(payload) }),

  changePassword: (payload: { current_password: string; new_password: string }): Promise<{ status: string }> =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  forgotPassword: (payload: { email: string }): Promise<{ status: string; message: string }> =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),

  resetPassword: (payload: { token: string; new_password: string }): Promise<{ status: string }> =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),

  verifyEmail: (payload: { token: string }): Promise<{ status: string }> =>
    request("/auth/verify-email", { method: "POST", body: JSON.stringify(payload) }),

  getScan: (scanId: string): Promise<ScanOut> => request(`/scans/${scanId}`),

  listScans: (limit = 10): Promise<{ scans: ScanOut[] }> => request(`/scans?limit=${limit}`),

  listScansPage: (page = 1, pageSize = 10): Promise<ScanListResponse> =>
    request(`/scans?page=${page}&page_size=${pageSize}`),

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

  // NEW: powers the Reports list page.
  listReports: (page = 1, pageSize = 10): Promise<ReportListResponse> =>
    request(`/reports?page=${page}&page_size=${pageSize}`),

  listKnowledge: (): Promise<{ chunks: KnowledgeChunk[]; total: number }> => request(`/knowledge`),
};

export { ApiError };