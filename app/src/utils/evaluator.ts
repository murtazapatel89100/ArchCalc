import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { sha1, sha256, sha512 } from 'js-sha256';
import { Base64 } from 'js-base64';
import { invoke } from '@tauri-apps/api/core';

export interface EvalResult {
  value: string;
  type: "calc" | "dev" | "conv" | "error";
  raw?: any;
}

export const evaluator = {
  async process(query: string): Promise<EvalResult | null> {
    if (!query || !query.trim()) return null;
    
    const lower = query.toLowerCase().trim();

    // 1. UUID Generation
    if (lower === "uuid") {
      return { value: uuidv4(), type: "dev" };
    }

    // 2. Hash Generation
    if (lower.startsWith("sha256 ")) {
      const text = query.substring(7);
      return { value: sha256(text), type: "dev" };
    }
    if (lower.startsWith("sha1 ")) {
      const text = query.substring(5);
      return { value: sha1(text), type: "dev" };
    }
    if (lower.startsWith("sha512 ")) {
      const text = query.substring(7);
      return { value: sha512(text), type: "dev" };
    }

    // 3. Base64
    if (lower.startsWith("base64 encode ")) {
      const text = query.substring(14);
      return { value: Base64.encode(text), type: "dev" };
    }
    if (lower.startsWith("base64 decode ")) {
      const text = query.substring(14);
      try {
        return { value: Base64.decode(text), type: "dev" };
      } catch (e) {
        return { value: "Invalid Base64", type: "error" };
      }
    }

    // 4. Timestamp
    if (lower === "timestamp now" || lower === "now") {
      return { value: Date.now().toString(), type: "dev" };
    }

    // 5. Conversions
    // Basic "X gb in mb" pattern
    const convMatch = lower.match(/^([\d.]+)\s*([a-z]+)\s+(?:in|to)\s+([a-z]+)$/);
    if (convMatch) {
      const val = parseFloat(convMatch[1]);
      const from = convMatch[2];
      const to = convMatch[3];
      
      const res = this.convert(val, from, to);
      if (res !== null) {
        return { value: res, type: "conv" };
      }
    }

    // 6. Natural language Math
    // e.g. "15% of 5000" or "15 percent of 5000"
    const percentMatch = lower.match(/^([\d.]+)\s*(?:%|percent)\s+of\s+([\d.]+)$/);
    if (percentMatch) {
      const pct = parseFloat(percentMatch[1]);
      const base = parseFloat(percentMatch[2]);
      return { value: ((pct / 100) * base).toString(), type: "calc" };
    }

    // 7. Math Parsing
    try {
      const result = await this.math(query);
      return { value: result, type: "calc" };
    } catch (e) {
      // Not a valid math expression, return null to show no result
      return null;
    }
  },

  async math(expression: string, context: Record<string, number> = {}): Promise<string> {
    // Replace variables from context.
    let sanitized = expression;
    
    // Replace variables
    for (const [key, value] of Object.entries(context)) {
      // Use regex to replace whole words only
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      sanitized = sanitized.replace(regex, value.toString());
    }

    sanitized = sanitized.replace(/[^0-9+\-*/.() %]/g, "");
    if (!sanitized.trim()) throw new Error("Empty expression");
    
    const withPercent = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    
    // Call the Rust backend instead of eval
    const result = await invoke<string>("evaluate", { expression: withPercent });
    return result;
  },

  convert(value: number, from: string, to: string): string | null {
    // Storage
    const storageMultiplier: Record<string, number> = {
      b: 1, kb: 1024, mb: 1024**2, gb: 1024**3, tb: 1024**4, pb: 1024**5
    };
    if (storageMultiplier[from] && storageMultiplier[to]) {
      const inBytes = value * storageMultiplier[from];
      const result = inBytes / storageMultiplier[to];
      return `${result.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${to.toUpperCase()}`;
    }

    // Length
    const lengthInMeters: Record<string, number> = {
      mm: 0.001, cm: 0.01, m: 1, km: 1000, 
      in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34
    };
    if (lengthInMeters[from] && lengthInMeters[to]) {
      const inMeters = value * lengthInMeters[from];
      const result = inMeters / lengthInMeters[to];
      return `${result.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${to}`;
    }

    // Weight
    const weightInKg: Record<string, number> = {
      mg: 0.000001, g: 0.001, kg: 1, t: 1000,
      oz: 0.0283495, lb: 0.453592
    };
    if (weightInKg[from] && weightInKg[to]) {
      const inKg = value * weightInKg[from];
      const result = inKg / weightInKg[to];
      return `${result.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${to}`;
    }

    // Temperature (needs custom formula)
    if (from === "c" && to === "f") return `${((value * 9/5) + 32).toFixed(2)} °F`;
    if (from === "f" && to === "c") return `${((value - 32) * 5/9).toFixed(2)} °C`;
    if (from === "c" && to === "k") return `${(value + 273.15).toFixed(2)} K`;
    if (from === "k" && to === "c") return `${(value - 273.15).toFixed(2)} °C`;
    if (from === "f" && to === "k") return `${((value - 32) * 5/9 + 273.15).toFixed(2)} K`;
    if (from === "k" && to === "f") return `${((value - 273.15) * 9/5 + 32).toFixed(2)} °F`;

    return null;
  }
};
