import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { router } from 'expo-router';
import { http, HttpResponse } from 'msw';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import { server } from '@/mocks/server';

import ReceiptListScreen from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
}));
const mockedRouter = router as unknown as { push: jest.Mock };

const renderReceiptListScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptListScreen />
    </QueryClientProvider>,
  );
};

// 월 경계에서 flaky해지지 않도록 실제 "오늘"을 기준으로 이번 달/지난 달 날짜를 계산해서
// 픽스처를 만든다. 이번 달엔 5건(11번째 있으면 다음 페이지), 지난 달엔 1건만 존재.
const THIS_MONTH = dayjs().format('YYYY-MM');
const LAST_MONTH = dayjs().subtract(1, 'month').format('YYYY-MM');

const FIXTURE: Receipt[] = [
  {
    id: 1,
    merchant: '스타벅스 강남점',
    category: 'food',
    date: `${THIS_MONTH}-20`,
    amount: 12400,
  },
  {
    id: 2,
    merchant: '올리브영',
    category: 'shop',
    date: `${THIS_MONTH}-19`,
    amount: 34200,
  },
  {
    id: 3,
    merchant: 'GS25 역삼점',
    category: 'etc',
    date: `${THIS_MONTH}-19`,
    amount: 6800,
  },
  {
    id: 4,
    merchant: '카카오T',
    category: 'transit',
    date: `${THIS_MONTH}-18`,
    amount: 9200,
  },
  {
    id: 5,
    merchant: '삼성약국',
    category: 'health',
    date: `${THIS_MONTH}-17`,
    amount: 15000,
  },
  {
    id: 6,
    merchant: 'CGV 강남',
    category: 'culture',
    date: `${LAST_MONTH}-25`,
    amount: 14500,
  },
];

const mockReceiptsEndpoint = (fixture: Receipt[] = FIXTURE) => {
  server.use(
    http.get('*/receipts', ({ request }) => {
      const url = new URL(request.url);
      const take = Number(url.searchParams.get('take') ?? 10);
      const skip = Number(url.searchParams.get('skip') ?? 0);
      const category = url.searchParams.get('category');
      const month = url.searchParams.get('month');

      let filtered = fixture;
      if (month) filtered = filtered.filter(r => r.date.startsWith(month));
      if (category) {
        const ids = category.split(',');
        filtered = filtered.filter(r => ids.includes(r.category));
      }
      return HttpResponse.json(filtered.slice(skip, skip + take));
    }),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReceiptsEndpoint();
});

test('데이터 도착 전엔 스켈레톤을 보여주고, 필터 UI는 그대로 조작할 수 있다', async () => {
  await renderReceiptListScreen();

  // HomeScreen과 동일한 패턴: 전체 화면을 스피너로 덮지 않고 목록 자리만
  // 스켈레톤으로 보여줘서, 로딩 중에도 기간/카테고리 필터는 바로 조작할 수 있다.
  expect(screen.getAllByTestId('receipt-list-skeleton').length).toBeGreaterThan(
    0,
  );
  expect(screen.getByTestId('period-month')).toBeTruthy();

  await waitFor(() => {
    expect(screen.queryByTestId('receipt-list-skeleton')).toBeNull();
  });
});

test('기본값은 기간 "이번 달" + 카테고리 "전체"이고, 날짜별로 그룹핑해서 보여준다', async () => {
  await renderReceiptListScreen();

  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  expect(
    screen.getByTestId('period-month').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('period-last').props.accessibilityState,
  ).toMatchObject({ selected: false });
  expect(
    screen.getByTestId('category-filter-all').props.accessibilityState,
  ).toMatchObject({ selected: true });

  // 8/19 그룹(올리브영+GS25)이 하나로 묶여서 그룹 헤더에 합계가 표시된다.
  const groupLabel = dayjs(`${THIS_MONTH}-19`)
    .locale('ko')
    .format('M월 D일 dddd');
  expect(screen.getByText(groupLabel)).toBeTruthy();
  expect(screen.getByText('₩41,000')).toBeTruthy();
  expect(screen.getByText('올리브영')).toBeTruthy();
  expect(screen.getByText('GS25 역삼점')).toBeTruthy();

  // 지난 달 항목은 기본 필터(이번 달)에서 보이면 안 됨.
  expect(screen.queryByText('CGV 강남')).toBeNull();
});

test('"지난 달"을 누르면 지난 달 데이터만 보여준다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('period-last'));

  await waitFor(() => {
    expect(screen.getByText('CGV 강남')).toBeTruthy();
  });
  expect(screen.queryByText('스타벅스 강남점')).toBeNull();
  expect(
    screen.getByTestId('period-last').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('period-month').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test('"전체" 기간을 누르면 이번 달/지난 달 모두 보여준다', async () => {
  // 페이지네이션과 얽히지 않게 PAGE_SIZE(10)보다 적은 픽스처로 이 테스트만 override.
  mockReceiptsEndpoint([
    {
      id: 1,
      merchant: '스타벅스 강남점',
      category: 'food',
      date: `${THIS_MONTH}-20`,
      amount: 12400,
    },
    {
      id: 6,
      merchant: 'CGV 강남',
      category: 'culture',
      date: `${LAST_MONTH}-25`,
      amount: 14500,
    },
  ]);

  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });
  expect(screen.queryByText('CGV 강남')).toBeNull();

  await fireEvent.press(screen.getByTestId('period-all'));

  await waitFor(() => {
    expect(screen.getByText('CGV 강남')).toBeTruthy();
  });
  expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
});

