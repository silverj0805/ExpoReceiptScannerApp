import dayjs from 'dayjs';

import type { CategoryId } from '../../api/types/category';

export type PeriodFilter = 'month' | 'last' | 'all';

/**
 * 기간 탭 값을 실제 API의 month 쿼리 파라미터(YYYY-MM)로 변환.
 * '전체'는 필터 없음(undefined)
 * today는 테스트에서 월 경계 flaky를 피하려고 주입 가능하게 함.
 */
export function periodToMonthParam(
  period: PeriodFilter,
  today: Date = new Date(),
): string | undefined {
  switch (period) {
    case 'month':
      return dayjs(today).format('YYYY-MM');
    case 'last':
      return dayjs(today).subtract(1, 'month').format('YYYY-MM');
    case 'all':
      return undefined;
  }
}

/**
 * 선택된 카테고리 목록을 API의 category 쿼리 파라미터(콤마 구분)로 변환.
 * 하나도 안 골랐거나(="전체")
 * 전체 카테고리를 다 골랐으면 필터링 의미가 없으므로 생략(undefined).
 */
export function categoriesToParam(
  selected: CategoryId[],
  allIds: readonly CategoryId[],
): string | undefined {
  if (selected.length === 0 || selected.length >= allIds.length) {
    return undefined;
  }
  return selected.join(',');
}
