"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MEMBERS,
  STORAGE_KEY,
  formatMoney,
  getStoredGameState,
  normalizeGameState,
  saveGameState,
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
  const [gameState, setGameState] = useState(() => getStoredGameState());

  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

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
    const onStorageChange = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        setGameState(normalizeGameState(JSON.parse(event.newValue)));
      } catch {
        setGameState(getStoredGameState());
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  const hasDrawn = useMemo(() => {
    if (!currentUser) {
      return false;
    }
    return gameState.memberResults[currentUser] !== null;
  }, [currentUser, gameState.memberResults]);
  const selectedMemberHasDrawn = gameState.memberResults[selectedMember] !== null;

  const handleLogin = (event) => {
    event.preventDefault();
    const found = MEMBERS.find((member) => member.name === selectedMember);

    if (!found || found.password !== password) {
      setLoginError("Sai mật khẩu. Vui lòng thử lại.");
      return;
    }
    if (gameState.memberResults[found.name] !== null) {
      setLoginError("Thành viên này đã bốc thăm rồi, không thể bốc lại.");
      return;
    }

    setCurrentUser(found.name);
    setPassword("");
    setLoginError("");
  };

  const openBox = (boxId) => {
    if (!currentUser || hasDrawn) {
      return;
    }

    setGameState((prev) => {
      const selectedBox = prev.boxes.find((box) => box.id === boxId);

      if (!selectedBox || selectedBox.openedBy || prev.memberResults[currentUser] !== null) {
        return prev;
      }

      return {
        boxes: prev.boxes.map((box) =>
          box.id === boxId ? { ...box, openedBy: currentUser } : box
        ),
        memberResults: {
          ...prev.memberResults,
          [currentUser]: selectedBox.reward,
        },
        drawLogs: [
          ...prev.drawLogs,
          {
            member: currentUser,
            reward: selectedBox.reward,
            boxId: selectedBox.id,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
  };

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

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {gameState.boxes.map((box) => {
            const isOpened = Boolean(box.openedBy);
            const disabled = isOpened || hasDrawn;

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
                      ? formatMoney(box.reward)
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
