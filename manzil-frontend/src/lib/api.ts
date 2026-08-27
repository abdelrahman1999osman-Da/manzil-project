/**
 * Production-ready API bases.
 *
 * Two independent backends:
 *  - Agent API  (VITE_API_BASE_URL):          /api/agent/*, /api/admin/agent/*, /api/auth/*
 *  - Property API (VITE_PROPERTY_API_BASE_URL): /api/predict, /api/analytics, /api/similar, /api/categories, /api/assistant/chat
 *
 * Development (both empty): "" → fetch("/api/...") goes through Vite proxy (vite.config.ts)
 *   - /api/agent/*, /api/admin/agent/* → 127.0.0.1:8010
 *   - /api/* (fallback) → 127.0.0.1:8000
 * Production: set both to public Render URLs.
 *   Example: VITE_API_BASE_URL=https://manzil-agent-api.onrender.com
 *            VITE_PROPERTY_API_BASE_URL=https://manzil-property-api.onrender.com
 *
 * Never put secrets (ADMIN_API_KEY / OPENAI_API_KEY / JWT_SECRET_KEY / DATABASE_URL) in VITE_* variables.
 */
const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
  return raw ? raw.replace(/\/$/, "") : "";
})();

const PROPERTY_API_BASE = (() => {
  const raw = (import.meta.env.VITE_PROPERTY_API_BASE_URL as string | undefined)?.trim() ?? "";
  if (raw) return raw.replace(/\/$/, "");
  // Fallback to Agent base if Property base not set (single-backend dev or prod)
  return API_BASE;
})();

function apiUrl(path: string): string {
  // Agent API path — expected to start with "/"
  return `${API_BASE}${path}`;
}

function propertyApiUrl(path: string): string {
  // Property API path — expected to start with "/"
  return `${PROPERTY_API_BASE}${path}`;
}

export interface CityMap {
  [city: string]: {
    Compound_District: string[];
    Location: string[];
  };
}

export interface Categories {
  "Property Type": string[];
  City_Map: CityMap;
}

export interface PredictionRequest {
  Beds: number;
  Baths: number;
  Area: number;
  Property_Type: string;
  City: string;
  Compound_District: string;
  Location: string;
  Listed_Price?: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_pct: number;
}

export interface InvestmentScore {
  listed_price: number;
  predicted_price: number;
  difference: number;
  difference_pct: number;
  rating: number;
  status: "excellent_deal" | "good_deal" | "fair_price" | "overpriced";
  label: string;
}

export interface PredictionResponse {
  price: number;
  confidence_interval: ConfidenceInterval | null;
  investment_score: InvestmentScore | null;
}

export interface FeatureContribution {
  feature: string;
  display: string;
  contribution: number;
  direction: "positive" | "negative";
}

export interface ExplainResponse {
  base_value: number;
  model_prediction: number;
  market_adjustment: number;
  final_prediction: number;
  feature_contributions: FeatureContribution[];
}

export interface SimilarProperty {
  price: number;
  area: number;
  beds: number;
  baths: number;
  city: string;
  district: string;
  location: string;
  type: string;
  distance: number;
  price_diff: number;
}

export interface SimilarResponse {
  similar_properties: SimilarProperty[];
}

export interface AnalyticsSummary {
  total: number;
  avg_price: number;
  median_price: number;
  avg_area: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  avg_price_by_city: { city: string; avg_price: number; count: number }[];
  avg_price_by_district: { district: string; avg_price: number; count: number }[];
  price_per_sqm_by_city: { city: string; avg_ppsm: number }[];
  price_distribution: { bins: number[]; counts: number[] };
  area_distribution: { bins: number[]; counts: number[] };
  property_type_distribution: Record<string, number>;
  price_vs_area: { Area: number; "Original Price": number; "Property Type": string }[];
  top_expensive: { city: string; avg_price: number }[];
  top_affordable: { city: string; avg_price: number }[];
  correlation: { area_price: number; beds_price: number; baths_price: number };
}

export async function fetchCategories(): Promise<Categories> {
  const res = await fetch(propertyApiUrl("/api/categories"));
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function predictPrice(
  data: PredictionRequest,
): Promise<PredictionResponse> {
  const res = await fetch(propertyApiUrl("/api/predict"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to predict price");
  return res.json();
}

export async function predictExplain(
  data: PredictionRequest,
): Promise<ExplainResponse> {
  const res = await fetch(propertyApiUrl("/api/predict/explain"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to explain prediction");
  return res.json();
}

export async function predictSimulate(
  data: PredictionRequest,
): Promise<{ price: number }> {
  const res = await fetch(propertyApiUrl("/api/predict/simulate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to simulate");
  return res.json();
}

export async function fetchSimilar(
  data: PredictionRequest,
): Promise<SimilarResponse> {
  const res = await fetch(propertyApiUrl("/api/similar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to fetch similar properties");
  return res.json();
}

export async function fetchAnalytics(
  city?: string,
  type?: string,
  signal?: AbortSignal,
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (type) params.set("type", type);
  const qs = params.toString();
  const res = await fetch(propertyApiUrl(`/api/analytics${qs ? `?${qs}` : ""}`), { signal });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentChatResponse {
  reply: string;
  tool: string | null;
  tool_status: string | null;
  refused: boolean;
}

export async function sendAgentChatMessage(
  message: string,
  history: AgentChatMessage[],
): Promise<AgentChatResponse> {
  const res = await fetch(apiUrl("/api/agent/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Failed to get response");
  return res.json();
}

// ──── Admin Agent Chat Types & Functions ────

export interface WorkflowStage {
  step: string;
  status: string;
  duration_seconds?: number | null;
}

export interface WorkflowToolData {
  workflow_status?: string;
  stages?: WorkflowStage[];
  records?: number | null;
  model?: string | null;
  failed_step?: string | null;
}

export interface AdminChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdminChatResponse {
  reply: string;
  tool: string | null;
  tool_status: string | null;
  refused: boolean;
  tool_data?: WorkflowToolData | null;
  task_id?: string | null;
}

export async function sendAdminChatMessage(
  message: string,
  history: AdminChatMessage[],
): Promise<AdminChatResponse> {
  // Admin auth in production should be JWT/session on the backend.
  // Keeping X-Admin-Key support for local dev where VITE_ADMIN_API_KEY
  // is optionally set, but it is NOT required and must never carry
  // production secrets in the client bundle.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const adminKey = (import.meta.env.VITE_ADMIN_API_KEY as string | undefined)?.trim();
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const res = await fetch(apiUrl("/api/admin/agent/chat"), {
    method: "POST",
    headers,
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Failed to get response");
  return res.json();
}

export async function fetchWorkflowStatus(taskId: string): Promise<WorkflowStatusResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const adminKey = (import.meta.env.VITE_ADMIN_API_KEY as string | undefined)?.trim();
  if (adminKey) headers["X-Admin-Key"] = adminKey;

  const res = await fetch(apiUrl(`/api/admin/agent/workflow/${encodeURIComponent(taskId)}`), {
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch workflow status");
  return res.json();
}

export interface WorkflowStatusResponse {
  task_id: string;
  status: string; // RUNNING | SUCCESS | FAILED
  reply?: string | null;
  tool_data?: WorkflowToolData | null;
  error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function formatEGP(value: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}