test('카테고리 하나를 고르면 "전체"는 해제되고 해당 카테고리만 보여준다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('category-filter-food'));

  await waitFor(() => {
    expect(screen.queryByText('올리브영')).toBeNull();
  });
  expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  expect(
    screen.getByTestId('category-filter-food').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('category-filter-all').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test('카테고리를 여러 개 고르면 다중 선택으로 필터링한다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('category-filter-food'));
  await fireEvent.press(screen.getByTestId('category-filter-transit'));

  await waitFor(() => {
    expect(screen.getByText('카카오T')).toBeTruthy();
  });
  expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  expect(screen.queryByText('올리브영')).toBeNull();
  expect(screen.queryByText('삼성약국')).toBeNull();
});

test('선택된 카테고리를 전부 해제하면 다시 "전체"로 돌아간다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('category-filter-food'));
  await waitFor(() => {
    expect(screen.queryByText('올리브영')).toBeNull();
  });

  // 다시 눌러서 선택 해제.
  await fireEvent.press(screen.getByTestId('category-filter-food'));

  await waitFor(() => {
    expect(screen.getByText('올리브영')).toBeTruthy();
  });
  expect(
    screen.getByTestId('category-filter-all').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('category-filter-food').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test('"전체" 칩을 누르면 선택돼있던 카테고리들이 모두 해제된다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('category-filter-food'));
  await fireEvent.press(screen.getByTestId('category-filter-transit'));
  await waitFor(() => {
    expect(screen.queryByText('올리브영')).toBeNull();
  });

  await fireEvent.press(screen.getByTestId('category-filter-all'));

  await waitFor(() => {
    expect(screen.getByText('올리브영')).toBeTruthy();
  });
  expect(
    screen.getByTestId('category-filter-all').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('category-filter-food').props.accessibilityState,
  ).toMatchObject({ selected: false });
  expect(
    screen.getByTestId('category-filter-transit').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test('필터 결과가 없으면 안내 문구를 보여준다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  // 이번 달(기본 기간)엔 문화 카테고리 항목이 없음(CGV 강남은 지난 달).
  await fireEvent.press(screen.getByTestId('category-filter-culture'));

  await waitFor(() => {
    expect(screen.getByText('조건에 맞는 영수증이 없어요')).toBeTruthy();
  });
});

test('리스트 끝에 도달하면 다음 페이지를 요청한다', async () => {
  // PAGE_SIZE(10)보다 많은 11건을 전부 이번 달(기본 필터)로 채워서 다음 페이지가 실제로
  // 존재하는 상황을 만든다.
  // (원본 테스트의 "PAGE_SIZE(4)" 주석은 HomeScreen 테스트에서 잘못 복사돼 온 것으로
  // 보임 — 실제 ReceiptListScreen의 PAGE_SIZE는 10이고, 원본 픽스처는 이번 달 5건뿐이라
  // endReached 없이도 이미 첫 페이지에 다 들어가 있어 정작 페이지네이션을 검증하지
  // 못하고 있었음.)
  //
  // 렌더링된 항목 텍스트로 "다음 페이지가 보이는지" 확인하는 방식은 못 쓴다 — FlatList/
  // VirtualizedList가 기본 initialNumToRender=10이라, 실제 스크롤(레이아웃 이벤트) 없이는
  // RNTL 환경에서 11번째 항목을 아예 렌더링하지 않는다(데이터는 11개 다 들어와 있어도
  // 화면엔 10개까지만 마운트됨 — fetchNextPage의 resolve 값을 직접 찍어 데이터 자체는
  // 정상 도착함을 실측으로 먼저 확인한 뒤에 알아낸 제약). 그래서 "다음 페이지를 실제로
  // 요청했는지"를 MSW 핸들러 호출 인자(skip 값)로 직접 검증한다.
  const manyReceipts: Receipt[] = Array.from({ length: 11 }, (_, i) => ({
    id: 100 + i,
    merchant: `가맹점 ${i + 1}`,
    category: 'etc',
    date: `${THIS_MONTH}-${String(20 - i).padStart(2, '0')}`,
    amount: 1000 * (i + 1),
  }));
  const receiptsHandler = jest.fn(({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const take = Number(url.searchParams.get('take') ?? 10);
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const filtered = manyReceipts.filter(r => r.date.startsWith(THIS_MONTH));
    return HttpResponse.json(filtered.slice(skip, skip + take));
  });
  server.use(http.get('*/receipts', receiptsHandler));

  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('가맹점 1')).toBeTruthy();
  });
  expect(receiptsHandler).toHaveBeenCalledTimes(1);

  await fireEvent(screen.getByTestId('receipt-list'), 'endReached');

  await waitFor(() => {
    expect(receiptsHandler).toHaveBeenCalledTimes(2);
  });
  const secondRequestUrl = new URL(receiptsHandler.mock.calls[1][0].request.url);
  expect(secondRequestUrl.searchParams.get('skip')).toBe('10');
});

test('영수증 항목을 누르면 상세 화면으로 이동한다', async () => {
  await renderReceiptListScreen();
  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('receipt-item-1'));

  expect(mockedRouter.push).toHaveBeenCalledWith('/receipts/1');
});
