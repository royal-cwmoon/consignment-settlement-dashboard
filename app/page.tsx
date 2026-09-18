"use client";

import { useMemo, useState } from "react";
import rawSummary from "@/data/vendorSummary.json";
import type { Vendor, VendorSummary } from "@/lib/types";
import { won, pct, pctDelta, tone, barWidth } from "@/lib/format";
import { buildOverviewInsights, buildDetailInsights } from "@/lib/insights";
import LoginGate from "@/components/LoginGate";

const summary = rawSummary as VendorSummary;

const DISC_DEF = [
  { name: "프로모션할인", color: "#0c4a6e", fg: "#ffffff", note: "행사 단위" },
  { name: "로얄부담금", color: "#0e7490", fg: "#ffffff", note: "로얄 부담" },
  { name: "업체부담금", color: "#5b95c4", fg: "#ffffff", note: "업체 부담" },
  { name: "VIP할인", color: "#a5c6de", fg: "#0f2136", note: "회원 등급" },
];

function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border rounded-xl ${className ?? ""}`}
      style={{ borderColor: "#dbe4ee", ...style }}
    >
      {children}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] border"
      style={{ borderColor: "#dbe4ee" }}
    >
      <span style={{ color: "#7e93ab" }}>{label}</span>
      <strong className="font-semibold">{value}</strong>
    </div>
  );
}

function InsightGrid({
  insights,
  title,
  subtitle,
}: {
  insights: ReturnType<typeof buildOverviewInsights>;
  title: string;
  subtitle: string;
}) {
  if (insights.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
          {title}
        </span>
        <span className="text-[11px]" style={{ color: "#7e93ab" }}>
          {subtitle}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((ins, i) => (
          <div
            key={i}
            className="border rounded-[10px] p-3.5 flex flex-col gap-1.5"
            style={{ borderColor: "#dbe4ee", background: "#f4f8fb" }}
          >
            <span
              className="self-start text-[10px] font-bold px-1.5 py-1 rounded-[5px]"
              style={{ color: ins.fg, background: ins.bg }}
            >
              {ins.kind}
            </span>
            <div className="text-[13px] font-semibold leading-relaxed">
              {ins.text}
            </div>
            <div className="text-[11px] leading-relaxed" style={{ color: "#5c7793" }}>
              참조: {ins.source}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RateBar({
  rate,
  target,
  max,
  height = 20,
}: {
  rate: number;
  target: number;
  max: number;
  height?: number;
}) {
  return (
    <span
      className="relative block rounded"
      style={{ height, background: "#f4f8fb" }}
    >
      <span
        className="absolute rounded"
        style={{
          top: 3,
          bottom: 3,
          left: 0,
          background: tone(rate, target),
          width: barWidth(rate, max),
        }}
      />
      <span
        className="absolute"
        style={{
          top: -2,
          bottom: -2,
          width: 2,
          background: "#047857",
          left: barWidth(target, max),
        }}
      />
    </span>
  );
}

export default function DashboardPage() {
  return (
    <LoginGate>
      <DashboardContent />
    </LoginGate>
  );
}

function DashboardContent() {
  const { targetRate, periodLabel, prevPeriodLabel, uploadedAt, overall, monthlyTrend, vendors } =
    summary;

  const sortedByMargin = useMemo(
    () => vendors.slice().sort((a, b) => b.marginRate - a.marginRate),
    [vendors]
  );

  const [view, setView] = useState<"overview" | "detail">("overview");
  const [selectedName, setSelectedName] = useState<string>(
    sortedByMargin[sortedByMargin.length - 1]?.name ?? sortedByMargin[0]?.name
  );
  const selected: Vendor =
    vendors.find((v) => v.name === selectedName) ?? vendors[0];

  const maxScale = useMemo(() => {
    const rates = vendors.flatMap((v) =>
      v.prevMarginRate !== null ? [v.marginRate, v.prevMarginRate] : [v.marginRate]
    );
    const peak = Math.max(...rates, targetRate);
    return Math.max(50, Math.ceil(peak / 10) * 10);
  }, [vendors, targetRate]);

  const channels = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => v.channelBreakdown.forEach((c) => set.add(c.name)));
    return Array.from(set);
  }, [vendors]);

  const overviewInsights = useMemo(() => buildOverviewInsights(summary), []);
  const detailInsights = useMemo(
    () => buildDetailInsights(selected, summary),
    [selected]
  );

  const settleDeltaPct =
    monthlyTrend.length >= 2 && monthlyTrend[monthlyTrend.length - 2].totalSettlement
      ? ((monthlyTrend[monthlyTrend.length - 1].totalSettlement -
          monthlyTrend[monthlyTrend.length - 2].totalSettlement) /
          monthlyTrend[monthlyTrend.length - 2].totalSettlement) *
        100
      : 0;

  const maxSettle = Math.max(...monthlyTrend.map((m) => m.totalSettlement));
  const topSettle = vendors.slice().sort((a, b) => b.settlement - a.settlement).slice(0, 6);
  const maxTopSettle = Math.max(...topSettle.map((v) => v.settlement));

  // 할인 유형 평균 구성비 (금액 기준 가중 평균, 할인 발생 업체만)
  const avgDiscountShares = useMemo(() => {
    const amounts = [0, 0, 0, 0];
    vendors.forEach((v) => {
      v.discountShares.forEach((s, i) => {
        amounts[i] += (s / 100) * v.discountTotal;
      });
    });
    const total = amounts.reduce((a, b) => a + b, 0) || 1;
    return amounts.map((a) => Math.round((a / total) * 100));
  }, [vendors]);

  const tab = (on: boolean): React.CSSProperties => ({
    border: 0,
    cursor: "pointer",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    background: on ? "#ffffff" : "transparent",
    color: on ? "#0c4a6e" : "#5c7793",
    boxShadow: on ? "0 1px 2px rgba(12,74,110,.15)" : "none",
  });

  const trendMax = Math.max(...monthlyTrend.map((m) => m.avgMarginRate), targetRate) + 3;
  const trendMin = Math.min(...monthlyTrend.map((m) => m.avgMarginRate), targetRate) - 3;
  const tY = (r: number) => 110 - ((r - trendMin) / (trendMax - trendMin || 1)) * 90;
  const trendPoints = monthlyTrend
    .map((m, i) => `${10 + i * (300 / Math.max(1, monthlyTrend.length - 1))},${tY(m.avgMarginRate).toFixed(1)}`)
    .join(" ");

  const returnRows = vendors
    .slice()
    .sort((a, b) => b.returnRate - a.returnRate)
    .slice(0, 6);
  const maxReturn = Math.max(...vendors.map((v) => v.returnRate), 1);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f1f5f9", color: "#0f2136", fontVariantNumeric: "tabular-nums" }}
    >
      <header
        className="flex items-center gap-6 px-7 py-3.5 bg-white border-b sticky top-0 z-10 flex-wrap"
        style={{ borderColor: "#dbe4ee" }}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-bold" style={{ letterSpacing: "-0.01em", color: "#0c4a6e" }}>
            위탁업체정산 대시보드
          </span>
          <span className="text-xs" style={{ color: "#7e93ab" }}>
            재무회계팀 · 세무파트
          </span>
        </div>
        <nav className="flex gap-0.5 p-[3px] rounded-lg" style={{ background: "#eaf1f7" }}>
          <button style={tab(view === "overview")} onClick={() => setView("overview")}>
            정산 개요
          </button>
          <button style={tab(view === "detail")} onClick={() => setView("detail")}>
            이익률 원인 분석
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-4.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#5c7793" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#0e7490" }} />
            <span>수기 반영 완료 · {uploadedAt}</span>
          </div>
          <div className="text-xs" style={{ color: "#5c7793" }}>
            기준월 <strong style={{ color: "#0f2136", fontWeight: 600 }}>{periodLabel}</strong>
          </div>
        </div>
      </header>

      <div
        className="flex items-center gap-2.5 flex-wrap px-7 py-3 bg-white border-b"
        style={{ borderColor: "#dbe4ee" }}
      >
        <span
          className="text-[11px] font-semibold mr-1"
          style={{ color: "#7e93ab", letterSpacing: "0.06em" }}
        >
          필터
        </span>
        <Chip label="기간" value={periodLabel} />
        <Chip label="채널" value={`전체 ${channels.length}개`} />
        <Chip label="카테고리" value="중분류 전체" />
        <Chip label="정산구분" value="공급가 기준" />
        <div
          className="ml-auto text-xs px-2.5 py-1.5 rounded-md border"
          style={{ color: "#5c7793", background: "#f4f8fb", borderColor: "#dbe4ee" }}
        >
          매출이익률 = 로얄판매수익 ÷ 총매출액 · 목표 {targetRate}%
        </div>
      </div>

      {view === "overview" && (
        <main className="px-7 py-6 pb-10 flex flex-col gap-5">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                전체 위탁업체 평균 매출이익률
              </div>
              <div className="flex items-end gap-2.5 mt-2.5">
                <span
                  className="text-[36px] font-bold leading-none"
                  style={{ letterSpacing: "-0.03em", color: "#0c4a6e" }}
                >
                  {pct(overall.avgMarginRate)}
                </span>
                <span
                  className="text-[13px] font-semibold pb-1"
                  style={{ color: overall.avgMarginRate >= targetRate ? "#16a34a" : "#dc2626" }}
                >
                  목표 대비 {pctDelta(overall.avgMarginRate - targetRate)}
                </span>
              </div>
              <div className="mt-3.5">
                <RateBar rate={overall.avgMarginRate} target={targetRate} max={maxScale} height={8} />
              </div>
              <div
                className="flex justify-between mt-1.5 text-[11px]"
                style={{ color: "#7e93ab" }}
              >
                <span>0%</span>
                <span>목표 {targetRate}%</span>
                <span>{maxScale}%</span>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                목표 미달 업체 수
              </div>
              <div className="flex items-end gap-1.5 mt-2.5">
                <span
                  className="text-[36px] font-bold leading-none"
                  style={{ letterSpacing: "-0.03em", color: "#047857" }}
                >
                  {overall.belowTargetCount}
                </span>
                <span className="text-lg font-semibold pb-0.5" style={{ color: "#7e93ab" }}>
                  / {overall.totalVendorCount}개사
                </span>
              </div>
              <div className="flex gap-[3px] mt-4">
                {sortedByMargin.map((v) => (
                  <div
                    key={v.name}
                    className="rounded-[3px]"
                    style={{ height: 22, flex: 1, background: tone(v.marginRate, targetRate) }}
                    title={`${v.name} ${pct(v.marginRate)}`}
                  />
                ))}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: "#7e93ab" }}>
                업체별 이익률 &lt; {targetRate}% 기준 · 정산 발생 업체 전체
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                이번 달 정산금액 합계
              </div>
              <div className="flex items-end gap-2.5 mt-2.5">
                <span
                  className="text-[30px] font-bold leading-none whitespace-nowrap"
                  style={{ letterSpacing: "-0.03em", color: "#0c4a6e" }}
                >
                  {won(overall.totalSettlement)}
                </span>
                <span className="text-[13px] font-semibold pb-1" style={{ color: settleDeltaPct >= 0 ? "#0f766e" : "#dc2626" }}>
                  전월 대비 {pctDelta(settleDeltaPct)}
                </span>
              </div>
              <div className="flex items-end gap-1 h-[38px] mt-3.5">
                {monthlyTrend.map((m, i) => (
                  <div key={m.label} className="flex-1 self-stretch flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-[3px]"
                      style={{
                        background: i === monthlyTrend.length - 1 ? "#0369a1" : "#bcd4e6",
                        height: `${(m.totalSettlement / (maxSettle || 1)) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-1.5">
                {monthlyTrend.map((m) => (
                  <span key={m.label} className="flex-1 text-center text-[10px]" style={{ color: "#7e93ab" }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: "#c2cfda" }}>
                * 실측 데이터 {monthlyTrend.length}개월분
              </div>
            </Card>
          </section>

          <InsightGrid
            insights={overviewInsights}
            title="AI 인사이트 제안"
            subtitle="검토가 필요한 지점을 제안합니다 · 판단은 담당자 확인 후"
          />

          <section className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
            <Card className="p-5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                  위탁업체별 매출이익률 순위
                </span>
                <span className="text-[11px]" style={{ color: "#7e93ab" }}>
                  초록 선 = 목표 {targetRate}% · 행 클릭 시 원인 분석
                </span>
              </div>
              <div className="flex flex-col gap-[1px] mt-3">
                {sortedByMargin.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => {
                      setSelectedName(v.name);
                      setView("detail");
                    }}
                    className="grid items-center gap-2.5 px-2 py-1.5 rounded-md text-left w-full hover:bg-[#eaf1f7]"
                    style={{ gridTemplateColumns: "116px minmax(0,1fr) 64px 66px", border: 0, background: "transparent", cursor: "pointer" }}
                  >
                    <span className="text-[12.5px] font-semibold truncate">{v.name}</span>
                    <RateBar rate={v.marginRate} target={targetRate} max={maxScale} />
                    <span
                      className="text-[12.5px] font-bold text-right"
                      style={{ color: tone(v.marginRate, targetRate) }}
                    >
                      {pct(v.marginRate)}
                    </span>
                    <span className="text-[11.5px] text-right" style={{ color: "#5c7793" }}>
                      {pctDelta(v.marginRate - targetRate)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <div className="flex flex-col gap-5">
              <Card className="p-5">
                <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                  월별 평균 매출이익률 추이
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                  실측 데이터 {monthlyTrend.length}개월 · 목표선 {targetRate}%
                </div>
                <svg viewBox="0 0 320 120" className="w-full mt-3" style={{ height: 120, overflow: "visible" }}>
                  <line
                    x1={0}
                    y1={tY(targetRate)}
                    x2={320}
                    y2={tY(targetRate)}
                    stroke="#047857"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <polyline
                    points={trendPoints}
                    fill="none"
                    stroke="#0369a1"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {monthlyTrend.map((m, i) => (
                    <circle
                      key={m.label}
                      cx={10 + i * (300 / Math.max(1, monthlyTrend.length - 1))}
                      cy={tY(m.avgMarginRate)}
                      r={3.5}
                      fill="#ffffff"
                      stroke="#0369a1"
                      strokeWidth={2.5}
                    />
                  ))}
                </svg>
                <div className="flex mt-1.5">
                  {monthlyTrend.map((m) => (
                    <div key={m.label} className="flex-1 text-center">
                      <div className="text-[11px] font-semibold">{pct(m.avgMarginRate)}</div>
                      <div className="text-[10px]" style={{ color: "#7e93ab" }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                  정산금액 규모 상위
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                  Σ업체정산금 기준 · 색상은 목표 달성 여부
                </div>
                <div className="flex flex-col gap-2.5 mt-3.5">
                  {topSettle.map((v) => (
                    <div
                      key={v.name}
                      className="grid items-center gap-2.5"
                      style={{ gridTemplateColumns: "104px minmax(0,1fr) 92px" }}
                    >
                      <span className="text-[12.5px] font-semibold truncate">{v.name}</span>
                      <span className="block rounded-full" style={{ height: 10, background: "#eaf1f7" }}>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(v.settlement / (maxTopSettle || 1)) * 100}%`,
                            background: tone(v.marginRate, targetRate),
                          }}
                        />
                      </span>
                      <span className="text-xs text-right font-semibold" style={{ color: "#33506d" }}>
                        {won(v.settlement)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <Card className="overflow-hidden">
            <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
              <span className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                업체별 정산 요약
              </span>
              <span className="text-[11px]" style={{ color: "#7e93ab" }}>
                {periodLabel} · 위탁정산원본(정산실행) 집계
              </span>
            </div>
            <div className="overflow-x-auto">
              <div
                className="grid px-5 pb-2 border-b text-[11px] font-semibold min-w-[720px]"
                style={{ gridTemplateColumns: "140px repeat(6,minmax(0,1fr)) 92px", borderColor: "#dbe4ee", color: "#7e93ab" }}
              >
                <span>위탁업체명</span>
                <span className="text-right">총매출액</span>
                <span className="text-right">총할인액</span>
                <span className="text-right">업체정산금</span>
                <span className="text-right">로얄판매수익</span>
                <span className="text-right">매출이익률</span>
                <span className="text-right">전월 대비</span>
                <span className="text-right">반품비중</span>
              </div>
              {sortedByMargin.map((v) => (
                <div
                  key={v.name}
                  className="grid items-center px-5 py-2.5 border-b text-[12.5px] min-w-[720px] hover:bg-[#f4f8fb]"
                  style={{ gridTemplateColumns: "140px repeat(6,minmax(0,1fr)) 92px", borderColor: "#eef3f8" }}
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <span
                      className="rounded-[2px]"
                      style={{ width: 4, height: 14, background: tone(v.marginRate, targetRate) }}
                    />
                    {v.name}
                  </span>
                  <span className="text-right" style={{ color: "#33506d" }}>{won(v.revenue)}</span>
                  <span className="text-right" style={{ color: "#33506d" }}>{won(v.discountTotal)}</span>
                  <span className="text-right" style={{ color: "#33506d" }}>{won(v.settlement)}</span>
                  <span className="text-right" style={{ color: "#33506d" }}>{won(v.profit)}</span>
                  <span className="text-right font-bold" style={{ color: tone(v.marginRate, targetRate) }}>
                    {pct(v.marginRate)}
                  </span>
                  <span className="text-right" style={{ color: v.prevMarginRate === null ? "#7e93ab" : v.marginRate - v.prevMarginRate >= 0 ? "#0f766e" : "#dc2626" }}>
                    {v.prevMarginRate === null ? "신규" : pctDelta(v.marginRate - v.prevMarginRate)}
                  </span>
                  <span className="text-right" style={{ color: "#5c7793" }}>{pct(v.returnRate)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 text-[11px] leading-relaxed" style={{ color: "#7e93ab" }}>
              총할인액 = 프로모션할인 + 로얄부담금 + 업체부담금 + VIP할인 · 반품비중은 수량이 음수인 라인 집계로 산출한 추정값(별도 반품 플래그 없음)
            </div>
          </Card>

          <footer
            className="flex flex-wrap gap-5 px-4.5 py-3.5 rounded-[10px] border text-[11.5px] leading-relaxed"
            style={{ background: "#eaf1f7", borderColor: "#dbe4ee", color: "#5c7793" }}
          >
            <span>
              데이터 기준월 <strong style={{ color: "#33506d" }}>{periodLabel}</strong>
            </span>
            <span>
              수기 반영(붙여넣기) 시점 <strong style={{ color: "#33506d" }}>{uploadedAt}</strong>
            </span>
            <span>
              소스 <strong style={{ color: "#33506d" }}>위탁정산원본 ← 위탁업체정산조회(정산실행)</strong>
            </span>
            <span>판매실적DW는 매출비교 검증용 · 이익률 계산에 직접 사용하지 않음</span>
          </footer>
        </main>
      )}

      {view === "detail" && (
        <main className="px-7 py-6 pb-10 flex flex-col gap-5">
          <section className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold mr-1" style={{ color: "#7e93ab", letterSpacing: "0.06em" }}>
              위탁업체
            </span>
            {sortedByMargin.map((v) => {
              const active = v.name === selected.name;
              return (
                <button
                  key={v.name}
                  onClick={() => setSelectedName(v.name)}
                  className="text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md border"
                  style={{
                    borderColor: active ? "#0c4a6e" : "#dbe4ee",
                    background: active ? "#0c4a6e" : "#ffffff",
                    color: active ? "#ffffff" : "#33506d",
                    cursor: "pointer",
                  }}
                >
                  {v.name}
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                {selected.name} 매출이익률
              </div>
              <div className="flex items-end gap-2.5 mt-2.5">
                <span
                  className="text-[36px] font-bold leading-none"
                  style={{ letterSpacing: "-0.03em", color: tone(selected.marginRate, targetRate) }}
                >
                  {pct(selected.marginRate)}
                </span>
                <span className="text-[13px] font-semibold pb-1" style={{ color: tone(selected.marginRate, targetRate) }}>
                  목표 대비 {pctDelta(selected.marginRate - targetRate)}
                </span>
              </div>
              <div className="mt-3.5">
                <RateBar rate={selected.marginRate} target={targetRate} max={maxScale} height={8} />
              </div>
              <div className="mt-2 text-[11px]" style={{ color: "#7e93ab" }}>
                로얄판매수익 {won(selected.profit)} ÷ 총매출액 {won(selected.revenue)}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                할인 부담 비중
              </div>
              <div className="flex items-end gap-2.5 mt-2.5">
                <span className="text-[36px] font-bold leading-none" style={{ letterSpacing: "-0.03em", color: "#0c4a6e" }}>
                  {pct(selected.discountTotal / (selected.revenue || 1) * 100)}
                </span>
                <span
                  className="text-[13px] font-semibold pb-1"
                  style={{
                    color:
                      selected.discountTotal / (selected.revenue || 1) * 100 > overall.avgDiscountShare
                        ? "#dc2626"
                        : "#0f766e",
                  }}
                >
                  전체 평균 대비{" "}
                  {pctDelta(
                    (selected.discountTotal / (selected.revenue || 1)) * 100 - overall.avgDiscountShare
                  )}
                </span>
              </div>
              <div className="mt-3.5 text-[11px] leading-relaxed" style={{ color: "#7e93ab" }}>
                (프로모션할인 + 로얄부담금 + 업체부담금 + VIP할인) ÷ 총매출액 · 전체 평균 {pct(overall.avgDiscountShare)}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold" style={{ color: "#5c7793" }}>
                정산 원가율
              </div>
              <div className="flex items-end gap-2.5 mt-2.5">
                <span className="text-[36px] font-bold leading-none" style={{ letterSpacing: "-0.03em", color: "#0c4a6e" }}>
                  {pct(selected.costRatio)}
                </span>
                <span
                  className="text-[13px] font-semibold pb-1"
                  style={{ color: selected.costRatio > overall.avgCostRatio ? "#dc2626" : "#0f766e" }}
                >
                  전체 평균 대비 {pctDelta(selected.costRatio - overall.avgCostRatio)}
                </span>
              </div>
              <div className="mt-3.5 text-[11px] leading-relaxed" style={{ color: "#7e93ab" }}>
                업체정산금 ÷ 총매출액 기준 · 전체 평균 {pct(overall.avgCostRatio)}
              </div>
            </Card>
          </section>

          <InsightGrid
            insights={detailInsights}
            title={`AI 인사이트 제안 — ${selected.name}`}
            subtitle="원인 후보 제안 · 대응 판단은 담당자 확인 후"
          />

          <section className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <Card className="p-5">
              <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                할인 유형 구성비
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                {selected.name} vs 전체 평균 · 총할인액 내 구성
              </div>
              <div className="flex flex-col gap-4 mt-4">
                {[
                  { label: selected.name, total: selected.discountTotal, parts: selected.discountShares },
                  {
                    label: "전체 평균",
                    total: vendors.reduce((a, v) => a + v.discountTotal, 0) / vendors.length,
                    parts: avgDiscountShares,
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <strong className="font-semibold">{row.label}</strong>
                      <span style={{ color: "#5c7793" }}>총할인 {won(row.total)}</span>
                    </div>
                    <div className="flex h-[26px] rounded-md overflow-hidden" style={{ background: "#eaf1f7" }}>
                      {row.parts.every((p) => p === 0) ? (
                        <div className="flex-1 flex items-center justify-center text-[10.5px]" style={{ color: "#7e93ab" }}>
                          할인 없음
                        </div>
                      ) : (
                        row.parts.map((p, i) =>
                          p > 0 ? (
                            <div
                              key={i}
                              className="flex items-center justify-center text-[10.5px] font-bold"
                              style={{ color: DISC_DEF[i].fg, background: DISC_DEF[i].color, width: `${p}%` }}
                            >
                              {p}%
                            </div>
                          ) : null
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 pt-3.5 border-t" style={{ borderColor: "#eef3f8" }}>
                {DISC_DEF.map((l) => (
                  <div key={l.name} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "#44617f" }}>
                    <span className="rounded-[2px]" style={{ width: 9, height: 9, background: l.color }} />
                    <span>
                      <strong className="font-semibold" style={{ color: "#0f2136" }}>
                        {l.name}
                      </strong>{" "}
                      {l.note}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                채널(매장)별 이익률
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                {selected.name} 내 매장명 기준 · 기준선 {targetRate}%
              </div>
              <div className="flex flex-col gap-2.5 mt-4">
                {selected.channelBreakdown.map((c) => (
                  <div
                    key={c.name}
                    className="grid items-center gap-2.5"
                    style={{ gridTemplateColumns: "104px minmax(0,1fr) 54px 96px" }}
                  >
                    <span className="text-[12.5px] font-semibold">{c.name}</span>
                    <RateBar rate={c.marginRate} target={targetRate} max={maxScale} height={18} />
                    <span className="text-[12.5px] font-bold text-right" style={{ color: tone(c.marginRate, targetRate) }}>
                      {pct(c.marginRate)}
                    </span>
                    <span className="text-[11.5px] text-right" style={{ color: "#5c7793" }}>
                      {won(c.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <Card className="p-5">
              <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                상품 카테고리별 이익률
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                {selected.name} 내 중분류 기준
              </div>
              <div className="flex flex-col gap-2.5 mt-4">
                {selected.categoryBreakdown.map((c) => (
                  <div
                    key={c.name}
                    className="grid items-center gap-2.5"
                    style={{ gridTemplateColumns: "104px minmax(0,1fr) 54px 96px" }}
                  >
                    <span className="text-[12.5px] font-semibold">{c.name}</span>
                    <RateBar rate={c.marginRate} target={targetRate} max={maxScale} height={18} />
                    <span className="text-[12.5px] font-bold text-right" style={{ color: tone(c.marginRate, targetRate) }}>
                      {pct(c.marginRate)}
                    </span>
                    <span className="text-[11.5px] text-right" style={{ color: "#5c7793" }}>
                      {won(c.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-[13px] font-bold" style={{ color: "#0c4a6e" }}>
                반품 비중과 이익률
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                반품 판정: 수량이 음수인 라인 (추정값)
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="border rounded-[10px] p-3.5" style={{ borderColor: "#dbe4ee" }}>
                  <div className="text-[11.5px]" style={{ color: "#5c7793" }}>
                    반품 수량 비중
                  </div>
                  <div className="text-[26px] font-bold mt-1" style={{ color: "#0c4a6e" }}>
                    {pct(selected.returnRate)}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                    전체 평균 {pct(overall.avgReturnRate)}
                  </div>
                </div>
                <div className="border rounded-[10px] p-3.5" style={{ borderColor: "#dbe4ee" }}>
                  <div className="text-[11.5px]" style={{ color: "#5c7793" }}>
                    반품 라인 제외 시 이익률
                  </div>
                  <div className="text-[26px] font-bold mt-1" style={{ color: "#047857" }}>
                    {pct(selected.marginRateExReturns)}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "#7e93ab" }}>
                    반품 포함 대비 {pctDelta(selected.marginRate - selected.marginRateExReturns)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4 pt-3.5 border-t" style={{ borderColor: "#eef3f8" }}>
                {returnRows.map((r) => (
                  <div key={r.name} className="grid items-center gap-2.5" style={{ gridTemplateColumns: "104px minmax(0,1fr) 130px" }}>
                    <span className="text-xs" style={{ color: "#44617f" }}>
                      {r.name}
                    </span>
                    <span className="block rounded" style={{ height: 8, background: "#eaf1f7" }}>
                      <span
                        className="block h-full rounded"
                        style={{ width: `${(r.returnRate / maxReturn) * 100}%`, background: "#5b95c4" }}
                      />
                    </span>
                    <span className="text-[11.5px] text-right" style={{ color: "#5c7793" }}>
                      반품 {pct(r.returnRate)} · 이익률 {pct(r.marginRate)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <footer
            className="flex flex-col gap-1.5 px-4.5 py-3.5 rounded-[10px] border text-[11.5px] leading-relaxed"
            style={{ background: "#eaf1f7", borderColor: "#dbe4ee", color: "#5c7793" }}
          >
            <div>
              <strong style={{ color: "#33506d" }}>할인 구성 정의</strong> — 프로모션할인: 행사 단위 할인 / 로얄부담금: 로얄앤컴퍼니 부담 / 업체부담금: 위탁업체 부담 / VIP할인: 회원 등급 할인
            </div>
            <div>
              <strong style={{ color: "#33506d" }}>반품 판정</strong> — 위탁정산원본에 반품 플래그가 없어 수량 &lt; 0 라인을 반품으로 유추한 추정 판정
            </div>
            <div>
              <strong style={{ color: "#33506d" }}>귀속 로직</strong> — 로얄판매수익 = 최종결제액 − 업체정산금 (VIP할인 등 부담 구분에 따라 조정, 원본 계산값 사용)
            </div>
            {prevPeriodLabel && (
              <div>
                <strong style={{ color: "#33506d" }}>전월 비교</strong> — {prevPeriodLabel} 위탁정산원본(결제월={prevPeriodLabel.slice(-2)}) 기준. 전월 실적이 없는 업체는 &quot;신규&quot;로 표기
              </div>
            )}
          </footer>
        </main>
      )}
    </div>
  );
}
