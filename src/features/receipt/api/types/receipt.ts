import type { CategoryId } from './category';

export interface Receipt {
  id: number;
  merchant: string;
  itemName?: string;
  amount: number;
  category: CategoryId;
  rawText?: string;
  date: string; // ISO date string (YYYY-MM-DD)
}

export interface CreateReceiptPayload {
  merchant: string;
  itemName?: string;
  amount: number;
  category: CategoryId;
  rawText?: string;
  date: string; // YYYY-MM-DD
}

export interface CreateReceiptResponse {
  id: number;
  deviceId: string;
  merchant: string;
  itemName?: string;
  amount: number;
  category: CategoryId;
  rawText?: string;
  date: string; // ISO datetime
  createdAt: string; // ISO datetime
}
