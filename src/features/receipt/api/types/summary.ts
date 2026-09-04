import type { CategoryId } from './category';

export interface ReceiptSummary {
  total: number;
  deltaAmount: number; // 지난달보다 더/덜 쓴 금액
  deltaPercent: number; // 지난달보다 더/덜 쓴 비율
  byCategory: CategorySummary[];
}

export interface CategorySummary {
  category: CategoryId;
  amount: number;
  percent: number;
}
