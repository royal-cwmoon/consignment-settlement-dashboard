export type Breakdown = {
  name: string;
  revenue: number;
  marginRate: number;
};

export type Vendor = {
  name: string;
  revenue: number;
  discountTotal: number;
  settlement: number;
  profit: number;
  marginRate: number;
  marginRateExReturns: number;
  costRatio: number;
  returnRate: number;
  discountShares: [number, number, number, number];
  lineCount: number;
  prevMarginRate: number | null;
  isNew: boolean;
  channelBreakdown: Breakdown[];
  categoryBreakdown: Breakdown[];
};

export type MonthlyTrendPoint = {
  label: string;
  avgMarginRate: number;
  totalSettlement: number;
};

export type VendorSummary = {
  targetRate: number;
  periodLabel: string;
  prevPeriodLabel: string;
  uploadedAt: string;
  overall: {
    totalRevenue: number;
    totalProfit: number;
    totalSettlement: number;
    avgMarginRate: number;
    avgDiscountShare: number;
    avgCostRatio: number;
    avgReturnRate: number;
    belowTargetCount: number;
    totalVendorCount: number;
  };
  monthlyTrend: MonthlyTrendPoint[];
  vendors: Vendor[];
};
