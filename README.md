# Lucky Draw

Ung dung boc tham cho 3 thanh vien, luu state tren Supabase.

## Quy tac thuong hien tai

- Thu tu mac dinh theo luot boc:
  - Luot 1: `20,000`
  - Luot 2: `10,000`
  - Luot 3: `50,000`
- Khoa cung toi da 3 luot cho moi phien, khong cho phat sinh luot thu 4 tro di.

## 1) Cai dat

```bash
npm install
```

## 2) Cau hinh Supabase

Tao file `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Tao bang trong SQL Editor cua Supabase:

```sql
create table if not exists public.lucky_draw_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lucky_draw_state enable row level security;

create policy "allow read lucky draw state"
on public.lucky_draw_state
for select
to anon
using (true);

create policy "allow write lucky draw state"
on public.lucky_draw_state
for insert
to anon
with check (true);

create policy "allow update lucky draw state"
on public.lucky_draw_state
for update
to anon
using (true)
with check (true);
```

> Luu y: Rule thuong da duoc chuyen vao API server (`/api/draw`). Client khong con tu tinh reward.
> `SUPABASE_SERVICE_ROLE_KEY` chi dung o server, tuyet doi khong dua vao client.

## 3) Chay local

```bash
npm run dev
```

Mo `http://localhost:3000`.
