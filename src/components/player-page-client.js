"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_FIXED_DRAWS,
  MEMBERS,
  SYNC_INTERVAL_MS,
  formatMoney,
  getStoredGameState,
} from "@/lib/game-state";

export default function PlayerPageClient() {
  const [selectedMember, setSelectedMember] = useState(MEMBERS[0].name);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return sessionStorage.getItem("lucky-draw-current-user");
  });
  const [gameState, setGameState] = useState(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [stateError, setStateError] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCongratsPopup, setShowCongratsPopup] = useState(false);
  const [wonReward, setWonReward] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (currentUser) {
      sessionStorage.setItem("lucky-draw-current-user", currentUser);
      return;
    }
    sessionStorage.removeItem("lucky-draw-current-user");
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    const syncState = async () => {
      try {
        const latest = await getStoredGameState();
        if (active) {
          setGameState(latest);
          setStateError("");
          setIsLoadingState(false);
        }
      } catch {
        if (active) {
          setStateError("Không thể tải dữ liệu từ Supabase. Vui lòng thử lại.");
          setIsLoadingState(false);
        }
      }
    };

    syncState();
    const intervalId = window.setInterval(syncState, SYNC_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const hasDrawn = useMemo(() => {
    if (!currentUser || !gameState) {
      return false;
    }
    return gameState.memberResults[currentUser] !== null;
  }, [currentUser, gameState]);
  const selectedMemberHasDrawn = gameState
    ? gameState.memberResults[selectedMember] !== null
    : false;
  const hasReachedMaxDraws = gameState ? gameState.drawLogs.length >= MAX_FIXED_DRAWS : false;

  const handleLogin = (event) => {
    event.preventDefault();
    const found = MEMBERS.find((member) => member.name === selectedMember);

    if (!found || found.password !== password) {
      setLoginError("Sai mật khẩu. Vui lòng thử lại.");
      return;
    }
    if (gameState && gameState.drawLogs.length >= MAX_FIXED_DRAWS) {
      setLoginError("Phiên bốc đã đủ 3 lượt. Vui lòng reset phiên mới.");
      return;
    }
    if (gameState && gameState.memberResults[found.name] !== null) {
      setLoginError("Thành viên này đã bốc thăm rồi, không thể bốc lại.");
      return;
    }

    setCurrentUser(found.name);
    setPassword("");
    setLoginError("");
  };

  const openBox = async (boxId) => {
    if (!currentUser || hasDrawn || isDrawing) {
      return;
    }

    setIsDrawing(true);
    setStateError("");
    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member: currentUser,
          boxId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStateError(payload?.error || "Bốc thăm thất bại.");
        const latest = await getStoredGameState();
        setGameState(latest);
        return;
      }

      if (payload?.gameState) {
        setGameState(payload.gameState);
        const rewardFromServer =
          typeof payload.reward === "number"
            ? payload.reward
            : payload.gameState?.memberResults?.[currentUser];
        if (typeof rewardFromServer === "number") {
          setWonReward(rewardFromServer);
          setShowCongratsPopup(true);
        }
      } else {
        const latest = await getStoredGameState();
        setGameState(latest);
      }
    } catch {
      setStateError("Bốc thăm thất bại do lỗi kết nối Supabase. Vui lòng thử lại.");
    } finally {
      setIsDrawing(false);
    }
  };

  if (isLoadingState || !gameState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-3 py-5 text-slate-900 sm:p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-8">
          Đang tải dữ liệu bốc thăm...
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-3 py-5 text-slate-900 sm:p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-8"
        >
          <h1 className="text-xl font-bold sm:text-2xl">Đăng nhập bốc thăm</h1>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            Thành viên: Ánh, Đức, Thành
          </p>

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Chọn thành viên
          </label>
          <select
            value={selectedMember}
            onChange={(event) => setSelectedMember(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          >
            {MEMBERS.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            placeholder="Nhập mật khẩu"
            required
          />

          {loginError && <p className="mt-3 text-sm text-rose-600">{loginError}</p>}
          {selectedMemberHasDrawn && (
            <p className="mt-3 text-sm text-amber-600">
              Thành viên này đã hoàn thành lượt bốc. Không thể bốc lại sau khi tải lại trang.
            </p>
          )}

          <button
            type="submit"
            disabled={selectedMemberHasDrawn}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Đăng nhập
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:p-6">
      {isDrawing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-700 sm:text-base">
              Đang mở hộp... vui lòng chờ giây lát
            </p>
          </div>
        </div>
      )}
      {showCongratsPopup && typeof wonReward === "number" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-bold text-emerald-700 sm:text-xl">Chúc mừng bạn!</h3>
            <p className="mt-3 text-sm text-slate-700 sm:text-base">
              Bạn đã trúng <span className="font-bold">{formatMoney(wonReward)}</span>.
            </p>
            <button
              onClick={() => setShowCongratsPopup(false)}
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Tuyệt vời
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow sm:mb-6 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Vòng quay may mắn</h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Xin chào {currentUser}! Mỗi thành viên chỉ được mở 1 hộp bí mật.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              onClick={() => setCurrentUser(null)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium sm:w-auto"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {hasDrawn && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-700 sm:text-sm">
            Bạn đã mở hộp và nhận {formatMoney(gameState.memberResults[currentUser])}.
          </div>
        )}
        {hasReachedMaxDraws && !hasDrawn && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 sm:text-sm">
            Phiên bốc đã đủ 3 lượt. Vui lòng nhờ admin reset để mở phiên mới.
          </div>
        )}
        {stateError && (
          <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 sm:text-sm">
            {stateError}
          </div>
        )}

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {gameState.boxes.map((box) => {
            const isOpened = Boolean(box.openedBy);
            const disabled = isOpened || hasDrawn || isDrawing || hasReachedMaxDraws;

            return (
              <button
                key={box.id}
                onClick={() => openBox(box.id)}
                disabled={disabled}
                className={`min-h-28 rounded-xl border p-3 text-left shadow-sm transition sm:min-h-24 ${
                  isOpened
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
                } ${disabled && !isOpened ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <p className="text-xs text-slate-500">Hộp #{box.id}</p>
                <p className="mt-2 text-sm font-bold sm:text-base">
                  {isOpened
                    ? box.openedBy === currentUser
                      ? formatMoney(box.reward || 0)
                      : "Đã có người mở"
                    : "???"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                  {isOpened
                    ? box.openedBy === currentUser
                      ? "Bạn đã mở hộp này"
                      : "Hộp đã được mở"
                    : "Nhấn để bốc thăm"}
                </p>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
