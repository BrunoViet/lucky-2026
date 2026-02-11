"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_PASSWORD,
  ADMIN_RESET_PIN,
  MEMBERS,
  STORAGE_KEY,
  createInitialGameState,
  formatDateTime,
  formatMoney,
  getStoredGameState,
  normalizeGameState,
  saveGameState,
} from "@/lib/game-state";

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildCsv(gameState) {
  const header = "Thoi gian,Thanh vien,Hop,Menh gia\n";
  const lines = gameState.drawLogs
    .map((log) => {
      return `${formatDateTime(log.timestamp)},${log.member},${log.boxId},${log.reward}`;
    })
    .join("\n");
  return `${header}${lines}`.trim();
}

export default function AdminPageClient() {
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [gameState, setGameState] = useState(() => getStoredGameState());
  const [resetPin, setResetPin] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetMessage, setResetMessage] = useState("");

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

  const stats = useMemo(() => {
    const totalPaid = MEMBERS.reduce((sum, member) => {
      const reward = gameState.memberResults[member.name];
      return sum + (reward || 0);
    }, 0);
    const playedCount = MEMBERS.filter(
      (member) => gameState.memberResults[member.name] !== null
    ).length;
    const openedCount = gameState.boxes.filter((box) => box.openedBy).length;
    return {
      totalPaid,
      playedCount,
      openedCount,
      remainingCount: gameState.boxes.length - openedCount,
    };
  }, [gameState]);

  const handleAdminLogin = (event) => {
    event.preventDefault();
    if (adminPass !== ADMIN_PASSWORD) {
      setError("Sai mật khẩu admin.");
      return;
    }
    setIsAuthed(true);
    setAdminPass("");
    setError("");
  };

  const handleExportCsv = () => {
    const csv = buildCsv(gameState);
    downloadTextFile("ket-qua-boc-tham.csv", csv, "text/csv;charset=utf-8;");
  };

  const handleResetSession = () => {
    if (resetPin !== ADMIN_RESET_PIN) {
      setResetMessage("PIN không đúng. Không thể reset.");
      return;
    }
    if (resetConfirmText.trim().toUpperCase() !== "RESET") {
      setResetMessage('Để xác nhận, vui lòng nhập đúng chữ "RESET".');
      return;
    }

    const newState = createInitialGameState();
    setGameState(newState);
    saveGameState(newState);
    setResetPin("");
    setResetConfirmText("");
    setResetMessage("Đã mở phiên mới thành công.");
  };

  if (!isAuthed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-3 py-5 text-slate-900 sm:p-6">
        <form
          onSubmit={handleAdminLogin}
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-8"
        >
          <h1 className="text-xl font-bold sm:text-2xl">Đăng nhập quản trị</h1>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            Chỉ admin mới có quyền xem log và reset phiên.
          </p>
          <Link href="/" className="mt-2 inline-block text-sm text-blue-700 hover:underline">
            Quay về trang bốc thăm
          </Link>

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Mật khẩu admin
          </label>
          <input
            type="password"
            value={adminPass}
            onChange={(event) => setAdminPass(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            placeholder="Nhập mật khẩu admin"
            required
          />
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Vào dashboard admin
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
            <h1 className="text-xl font-bold sm:text-2xl">Admin Dashboard</h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Theo dõi kết quả, xuất báo cáo và kiểm soát phiên bốc thăm.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium sm:w-auto"
            >
              Trang bốc thăm
            </Link>
            <button
              onClick={() => setIsAuthed(false)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium sm:w-auto"
            >
              Đăng xuất admin
            </button>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-xs text-slate-500 sm:text-sm">Thành viên đã bốc</p>
            <p className="mt-2 text-xl font-bold sm:text-2xl">
              {stats.playedCount}/{MEMBERS.length}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-xs text-slate-500 sm:text-sm">Hộp đã mở</p>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{stats.openedCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-xs text-slate-500 sm:text-sm">Hộp còn lại</p>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{stats.remainingCount}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-xs text-slate-500 sm:text-sm">Tổng tiền đã phát</p>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{formatMoney(stats.totalPaid)}</p>
          </div>
        </section>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-3 text-base font-semibold sm:text-lg">Kết quả theo thành viên</h2>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {MEMBERS.map((member) => {
              const reward = gameState.memberResults[member.name];
              return (
                <div
                  key={member.name}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="font-semibold">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reward ? formatMoney(reward) : "Chưa bốc thăm"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow">
          <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-base font-semibold sm:text-lg">Nhật ký bốc thăm</h2>
            <button
              onClick={handleExportCsv}
              className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 sm:w-auto"
            >
              Xuất CSV
            </button>
          </div>

          {gameState.drawLogs.length === 0 ? (
            <p className="text-sm text-slate-600">Chưa có dữ liệu bốc thăm.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[560px] border-collapse text-xs sm:min-w-full sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-4">Thời gian</th>
                    <th className="py-2 pr-4">Thành viên</th>
                    <th className="py-2 pr-4">Hộp</th>
                    <th className="py-2 pr-4">Mệnh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {[...gameState.drawLogs].reverse().map((log, index) => (
                    <tr key={`${log.member}-${log.timestamp}-${index}`} className="border-b">
                      <td className="py-2 pr-4">{formatDateTime(log.timestamp)}</td>
                      <td className="py-2 pr-4">{log.member}</td>
                      <td className="py-2 pr-4">#{log.boxId}</td>
                      <td className="py-2 pr-4">{formatMoney(log.reward)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-rose-700 sm:text-lg">Kiểm soát phiên</h2>
          <p className="mt-1 text-xs text-rose-700 sm:text-sm">
            Chỉ admin có PIN mới được mở phiên mới. Hành động này sẽ xóa toàn bộ kết
            quả và log hiện tại.
          </p>
          <div className="mt-4 grid gap-3 sm:max-w-md">
            <label className="text-sm font-medium text-rose-700">PIN reset</label>
            <input
              type="password"
              value={resetPin}
              onChange={(event) => setResetPin(event.target.value)}
              className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
              placeholder="Nhập PIN"
            />
            <label className="text-sm font-medium text-rose-700">
              Nhập RESET để xác nhận
            </label>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(event) => setResetConfirmText(event.target.value)}
              className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
              placeholder='Gõ "RESET"'
            />
          </div>
          <button
            onClick={handleResetSession}
            className="mt-4 w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 sm:w-auto"
          >
            Mở phiên mới (reset)
          </button>
          {resetMessage && (
            <p className="mt-3 text-sm text-rose-700">{resetMessage}</p>
          )}
        </div>
      </div>
    </main>
  );
}
