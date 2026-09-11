"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEmployeeReport, fetchManagerReport } from "./api";
import type { ManagerReportFilters } from "@/types/domain";

export const dashboardKeys = {
  employee: ["dashboard", "employee"] as const,
  manager: (filters: ManagerReportFilters) =>
    ["dashboard", "manager", filters] as const,
};

export function useEmployeeReport() {
  return useQuery({
    queryKey: dashboardKeys.employee,
    queryFn: fetchEmployeeReport,
  });
}

export function useManagerReport(
  filters: ManagerReportFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: dashboardKeys.manager(filters),
    queryFn: () => fetchManagerReport(filters),
    enabled,
  });
}
