"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { Clock, Fingerprint, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ADMIN_ACCESS_ROLES } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi } from "./convex-api";
import { formatDate } from "./content-manager";
import { EmptyState, LoadingPanel, PaginationControls } from "./ui";

export function AuditManager() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.adminOnly}>
      <AuditData />
    </AdminFeatureGate>
  );
}

function AuditData() {
  const [entityType, setEntityType] = useState("");
  const [actorId, setActorId] = useState("");
  const actors = useQuery(adminApi.listAuditActors, {});
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    adminApi.listAuditLogs,
    {
      ...(entityType.trim() ? { entityType: entityType.trim() } : {}),
      ...(actorId.trim() ? { actorId: actorId.trim() } : {}),
    },
    { initialNumItems: 50 },
  );
  if (paginationStatus === "LoadingFirstPage") return <LoadingPanel label="Loading audit history" />;
  return (
    <section>
      <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-sky-700" size={19} />
          <p className="leading-6">
            <b>Read-only security record.</b> Audit entries cannot be edited from this console. They identify
            administrative actions without exposing sensitive request payloads.
          </p>
        </div>
      </div>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Entity type</span>
          <Search className="absolute top-3.5 left-3.5 text-slate-400" size={17} />
          <input
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pr-3 pl-10 text-sm outline-none focus:border-sky-600"
            placeholder="Filter entity type, e.g. news"
          />
        </label>
        <label className="relative flex-1">
          <span className="sr-only">Actor ID</span>
          <Fingerprint className="absolute top-3.5 left-3.5 text-slate-400" size={17} />
          <select
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pr-9 pl-10 text-sm outline-none focus:border-sky-600"
          >
            <option value="">All staff actors</option>
            {(actors ?? []).map((actor) => (
              <option key={actor._id} value={actor._id}>
                {actor.name} ({actor.email})
              </option>
            ))}
          </select>
        </label>
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description="No security events match the current filters. Administrative changes will appear here after they are committed."
        />
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {results.map((entry) => (
            <li
              key={entry._id}
              className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[180px_minmax(0,1fr)_180px] md:items-start"
            >
              <div>
                <p className="text-xs font-extrabold text-sky-800 capitalize">
                  {String(entry.action ?? "administrative action").replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  {String(entry.entityType ?? "system")}
                </p>
              </div>
              <div>
                <p className="text-sm leading-6 font-semibold [overflow-wrap:anywhere] break-words text-slate-800">
                  {String(entry.summary ?? "No summary recorded")}
                </p>
                {entry.entityId ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                    Entity {String(entry.entityId)}
                  </p>
                ) : null}
              </div>
              <div className="text-xs text-slate-500">
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 shrink-0" size={13} />
                  {typeof entry.createdAt === "number" ? formatDate(entry.createdAt) : "Unknown time"}
                </p>
                <p
                  className="mt-2 truncate font-mono text-[10px]"
                  title={String(entry.actorId ?? entry.actorClerkId ?? "system")}
                >
                  {String(entry.actorId ?? entry.actorClerkId ?? "System")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <PaginationControls
        status={paginationStatus}
        loadedCount={results.length}
        noun="audit events"
        onLoadMore={() => loadMore(50)}
      />
    </section>
  );
}
