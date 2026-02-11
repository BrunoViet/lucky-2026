export const MEMBERS = [
  { name: "Ánh", password: "anh123" },
  { name: "Đức", password: "duc123" },
  { name: "Thành", password: "thanh123" },
];

export const REWARD_WEIGHTS = [
  { value: 5000, weight: 50 },
  { value: 10000, weight: 30 },
  { value: 20000, weight: 14 },
  { value: 50000, weight: 5 },
  { value: 100000, weight: 0.9 },
  { value: 200000, weight: 0.1 },
];

export const TOTAL_BOXES = 18;
export const STORAGE_KEY = "lucky-draw-state-v1";
export const ADMIN_PASSWORD = "admin@lucky";
export const ADMIN_RESET_PIN = "2026";

function drawRewardByWeight() {
  const totalWeight = REWARD_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const reward of REWARD_WEIGHTS) {
    cumulative += reward.weight;
    if (random <= cumulative) {
      return reward.value;
    }
  }

  return 5000;
}

export function createInitialGameState() {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    boxes: Array.from({ length: TOTAL_BOXES }, (_, index) => ({
      id: index + 1,
      reward: drawRewardByWeight(),
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
      return { id: expectedId, reward: drawRewardByWeight(), openedBy: null };
    }
    return {
      id: expectedId,
      reward: Number(found.reward) || drawRewardByWeight(),
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
    version: 2,
    createdAt:
      typeof rawState.createdAt === "string" ? rawState.createdAt : fallback.createdAt,
    boxes,
    memberResults,
    drawLogs,
  };
}

export function getStoredGameState() {
  if (typeof window === "undefined") {
    return createInitialGameState();
  }

  const savedState = localStorage.getItem(STORAGE_KEY);
  if (!savedState) {
    return createInitialGameState();
  }

  try {
    return normalizeGameState(JSON.parse(savedState));
  } catch {
    return createInitialGameState();
  }
}

export function saveGameState(gameState) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
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
