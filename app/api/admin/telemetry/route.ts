// Backward-compatible endpoint. The Cockpit uses /admin/api/telemetry so the
// HTTP-only CEO cookie can remain scoped to /admin.
export { dynamic, GET } from '@/app/admin/api/telemetry/route'
