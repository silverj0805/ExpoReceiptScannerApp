import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import { delay, http, HttpResponse } from 'msw';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import type { ReceiptSummary } from '@/features/receipt/api/types/summary';
import { server } from '@/mocks/server';

import HomeScreen from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
  // LockSetupPromptModal이 useIsFocused()로 이 탭이 포커스됐는지 확인한다 —
  // 이 화면의 테스트들은 그 값 자체를 검증하는 게 목적이 아니므로 항상 포커스된
  // 것으로 취급한다(포커스 여부에 따른 동작은 LockSetupPromptModal.test.tsx가 다룸).
  useIsFocused: jest.fn(() => true),
}));
const mockedRouter = router as unknown as { push: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
});

const renderHomeScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>,
  );
};

test('데이터 도착 전엔 로딩 상태를 보여준다', async () => {
  // 기본 목 핸들러는 응답을 즉시 반환해서, 화면에 LockSetupPromptModal처럼 마운트 시
  // 비동기 작업(하이드레이션)을 하는 컴포넌트가 하나만 더 끼어도 render()의 act
  // 플러시 안에서 응답까지 같이 resolve돼버려 "로딩 중" 순간 자체를 못 잡는 경우가
  // 생긴다(실측으로 확인). 이 테스트는 로딩 상태 자체를 검증하는 게 목적이므로,
  // 이 테스트에서만 응답을 일부러 지연시켜 로딩 창을 안정적으로 만든다.
  server.use(
    http.get('*/receipts/summary', async () => {
      await delay(50);
      return HttpResponse.json({
        total: 0,
        deltaAmount: 0,
        deltaPercent: 0,
        byCategory: [],
      } satisfies ReceiptSummary);
    }),
    http.get('*/receipts', async () => {
      await delay(50);
      return HttpResponse.json([] satisfies Receipt[]);
    }),
  );

  await renderHomeScreen();

  // ActivityIndicator 등 텍스트 없는 로딩 UI를 쓸 수 있어서 텍스트 대신 testID로 확인.
  expect(screen.getByTestId('home-loading')).toBeTruthy();

  // act(...)" 경고가 나는 걸 막기 위해, 단언이 끝난 뒤에도 완전히 로딩이 끝날 때까지 기다림.
  await waitFor(() => {
    expect(screen.queryByTestId('home-loading')).toBeNull();
  });
});

test('데이터 도착 후 이번 달 지출 요약을 보여준다', async () => {
  await renderHomeScreen();

  await waitFor(() => {
    expect(screen.getByText('₩842,300')).toBeTruthy();
    expect(
      screen.getByText('지난 달 대비 -114,900원 덜 쓰고 있어요.'),
    ).toBeTruthy();
    // list 쿼리도 같이 settle될 때까지 기다려서 act 경고를 막음.
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });
});

test('데이터 도착 후 최근 영수증 리스트를 보여준다', async () => {
  await renderHomeScreen();

  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
    // summary 쿼리도 같이 settle될 때까지 기다려서 act 경고를 막음.
    expect(screen.getByText('₩842,300')).toBeTruthy();
  });

  // 가맹점/한글 카테고리 라벨/날짜/금액이 각 영수증마다 정확히 렌더링되는지 확인.
  expect(screen.getByText('식비')).toBeTruthy();
  expect(screen.getByText('8월 20일')).toBeTruthy();
  expect(screen.getByText('₩12,400')).toBeTruthy();

  expect(screen.getByText('GS25 역삼점')).toBeTruthy();
  expect(screen.getByText('기타')).toBeTruthy();
  expect(screen.getByText('8월 19일')).toBeTruthy();
  expect(screen.getByText('₩6,800')).toBeTruthy();

  expect(screen.getByText('카카오T')).toBeTruthy();
  expect(screen.getByText('교통')).toBeTruthy();
  expect(screen.getByText('8월 18일')).toBeTruthy();
  expect(screen.getByText('₩9,200')).toBeTruthy();

  expect(screen.getByText('올리브영')).toBeTruthy();
  expect(screen.getByText('쇼핑')).toBeTruthy();
  expect(screen.getByText('8월 17일')).toBeTruthy();
  expect(screen.getByText('₩34,000')).toBeTruthy();
});

test('영수증이 하나도 없으면 요약 금액/증감률을 0으로 보여준다', async () => {
  // 이 테스트에서만 summary 응답을 빈 상태로 덮어씀
  const emptySummary: ReceiptSummary = {
    total: 0,
    deltaAmount: 0,
    deltaPercent: 0,
    byCategory: [],
  };
  server.use(
    http.get('*/receipts/summary', () => HttpResponse.json(emptySummary)),
  );

  await renderHomeScreen();

  await waitFor(() => {
    expect(screen.getByText('₩0')).toBeTruthy();
    expect(screen.queryByText('%')).toBeNull();
    // list 쿼리도 같이 settle될 때까지 기다려서 act 경고를 막음.
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });
});

test('영수증 항목을 누르면 상세 화면으로 이동한다', async () => {
  await renderHomeScreen();

  await waitFor(() => {
    expect(screen.getByText('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('receipt-item-1'));

  expect(mockedRouter.push).toHaveBeenCalledWith('/receipts/1');
});

test('영수증이 하나도 없으면 안내 문구를 보여준다', async () => {
  const emptyReceipts: Receipt[] = [];
  server.use(http.get('*/receipts', () => HttpResponse.json(emptyReceipts)));

  await renderHomeScreen();

  await waitFor(() => {
    expect(screen.getByText('아직 기록된 영수증이 없어요.')).toBeTruthy();
    // summary 쿼리도 같이 settle될 때까지 기다려서 act 경고를 막음.
    expect(screen.getByText('₩842,300')).toBeTruthy();
  });
});
