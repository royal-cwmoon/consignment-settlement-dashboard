"use client";

import { useEffect, useState, type FormEvent } from "react";

const SESSION_KEY = "royal-vendor-dashboard-auth";
const VALID_ID = process.env.NEXT_PUBLIC_DASHBOARD_ID ?? "";
const VALID_PASSWORD = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD ?? "";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setAuthed(true);
      }
    } catch {
      // 세션 스토리지 접근 불가 시 로그인 화면으로 진행
    }
    setChecked(true);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (id === VALID_ID && password === VALID_PASSWORD) {
      setError("");
      setAuthed(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // 저장 실패해도 이번 세션 접근은 허용
      }
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  }

  if (!checked) {
    return <div style={{ minHeight: "100vh", background: "#f1f5f9" }} />;
  }

  if (authed) return <>{children}</>;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#f1f5f9" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border rounded-xl p-7"
        style={{ borderColor: "#dbe4ee" }}
      >
        <div className="mb-1 text-[15px] font-bold" style={{ color: "#0c4a6e" }}>
          위탁업체정산 대시보드
        </div>
        <div className="mb-6 text-xs" style={{ color: "#7e93ab" }}>
          재무회계팀 · 세무파트 내부용 — 로그인이 필요합니다
        </div>

        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5c7793" }}>
          아이디
        </label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          className="w-full mb-4 px-3 py-2 rounded-md border text-sm"
          style={{ borderColor: "#dbe4ee" }}
        />

        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5c7793" }}>
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full mb-4 px-3 py-2 rounded-md border text-sm"
          style={{ borderColor: "#dbe4ee" }}
        />

        {error && (
          <div className="mb-4 text-xs" style={{ color: "#dc2626" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 rounded-md text-sm font-semibold"
          style={{ background: "#0c4a6e", color: "#ffffff", cursor: "pointer" }}
        >
          로그인
        </button>

        <div className="mt-5 text-[11px] leading-relaxed" style={{ color: "#7e93ab" }}>
          이 화면은 정적 페이지 접근을 막는 1차 차단막입니다. 브라우저 개발자도구로 페이지
          소스를 확인하면 우회할 수 있으므로, 회사 기밀 등급이 높은 자료는 이 방식만으로
          보호하지 마세요.
        </div>
      </form>
    </div>
  );
}
