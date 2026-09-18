import type { Vendor, VendorSummary } from "./types";
import { pct, pctDelta, won } from "./format";

export type Insight = {
  kind: "이상 탐지" | "추세 경고" | "기회 발견";
  fg: string;
  bg: string;
  text: string;
  source: string;
};

const KIND_STYLE = {
  "이상 탐지": { fg: "#0c4a6e", bg: "#dbeafe" },
  "추세 경고": { fg: "#065f46", bg: "#d1fae5" },
  "기회 발견": { fg: "#155e75", bg: "#cffafe" },
} as const;

const REVENUE_NOISE_FLOOR = 30000;

// 실제 데이터에서 산출한 인사이트만 제공한다 (가상 수치·추정 계수를 넣지 않는다)
export function buildOverviewInsights(summary: VendorSummary): Insight[] {
  const { vendors, targetRate } = summary;
  const out: Insight[] = [];

  const matched = vendors.filter(
    (v) => v.prevMarginRate !== null && v.revenue >= REVENUE_NOISE_FLOOR
  );
  const decliners = matched
    .map((v) => ({ v, drop: (v.prevMarginRate as number) - v.marginRate }))
    .filter((x) => x.drop > 0)
    .sort((a, b) => b.drop - a.drop);

  if (decliners.length > 0) {
    const { v, drop } = decliners[0];
    out.push({
      kind: "이상 탐지",
      ...KIND_STYLE["이상 탐지"],
      text: `${v.name} 이익률이 전월 대비 ${drop.toFixed(1)}%p 하락했습니다 (${pct(
        v.prevMarginRate as number
      )} → ${pct(v.marginRate)}). 할인 구성 변화를 확인해 보시겠어요?`,
      source: `${summary.prevPeriodLabel}→${summary.periodLabel} 업체별 집계`,
    });
  } else {
    out.push({
      kind: "이상 탐지",
      ...KIND_STYLE["이상 탐지"],
      text: "전월 대비 뚜렷하게 하락한 업체가 없습니다.",
      source: `${summary.prevPeriodLabel}→${summary.periodLabel} 업체별 집계`,
    });
  }

  const below = vendors.filter((v) => v.marginRate < targetRate);
  if (below.length > 0) {
    const worst = below.slice().sort((a, b) => a.marginRate - b.marginRate)[0];
    const noteNew = worst.isNew
      ? " 이번 달 신규 정산 업체로 전월 비교 데이터가 없습니다."
      : "";
    out.push({
      kind: "추세 경고",
      ...KIND_STYLE["추세 경고"],
      text: `${worst.name} 이익률이 ${pct(worst.marginRate)}로 목표(${targetRate}%) 대비 ${(
        targetRate - worst.marginRate
      ).toFixed(1)}%p 부족합니다.${noteNew}`,
      source: `${summary.periodLabel} 업체별 집계 · 목표 ${targetRate}%`,
    });
  } else {
    out.push({
      kind: "추세 경고",
      ...KIND_STYLE["추세 경고"],
      text: `이번 달 목표(${targetRate}%) 미달 업체가 없습니다.`,
      source: `${summary.periodLabel} 업체별 집계 · 목표 ${targetRate}%`,
    });
  }

  const bySettle = vendors.slice().sort((a, b) => b.settlement - a.settlement);
  const byMargin = vendors.slice().sort((a, b) => b.marginRate - a.marginRate);
  const settleRank = new Map(bySettle.map((v, i) => [v.name, i + 1]));
  const marginRank = new Map(byMargin.map((v, i) => [v.name, i + 1]));
  const gaps = vendors
    .map((v) => ({
      v,
      gap: (marginRank.get(v.name) ?? 0) - (settleRank.get(v.name) ?? 0),
    }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  if (gaps.length > 0) {
    const top = gaps[0];
    out.push({
      kind: "기회 발견",
      ...KIND_STYLE["기회 발견"],
      text: `${top.v.name}은(는) 정산금액 ${settleRank.get(top.v.name)}위(${won(
        top.v.settlement
      )})이지만 이익률은 ${pct(top.v.marginRate)}로 하위권(${marginRank.get(
        top.v.name
      )}위)입니다.`,
      source: "Σ업체정산금 순위 · 이익률 순위 대조",
    });
  }

  return out;
}

export function buildDetailInsights(
  vendor: Vendor,
  summary: VendorSummary
): Insight[] {
  const out: Insight[] = [];
  const DISC_NAMES = ["프로모션할인", "로얄부담금", "업체부담금", "VIP할인"];

  if (vendor.discountTotal > 0) {
    const maxIdx = vendor.discountShares.indexOf(
      Math.max(...vendor.discountShares)
    );
    out.push({
      kind: "이상 탐지",
      ...KIND_STYLE["이상 탐지"],
      text: `${vendor.name}은(는) ${DISC_NAMES[maxIdx]}이(가) 전체 할인의 ${vendor.discountShares[maxIdx]}%를 차지합니다.`,
      source: "위탁정산원본 할인 구성 컬럼",
    });
  } else {
    out.push({
      kind: "이상 탐지",
      ...KIND_STYLE["이상 탐지"],
      text: `${vendor.name}은(는) 이번 달 할인 내역이 없습니다.`,
      source: "위탁정산원본 할인 구성 컬럼",
    });
  }

  const worstChannel = vendor.channelBreakdown
    .slice()
    .sort((a, b) => a.marginRate - b.marginRate)[0];
  if (worstChannel && worstChannel.marginRate < summary.targetRate) {
    out.push({
      kind: "추세 경고",
      ...KIND_STYLE["추세 경고"],
      text: `${vendor.name}의 ${worstChannel.name} 채널 이익률이 ${pct(
        worstChannel.marginRate
      )}로 목표(${summary.targetRate}%)를 밑돕니다.`,
      source: "매장명별 당월 집계",
    });
  } else {
    out.push({
      kind: "추세 경고",
      ...KIND_STYLE["추세 경고"],
      text: `${vendor.name}은(는) 모든 채널에서 목표(${summary.targetRate}%) 이상입니다.`,
      source: "매장명별 당월 집계",
    });
  }

  const impact = vendor.marginRate - vendor.marginRateExReturns;
  if (vendor.returnRate > 0) {
    out.push({
      kind: "기회 발견",
      ...KIND_STYLE["기회 발견"],
      text: `반품(수량 음수 라인) 수량 비중 ${pct(
        vendor.returnRate
      )} — 반품 라인 제외 시 이익률 ${pct(
        vendor.marginRateExReturns
      )} (반품 포함 대비 ${pctDelta(impact)}).`,
      source: "수량<0 라인 포함/제외 비교 (실측)",
    });
  } else {
    out.push({
      kind: "기회 발견",
      ...KIND_STYLE["기회 발견"],
      text: `${vendor.name}은(는) 이번 달 반품 라인이 없습니다.`,
      source: "수량<0 라인 집계",
    });
  }

  return out;
}
