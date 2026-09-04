import type { Receipt } from '../../api/types/receipt.ts';

import { groupReceiptsByDate } from '.';

const receipt = (overrides: Partial<Receipt>): Receipt => ({
  id: 1,
  merchant: '테스트 가맹점',
  category: 'food',
  date: '2026-08-20',
  amount: 1000,
  ...overrides,
});

test('빈 배열이면 빈 배열을 반환한다', () => {
  expect(groupReceiptsByDate([])).toEqual([]);
});

test('날짜가 다르면 각각 별도 그룹으로 나뉜다', () => {
  const receipts = [
    receipt({ id: 1, date: '2026-08-20', amount: 12400 }),
    receipt({ id: 2, date: '2026-08-19', amount: 6800 }),
  ];

  const groups = groupReceiptsByDate(receipts);

  expect(groups).toEqual([
    { date: '2026-08-20', total: 12400, items: [receipts[0]] },
    { date: '2026-08-19', total: 6800, items: [receipts[1]] },
  ]);
});

test('같은 날짜의 영수증은 하나의 그룹으로 합쳐지고 합계가 더해진다', () => {
  const receipts = [
    receipt({ id: 1, date: '2026-08-19', amount: 34200 }),
    receipt({ id: 2, date: '2026-08-19', amount: 6800 }),
  ];

  const groups = groupReceiptsByDate(receipts);

  expect(groups).toHaveLength(1);
  expect(groups[0]).toEqual({
    date: '2026-08-19',
    total: 41000,
    items: receipts,
  });
});

test('그룹 순서는 입력에서 각 날짜가 처음 등장한 순서를 따른다', () => {
  const receipts = [
    receipt({ id: 1, date: '2026-08-20' }),
    receipt({ id: 2, date: '2026-08-18' }),
    receipt({ id: 3, date: '2026-08-19' }),
  ];

  const groups = groupReceiptsByDate(receipts);

  expect(groups.map(g => g.date)).toEqual([
    '2026-08-20',
    '2026-08-18',
    '2026-08-19',
  ]);
});

test('같은 날짜 항목이 입력에서 떨어져 있어도(페이지 경계 등) 같은 그룹으로 합쳐진다', () => {
  const receipts = [
    receipt({ id: 1, date: '2026-08-20' }),
    receipt({ id: 2, date: '2026-08-19' }),
    receipt({ id: 3, date: '2026-08-20' }),
  ];

  const groups = groupReceiptsByDate(receipts);

  expect(groups).toHaveLength(2);
  expect(groups[0].date).toBe('2026-08-20');
  expect(groups[0].items).toEqual([receipts[0], receipts[2]]);
});
