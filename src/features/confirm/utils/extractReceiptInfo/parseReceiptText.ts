import { extractAmount } from './amount/extractAmount';
import { extractDate } from './date/extractDate';
import { extractItemName } from './itemName/extractItemName';
import { extractMerchant } from './merchant/extractMerchant';

export interface ParsedReceipt {
  merchant: string | null;
  itemName: string | null;
  amount: number | null;
  date: string | null;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  return {
    merchant: extractMerchant(rawText),
    itemName: extractItemName(rawText),
    amount: extractAmount(rawText),
    date: extractDate(rawText),
  };
}
