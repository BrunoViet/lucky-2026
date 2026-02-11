import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  MAX_FIXED_DRAWS,
  MEMBERS,
  createInitialGameState,
  normalizeGameState,
} from "@/lib/game-state";

const SUPABASE_TABLE_NAME = "lucky_draw_state";
const SUPABASE_ROW_ID = "global";
const SERVER_REWARD_SEQUENCE = [20000, 10000, 50000];

function getServerSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function saveState(client, gameState) {
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
  return normalized;
}

async function loadState(client) {
  const { data, error } = await client
    .from(SUPABASE_TABLE_NAME)
    .select("state")
    .eq("id", SUPABASE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.state) {
    const initial = createInitialGameState();
    return saveState(client, initial);
  }

  return normalizeGameState(data.state);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const member = typeof body?.member === "string" ? body.member : "";
    const boxId = Number(body?.boxId);

    if (!member || !Number.isInteger(boxId)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const memberExists = MEMBERS.some((item) => item.name === member);
    if (!memberExists) {
      return NextResponse.json({ error: "Thành viên không tồn tại." }, { status: 400 });
    }

    const client = getServerSupabaseClient();
    const latest = await loadState(client);

    if (latest.drawLogs.length >= MAX_FIXED_DRAWS) {
      return NextResponse.json(
        { error: "Phiên bốc đã đủ 3 lượt. Vui lòng reset phiên mới." },
        { status: 409 }
      );
    }

    const selectedBox = latest.boxes.find((box) => box.id === boxId);
    if (!selectedBox || selectedBox.openedBy) {
      return NextResponse.json({ error: "Hộp không hợp lệ hoặc đã được mở." }, { status: 409 });
    }

    if (latest.memberResults[member] !== null) {
      return NextResponse.json({ error: "Thành viên này đã bốc rồi." }, { status: 409 });
    }

    const reward = SERVER_REWARD_SEQUENCE[latest.drawLogs.length];
    if (typeof reward !== "number") {
      return NextResponse.json({ error: "Không còn lượt bốc hợp lệ." }, { status: 409 });
    }

    const nextState = {
      ...latest,
      boxes: latest.boxes.map((box) =>
        box.id === boxId ? { ...box, openedBy: member, reward } : box
      ),
      memberResults: {
        ...latest.memberResults,
        [member]: reward,
      },
      drawLogs: [
        ...latest.drawLogs,
        {
          member,
          reward,
          boxId,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const saved = await saveState(client, nextState);
    return NextResponse.json({ gameState: saved, reward });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ khi xử lý bốc thăm." }, { status: 500 });
  }
}
