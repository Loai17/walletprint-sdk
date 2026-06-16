import { WalletPrintApiError, normalizeBaseUrl } from "./errors.js";
import type {
  FeedbackRequest,
  FeedbackResponse,
  ScoreRequest,
  ScoreResponse,
  WalletPrintClientOptions,
} from "./types.js";

export class WalletPrintClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WalletPrintClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async score(request: ScoreRequest): Promise<ScoreResponse> {
    return this.request<ScoreResponse>("POST", "/v1/score", request);
  }

  async submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    return this.request<FeedbackResponse>("POST", "/v1/feedback", request);
  }

  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>("GET", "/health");
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await parseJson(response);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : `WalletPrint API request failed with status ${response.status}`;
      throw new WalletPrintApiError(message, response.status, payload);
    }

    return payload as T;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
