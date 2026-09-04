import type { CategoryId } from '../../api/types/category.ts';

import { categoriesToParam, periodToMonthParam } from '.';

describe('periodToMonthParam', () => {
  test('month(이번 달)은 today의 YYYY-MM을 반환한다', () => {
    expect(periodToMonthParam('month', new Date('2026-08-30'))).toBe('2026-08');
  });

  test('last(지난 달)은 today의 전월 YYYY-MM을 반환한다', () => {
    expect(periodToMonthParam('last', new Date('2026-08-30'))).toBe('2026-07');
  });

  test('last는 연도 경계(1월 -> 작년 12월)도 올바르게 넘어간다', () => {
    expect(periodToMonthParam('last', new Date('2026-01-15'))).toBe('2025-12');
  });

  test('all(전체)은 undefined를 반환한다(필터 생략)', () => {
    expect(periodToMonthParam('all', new Date('2026-08-30'))).toBeUndefined();
  });
});

describe('categoriesToParam', () => {
  const ALL_IDS: CategoryId[] = [
    'food',
    'transit',
    'shop',
    'culture',
    'health',
    'etc',
  ];

  test('아무것도 선택 안 했으면(=전체) undefined를 반환한다', () => {
    expect(categoriesToParam([], ALL_IDS)).toBeUndefined();
  });

  test('일부만 선택했으면 콤마로 구분한 문자열을 반환한다', () => {
    expect(categoriesToParam(['food'], ALL_IDS)).toBe('food');
    expect(categoriesToParam(['food', 'transit'], ALL_IDS)).toBe(
      'food,transit',
    );
  });

  test('전체 카테고리를 다 선택했으면 undefined를 반환한다(필터링 안 한 것과 동일)', () => {
    expect(categoriesToParam(ALL_IDS, ALL_IDS)).toBeUndefined();
  });
});
