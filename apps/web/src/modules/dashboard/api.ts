import { apiFetch } from "@/lib/api";
import type {
  DashboardEmployeeReport,
  DashboardManagerReport,
  ManagerReportFilters,
} from "@/types/domain";

export async function fetchEmployeeReport(): Promise<DashboardEmployeeReport> {
  const data = await apiFetch<DashboardEmployeeReport>("/api/dashboard/me");
  return data;
}

export async function fetchManagerReport(
  filters: ManagerReportFilters = {},
): Promise<DashboardManagerReport> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch<DashboardManagerReport>(
    `/api/dashboard/gerencial${suffix}`,
  );
  return data;
}
