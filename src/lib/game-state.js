import { createClient } from "@supabase/supabase-js";

export const MEMBERS = [
  { name: "Ánh", password: "anh123" },
  { name: "Đức", password: "duc123" },
  { name: "Thành", password: "thanh123" },
];

export const REWARD_WEIGHTS = [
  { value: 10000, weight: 45 },
  { value: 20000, weight: 45 },
  { value: 50000, weight: 8 },
  { value: 100000, weight: 1.8 },
  { value: 200000, weight: 0.2 },
];
export const MAX_FIXED_DRAWS = 3;

export const TOTAL_BOXES = 18;
export const ADMIN_PASSWORD = "admin@lucky";
export const ADMIN_RESET_PIN = "2026";
export const SYNC_INTERVAL_MS = 2000;

const SUPABASE_TABLE_NAME = "lucky_draw_state";
const SUPABASE_ROW_ID = "global";

let supabaseClient = null;

function getSupabaseClient() {
  if (typeof window === "undefined") {
    return null;
  }
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment."
    );
  }

  supabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return supabaseClient;
}

export function createInitialGameState() {
  return {
    version: 3,
    createdAt: new Date().toISOString(),
    boxes: Array.from({ length: TOTAL_BOXES }, (_, index) => ({
      id: index + 1,
      reward: null,
      openedBy: null,
    })),
    memberResults: Object.fromEntries(MEMBERS.map((member) => [member.name, null])),
    drawLogs: [],
  };
}

export function normalizeGameState(rawState) {
  const fallback = createInitialGameState();
  if (!rawState || typeof rawState !== "object") {
    return fallback;
  }

  const rawBoxes = Array.isArray(rawState.boxes) ? rawState.boxes : [];
  const boxes = Array.from({ length: TOTAL_BOXES }, (_, index) => {
    const expectedId = index + 1;
    const found = rawBoxes.find((item) => item?.id === expectedId);
    if (!found) {
      return { id: expectedId, reward: null, openedBy: null };
    }
    return {
      id: expectedId,
      reward: typeof found.reward === "number" ? found.reward : null,
      openedBy: typeof found.openedBy === "string" ? found.openedBy : null,
    };
  });

  const memberResults = Object.fromEntries(
    MEMBERS.map((member) => {
      const value = rawState.memberResults?.[member.name];
      return [member.name, typeof value === "number" ? value : null];
    })
  );

  const drawLogs = Array.isArray(rawState.drawLogs)
    ? rawState.drawLogs
        .filter(
          (item) =>
            item &&
            typeof item.member === "string" &&
            typeof item.reward === "number" &&
            typeof item.boxId === "number" &&
            typeof item.timestamp === "string"
        )
        .map((item) => ({
          member: item.member,
          reward: item.reward,
          boxId: item.boxId,
          timestamp: item.timestamp,
        }))
    : [];

  return {
    version: 3,
    createdAt:
      typeof rawState.createdAt === "string" ? rawState.createdAt : fallback.createdAt,
    boxes,
    memberResults,
    drawLogs,
  };
}

export async function getStoredGameState() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(SUPABASE_TABLE_NAME)
    .select("state")
    .eq("id", SUPABASE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.state) {
    const initialState = createInitialGameState();
    await saveGameState(initialState);
    return initialState;
  }

  return normalizeGameState(data.state);
}

export async function saveGameState(gameState) {
  const client = getSupabaseClient();

  const normalized = normalizeGameState(gameState);
  const { error } = await client.from(SUPABASE_TABLE_NAME).upsert(
    {
      id: SUPABASE_ROW_ID,
      state: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export function formatMoney(value) {
  return `${value.toLocaleString("vi-VN")} đ`;
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("vi-VN");
}
