import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/users");
      return res.data.data as any[];
    },
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/audit-logs");
      return res.data.data as any[];
    },
  });

  const { data: health } = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/health");
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const roleColor = (role: string) => {
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "brand";
    if (role === "ANALYST") return "gold";
    return "neutral";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">Manage users and monitor system health</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${health?.status === "healthy" ? "bg-[#10b981]" : "bg-[#f43f5e]"}`} />
          <span className="text-sm text-[#94a3b8]">
            {health?.status ?? "checking..."}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users?.length ?? "—" },
          { label: "Active Users", value: users?.filter((u: any) => u.isActive).length ?? "—" },
          { label: "Audit Events", value: auditLogs?.length ?? "—" },
          { label: "Uptime", value: health ? `${Math.floor(health.uptime / 60)}m` : "—" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <p className="text-xs text-[#475569] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1f2d45] flex items-center justify-between">
          <h2 className="font-semibold">Users</h2>
          <Badge variant="neutral" size="sm">{users?.length ?? 0} total</Badge>
        </div>

        {usersLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} height="44px" />)}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-[#111827] text-xs text-[#475569] uppercase tracking-wider font-medium">
              <span>User</span><span>Email</span><span>Role</span><span>Status</span><span>Joined</span>
            </div>
            {(users ?? []).map((u: any) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3.5 border-b border-[#111827] items-center text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-xs font-bold">
                    {u.displayName?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium truncate">{u.displayName}</span>
                </div>
                <span className="text-[#94a3b8] truncate text-xs">{u.email}</span>
                <Badge variant={roleColor(u.role) as any} size="sm">{u.role}</Badge>
                <Badge variant={u.isActive ? "gain" : "loss"} size="sm">
                  {u.isActive ? "Active" : "Suspended"}
                </Badge>
                <span className="text-xs text-[#475569]">
                  {new Date(u.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1f2d45]">
          <h2 className="font-semibold">Recent Audit Events</h2>
        </div>
        {logsLoading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="40px" />)}
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {(auditLogs ?? []).slice(-20).reverse().map((log: any) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3 border-b border-[#111827] text-sm">
                <span className="text-xs text-[#475569] mono whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
                <Badge variant="brand" size="sm">{log.action}</Badge>
                {log.targetType && (
                  <span className="text-xs text-[#475569]">{log.targetType}</span>
                )}
                {log.ipAddress && (
                  <span className="text-xs text-[#475569] mono ml-auto">{log.ipAddress}</span>
                )}
              </div>
            ))}
            {(auditLogs ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-[#475569] text-sm">No audit events yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
