const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/routes/api.php";

type ApiResponse<T = Record<string, unknown>> = {
  success: boolean;
  message?: string;
  user?: T;
};

export async function backendRequest<T>(
  action: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`, {
    credentials: "include",
    ...options,
  });

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(`Backend request failed (${action}): ${response.status}`);
  }

  return data;
}

export function loginRequest(username: string, password: string) {
  return backendRequest<ApiResponse>("login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function meRequest() {
  return backendRequest<ApiResponse>("me");
}
