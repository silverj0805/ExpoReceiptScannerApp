import type { Receipt } from '../../api/types/receipt';

export interface ReceiptGroup {
  date: string; // YYYY-MM-DD
  total: number;
  items: Receipt[];
}

// 같은 날짜의 영수증들을 하나의 그룹으로 묶고 그룹별 합계를 계산한다.
// 그룹 순서는 입력에서 각 날짜가 처음 등장한 순서를 따른다(서버가 최신순으로 내려주므로
// 그대로 두면 최신 날짜 그룹이 먼저 나옴). 같은 날짜 항목이 입력에서 떨어져 있어도
// (예: 페이지 경계) 올바르게 같은 그룹으로 합쳐진다.
export function groupReceiptsByDate(receipts: Receipt[]): ReceiptGroup[] {
  const groups: ReceiptGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const receipt of receipts) {
    const existingIndex = indexByDate.get(receipt.date);
    if (existingIndex === undefined) {
      indexByDate.set(receipt.date, groups.length);
      groups.push({ date: receipt.date, total: receipt.amount, items: [receipt] });
    } else {
      const group = groups[existingIndex];
      group.total += receipt.amount;
      group.items.push(receipt);
    }
  }

  return groups;
}
