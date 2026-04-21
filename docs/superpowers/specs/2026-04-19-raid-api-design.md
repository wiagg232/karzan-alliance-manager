# Raid Score API Design

**Date:** 2026-04-19
**Status:** Approved

## Overview

Expose a lightweight OpenAPI-documented HTTP API so that admins can submit raid scores and season notes via AI (MCP/CLI) or curl, without going through the frontend UI.

The API is implemented as a single Supabase Edge Function (`raid-api`) with three endpoints. All requests are authenticated via a dedicated API token system backed by a `api_tokens` DB table.

---

## Endpoints

```
GET  /raid-api/season     → Return the current season (latest non-archived)
GET  /raid-api/members    → Return all members (id, name, guild_id)
PUT  /raid-api/scores     → Batch upsert member scores / season notes
```

All requests require:
```
Authorization: Bearer <api_token>
```

### GET /season

Response:
```json
{
  "id": "uuid",
  "season_number": 5,
  "period_text": "2026-04",
  "description": "第五賽季",
  "even_rounds": false,
  "is_archived": false
}
```

### GET /members

Returns only **active** members (excludes `status = 'archived'`).

Response:
```json
[
  { "id": "uuid", "name": "成員名稱", "guild_id": "uuid" }
]
```

### PUT /scores

Request body:
```json
{
  "season_id": "uuid",
  "records": [
    { "member_id": "uuid", "score": 1500, "season_note": "備註" }
  ]
}
```

- `score` and `season_note` are both optional; only provided fields are updated.
- Score is clamped to `[0, 10000]`.

**Validation rules:**
- `season_id` must match the current season (latest non-archived). Writes to any other season — including archived ones — return `403 Forbidden` with `{ "error": "season_id must be the current season" }`.
- All `member_id` values must exist in `members` (any status). Missing IDs return `400` with `{ "error": "unknown member_id(s)", "invalid_member_ids": [...] }`. All-or-nothing: the batch is not partially applied.
- Empty `records: []` returns `200 { "updated": 0, "guilds_recalculated": [] }` (no-op, not an error).

Response:
```json
{
  "updated": 3,
  "guilds_recalculated": ["guild-uuid-1", "guild-uuid-2"]
}
```

Errors return `{ "error": "message" }` with appropriate HTTP status codes (400, 401, 403, 500).

---

## API Token System

### DB Table: `api_tokens`

```sql
create table api_tokens (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,   -- SHA-256 hash only; plaintext never stored
  label        text not null,          -- e.g. "AI Admin Bot"
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  last_used_at timestamptz,
  is_active    boolean default true
);
```

### RLS Policies

RLS is enabled on `api_tokens`. The Edge Function uses the service role key and bypasses RLS. Policies only govern frontend access.

```sql
alter table api_tokens enable row level security;

-- Only admin / creator roles can SELECT
create policy "admins can select api_tokens"
  on api_tokens for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()::text
      and profiles.user_role in ('admin', 'creator')
    )
  );

-- Only admin / creator roles can INSERT
create policy "admins can insert api_tokens"
  on api_tokens for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()::text
      and profiles.user_role in ('admin', 'creator')
    )
  );

-- Only admin / creator roles can UPDATE (used to deactivate tokens)
create policy "admins can update api_tokens"
  on api_tokens for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()::text
      and profiles.user_role in ('admin', 'creator')
    )
  );
```

No DELETE policy — tokens are deactivated via `is_active = false` to preserve audit history.

### Token Lifecycle

1. Admin generates a token in AdminDashboard (enters a label).
2. SHA-256 hash is computed in the browser via `crypto.subtle.digest` — plaintext never leaves the client.
3. Hash is stored in `api_tokens`; plaintext is shown once and then discarded.
4. On each API request, the Edge Function hashes the bearer token and compares against `api_tokens` where `is_active = true`, then updates `last_used_at`.
5. Admin can deactivate a token at any time from the dashboard.

---

## Edge Function: `raid-api`

**Location:** `supabase/functions/raid-api/index.ts`

**Auth flow per request:**
1. Extract `Authorization: Bearer <token>` header.
2. Compute SHA-256 of the token.
3. Query `api_tokens` for matching hash with `is_active = true`.
4. If not found → `401 Unauthorized`.
5. Update `last_used_at` (fire-and-forget).
6. Route to handler.

**Score write flow (`PUT /scores`):**
1. Validate request body (`season_id` present, `records` is array).
2. Verify `season_id` equals the current season id (query `raid_seasons` ordered by `season_number desc` with `is_archived = false`, pick first). Otherwise → `403`.
3. If `records` is empty → return `200 { "updated": 0, "guilds_recalculated": [] }`.
4. Pre-validate all `member_id`s exist in `members`. If any missing → `400` with `invalid_member_ids`. No writes occur.
5. Clamp each score to `[0, 10000]`.
6. Upsert records into `member_raid_records` (conflict on `season_id, member_id`).
7. Collect affected `guild_id`s by querying `members` for each `member_id`.
8. For each affected guild, recalculate median:
   - Fetch all member scores for the season in that guild.
   - Filter `score > 0`, sort, take median, `Math.floor`.
   - Upsert into `guild_raid_records` (conflict on `season_id, guild_id`).
9. Return `{ updated, guilds_recalculated }`.

**CORS:**
All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Methods: GET, PUT, OPTIONS
```
`OPTIONS` preflight requests return `204` with the headers above (no auth required).

---

## AdminDashboard UI: `ApiTokensManager`

**New file:** `src/features/admin/components/ApiTokensManager.tsx`

Added as a new tab in `AdminDashboard.tsx`, following the same structure as existing Manager components.

**Features:**
- **Generate token** — enter a label, click generate; plaintext shown once in a copy-and-close modal.
- **Token list** — shows label, created_at, last_used_at, active/inactive badge.
- **Deactivate** — sets `is_active = false` immediately.

---

## OpenAPI Spec

**Location:** `docs/openapi/raid-api.yaml`

Hand-written OpenAPI 3.1 spec documenting all three endpoints, request/response schemas, and the Bearer token security scheme. Intended for use by MCP clients and human reference.

---

## Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `supabase/functions/raid-api/index.ts` |
| Create | `src/features/admin/components/ApiTokensManager.tsx` |
| Create | `docs/openapi/raid-api.yaml` |
| Modify | `src/features/admin/pages/AdminDashboard.tsx` — add API Tokens tab |
| DB migration | `api_tokens` table + RLS policies (apply via Supabase Dashboard SQL editor) |
