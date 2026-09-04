import { createQueryKeys } from '@lukemorales/query-key-factory';

import client from '@/shared/api/client';

import {
  CreateReceiptPayload,
  CreateReceiptResponse,
  Receipt,
} from './types/receipt';
import type { ReceiptSummary } from './types/summary';

export const receiptRepository = (() => {
  const BASE_URL = '/receipts';

  return {
    getSummary: async () => client.get<ReceiptSummary>(`${BASE_URL}/summary`),

    getList: async ({
      take,
      skip,
      category,
      month,
    }: {
      take: number;
      skip: number;
      category?: string; // 콤마로 구분한 카테고리 id 목록
      month?: string; // YYYY-MM
    }) =>
      client.get<Receipt[]>(BASE_URL, {
        params: { take, skip, category, month },
      }),

    postReceipt: async (payload: CreateReceiptPayload) =>
      client.post<CreateReceiptResponse>(BASE_URL, payload),

    getReceiptById: async (id: string) =>
      client.get<Receipt>(`${BASE_URL}/${id}`),

    deleteReceipt: async (id: string) =>
      client.delete<void>(`${BASE_URL}/${id}`),

    // 스펙상 전부 optional한 부분 업데이트지만, ConfirmScreen의 폼은 항상 전체 값을
    // 채워서 보내므로 CreateReceiptPayload(전부 필수)를 그대로 재사용한다.
    patchReceipt: async (id: string, payload: CreateReceiptPayload) =>
      client.patch<Receipt>(`${BASE_URL}/${id}`, payload),
  };
})();

export const receiptQueryFactory = createQueryKeys('receipt', {
  summary: () => ({
    queryKey: ['this-month'],
    queryFn: receiptRepository.getSummary,
  }),
  // queryKey만 제공. useInfiniteQuery의 queryFn은 pageParam 제네릭이 필요한데,
  // createQueryKeys가 감싸는 QueryFunction 타입은 TPageParam을 알지 못해
  // 여기서 만들면 pageParam이 unknown으로 좁혀지지 않는다. 그래서 실제 queryFn은
  // useInfiniteQuery 호출부(HomeScreen)에서 직접 정의해서 타입 추론을 살린다.
  list: () => ({
    queryKey: ['list'],
  }),
  detail: (id: string) => ({
    queryKey: [id],
    queryFn: () => receiptRepository.getReceiptById(id),
  }),
});
