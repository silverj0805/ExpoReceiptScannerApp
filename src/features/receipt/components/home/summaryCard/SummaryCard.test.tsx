import { render, screen } from '@testing-library/react-native';

import type { CategorySummary } from '@/features/receipt/api/types/summary';

import SummaryCard from '.';

const byCategory: CategorySummary[] = [
  { category: 'food', amount: 42, percent: 42 },
  { category: 'transit', amount: 18, percent: 18 },
  { category: 'shop', amount: 15, percent: 15 },
  { category: 'etc', amount: 25, percent: 25 },
];

test('금액과 증감률을 표시한다', async () => {
  await render(
    <SummaryCard
      total={842300}
      deltaAmount={-114900}
      deltaPercent={-12}
      byCategory={byCategory}
    />,
  );

  expect(screen.getByText('₩842,300')).toBeTruthy();
  expect(
    screen.getByText('지난 달 대비 -114,900원 덜 쓰고 있어요.'),
  ).toBeTruthy();
});

test('지난달보다 더 썼으면 금액/퍼센트에 + 부호를 붙인다', async () => {
  await render(
    <SummaryCard
      total={842300}
      deltaAmount={114900}
      deltaPercent={12}
      byCategory={byCategory}
    />,
  );

  expect(
    screen.getByText('지난 달 대비 114,900원 더 쓰고 있어요.'),
  ).toBeTruthy();
});

test('카테고리별 비중을 한글 라벨+퍼센트로 보여준다', async () => {
  await render(
    <SummaryCard
      total={842300}
      deltaAmount={-114900}
      deltaPercent={-12}
      byCategory={byCategory}
    />,
  );

  expect(screen.getByText('식비 42%')).toBeTruthy();
  expect(screen.getByText('교통 18%')).toBeTruthy();
  expect(screen.getByText('쇼핑 15%')).toBeTruthy();
  expect(screen.getByText('기타 25%')).toBeTruthy();
});

test('영수증이 없으면 0으로 표시하고 카테고리 비중은 안 보여준다', async () => {
  await render(
    <SummaryCard total={0} deltaAmount={0} deltaPercent={0} byCategory={[]} />,
  );

  expect(screen.getByText('₩0')).toBeTruthy();
  expect(screen.queryByText('%')).toBeNull();
  expect(screen.queryByText(/식비|교통|쇼핑|기타|건강|문화/)).toBeNull();
});
