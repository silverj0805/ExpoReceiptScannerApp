import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import type { ReceiptSummary } from '@/features/receipt/api/types/summary';

// GET /receipts/summary — 리스트 없이 집계만 내려줌.
const summaryFixture: ReceiptSummary = {
  total: 842300,
  deltaAmount: -114900,
  deltaPercent: -12,
  byCategory: [
    { category: 'food', amount: 353766, percent: 42 },
    { category: 'transit', amount: 151614, percent: 18 },
    { category: 'shop', amount: 126345, percent: 15 },
    { category: 'etc', amount: 210575, percent: 25 },
  ],
};

// GET /receipts — "최근 영수증" 리스트용. 최신순(날짜 내림차순)으로 이미 정렬된 상태로 내려온다고 가정.
const recentReceiptsFixture: Receipt[] = [
  {
    id: 1,
    merchant: '스타벅스 강남점',
    category: 'food',
    date: '2026-08-20',
    amount: 12400,
  },
  {
    id: 2,
    merchant: 'GS25 역삼점',
    category: 'etc',
    date: '2026-08-19',
    amount: 6800,
  },
  {
    id: 3,
    merchant: '카카오T',
    category: 'transit',
    date: '2026-08-18',
    amount: 9200,
  },
  {
    id: 4,
    merchant: '올리브영',
    category: 'shop',
    date: '2026-08-17',
    amount: 34000,
  },
];

export const handlers: HttpHandler[] = [
  http.get('*/receipts/summary', () => HttpResponse.json(summaryFixture)),

  // take/skip 쿼리를 실제로 반영해서 무한 스크롤 페이지네이션 동작을 재현.
  http.get('*/receipts', ({ request }) => {
    const url = new URL(request.url);
    const take = Number(url.searchParams.get('take') ?? 10);
    const skip = Number(url.searchParams.get('skip') ?? 0);
    return HttpResponse.json(recentReceiptsFixture.slice(skip, skip + take));
  }),
];
