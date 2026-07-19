import { NextRequest } from "next/server";

function isValidIP(ip: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split(".").every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  if (/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) return true;
  return false;
}

function isPrivateIP(ip: string): boolean {
  if (!ip.includes(".")) return false;
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127
  );
}

export function getClientIP(req: NextRequest): string {
  const headersToCheck = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];

  for (const header of headersToCheck) {
    const value = req.headers.get(header);
    if (!value) continue;

    const ips = value.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (isValidIP(ip) && !isPrivateIP(ip)) {
        return ip;
      }
    }
  }

  return "unknown";
}

/** Extract IP from a Headers object (e.g. from next/headers). */
export function getClientIPFromHeaders(headers: Headers): string {
  const headersToCheck = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];

  for (const header of headersToCheck) {
    const value = headers.get(header);
    if (!value) continue;

    const ips = value.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (isValidIP(ip) && !isPrivateIP(ip)) {
        return ip;
      }
    }
  }

  return "unknown";
}

export function classifyTag(action: string): string {
  if (/^(login|logout|session|failed_login)/.test(action)) return "security";
  if (
    /^(created_user|updated_user|deleted_user|change_user_status|created_role|updated_role|deleted_role)/.test(
      action
    )
  )
    return "user_action";
  return "data_change";
}

export function classifySeverity(action: string): string {
  if (/deleted_/.test(action)) return "warning";
  if (/restored_/.test(action)) return "info";
  if (/failed_login/.test(action)) return "critical";
  return "info";
}

export interface Snapshot {
  tableName: string;
  recordId: string;
  snapshot: Record<string, unknown>;
  snapshotType: "before" | "after";
}
