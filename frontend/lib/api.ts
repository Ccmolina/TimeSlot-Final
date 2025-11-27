import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";


const BASE =
  Platform.OS === "web"
    ? "http://localhost:4000"        
    : "http://192.168.12.197:4000";  

console.log("🔎 BASE =", BASE);

export type ApiOpts = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  withAuth?: boolean;
};

export async function api<T = any>(
  path: string,
  opts: ApiOpts = {}
): Promise<T> {
  const url = `${BASE}${path}`;
  const useAuth = opts.withAuth ?? true;

  let authHeader: Record<string, string> = {};

  if (useAuth) {
    try {
      let token: string | null = null;

      if (Platform.OS === "web") {
        token = localStorage.getItem("token");
      } else {
        token = await AsyncStorage.getItem("token");
      }

      if (token) {
        authHeader.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.log("[API] no se pudo leer token:", err);
    }
  }

  console.log("[API] →", url, opts.method ?? "GET");

  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...(opts.headers ?? {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.log("[API] respuesta no JSON:", text);
        throw new Error("Respuesta no válida del servidor");
      }
    }

    if (!res.ok) {
      const d = data as any;
      throw new Error(d?.error || `HTTP ${res.status}`);
    }

    return data as T;
  } catch (e) {
    console.log("[API] error:", e instanceof Error ? e.message : e);
    if (e instanceof Error) {
      throw e;
    }
    throw new Error("No se pudo conectar con el servidor");
  }
}
