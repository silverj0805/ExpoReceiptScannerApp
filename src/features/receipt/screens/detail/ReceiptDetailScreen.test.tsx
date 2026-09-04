import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { http, HttpResponse } from 'msw';
import { Alert } from 'react-native';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import { server } from '@/mocks/server';

import ReceiptDetailScreen from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
const mockedRouter = router as unknown as { push: jest.Mock; back: jest.Mock };
const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

// 실제 Alert을 띄우면 Jest에서 못 다루니 스파이로 대체
// 호출 여부/버튼 구성만 검증하고 "확인" 버튼의 onPress를 직접 호출해서 사용자가 확인을 누른 상황을 흉내낸다.
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const mockedAlert = Alert.alert as jest.Mock;

/**
 * destructive.onPress()가 deleteMutation.mutate()(비동기)를 트리거하므로
 * 반드시 await act(async () => ...)로 감싸야 함
 * 동기 act(() => ...)로 감싸면 React의 act 추적이 이 비동기 작업을 놓쳐서,
 * 정작 실패는 엉뚱하게 "다음" 테스트의 초기 렌더(useQuery의 최초 fetch)가 이유 없이 멈추는 형태로 나타님
 */
const pressDestructiveAlertButton = async () => {
  const buttons = mockedAlert.mock.calls[mockedAlert.mock.calls.length - 1][2];
  const destructive = buttons.find(
    (button: { style?: string }) => button.style === 'destructive',
  );
  await act(async () => {
    destructive.onPress();
  });
};

const renderDetailScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptDetailScreen />
    </QueryClientProvider>,
  );
};

const RAW_TEXT = [
  '스타벅스 강남점',
  '서울 강남구 테헤란로 123',
  '아메리카노 Tall   4,500',
  '카페라떼 Grande   5,900',
  '─────────────',
  '합계          12,400',
].join('\n');

const FIXTURE: Receipt = {
  id: 1,
  merchant: '스타벅스 강남점',
  category: 'food',
  date: '2026-08-20',
  amount: 12400,
  rawText: RAW_TEXT,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseLocalSearchParams.mockReturnValue({ id: '1' });
  server.use(
    http.get('*/receipts/:id', ({ params }) => {
      if (params.id !== '1') {
        return HttpResponse.json({ message: 'not found' }, { status: 404 });
      }
      return HttpResponse.json(FIXTURE);
    }),
    http.delete('*/receipts/:id', ({ params }) => {
      if (params.id !== '1') {
        return HttpResponse.json({ message: 'not found' }, { status: 404 });
      }
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

test('데이터 도착 전엔 로딩 상태를 보여준다', async () => {
  // MSW 목 응답이 사실상 즉시 처리돼서, 응답을 잠깐 붙잡아두지 않으면 "로딩 중" 단언이
  // await render(...)가 끝나기 전에 이미 데이터가 도착해버리는 것과 경합한다(실측으로 확인
  // — 원본 CLI 테스트는 NavigationContainer 등 더 무거운 초기 렌더 오버헤드 덕에 우연히
  // 안 겪었을 뿐, 근본적으로는 같은 경합이 있었을 것으로 보임). 응답을 직접 붙잡아뒀다가
  // 로딩 상태를 확인한 뒤에 풀어준다.
  let resolveGet: () => void = () => {};
  server.use(
    http.get(
      '*/receipts/:id',
      () =>
        new Promise<Response>(resolve => {
          resolveGet = () => resolve(HttpResponse.json(FIXTURE));
        }),
    ),
  );

  await renderDetailScreen();

  expect(screen.getByTestId('receipt-detail-loading')).toBeTruthy();

  resolveGet();
  await waitFor(() => {
    expect(screen.queryByTestId('receipt-detail-loading')).toBeNull();
  });
});

test('영수증 정보를 보여준다', async () => {
  await renderDetailScreen();

  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });
  expect(screen.getByText('식비')).toBeTruthy();
  expect(screen.getByText('₩12,400')).toBeTruthy();
  // date는 YYYY-MM-DD만 오므로(시간 없음) 요일까지만 표기 — 2026-08-20은 목요일.
  expect(screen.getByText('2026.08.20 (목)')).toBeTruthy();
});

test('인식된 원문은 기본적으로 펼쳐져 있고, 토글을 누르면 접고 펼 수 있다', async () => {
  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  expect(screen.getByText(RAW_TEXT)).toBeTruthy();

  await fireEvent.press(screen.getByText('인식된 원문'));
  expect(screen.queryByText(RAW_TEXT)).toBeNull();

  await fireEvent.press(screen.getByText('인식된 원문'));
  expect(screen.getByText(RAW_TEXT)).toBeTruthy();
});

test('원문이 없으면 인식된 원문 섹션 자체를 보여주지 않는다', async () => {
  server.use(
    http.get('*/receipts/:id', () =>
      HttpResponse.json({ ...FIXTURE, rawText: undefined }),
    ),
  );

  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  expect(screen.queryByText('인식된 원문')).toBeNull();
});

test('뒤로가기 버튼을 누르면 이전 화면으로 돌아간다', async () => {
  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-back-button'));

  expect(mockedRouter.back).toHaveBeenCalled();
});

test('수정 버튼을 누르면 ConfirmScreen으로 영수증 정보를 들고 이동한다', async () => {
  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-edit-button'));

  expect(mockedRouter.push).toHaveBeenCalledWith({
    pathname: '/confirm',
    params: { info: JSON.stringify(FIXTURE) },
  });
});

test('존재하지 않거나 다른 기기 소유의 영수증이면(404) 안내 문구를 보여준다', async () => {
  mockedUseLocalSearchParams.mockReturnValue({ id: '999' });

  await renderDetailScreen();

  await waitFor(() => {
    expect(screen.getByText('영수증을 찾을 수 없어요')).toBeTruthy();
  });
});

test('그 외 에러가 나면 재시도 안내 문구를 보여준다', async () => {
  server.use(
    http.get('*/receipts/:id', () =>
      HttpResponse.json({ message: 'error' }, { status: 500 }),
    ),
  );

  await renderDetailScreen();

  await waitFor(() => {
    expect(
      screen.getByText('영수증을 불러오지 못했어요. 다시 시도해주세요.'),
    ).toBeTruthy();
  });
});

test('삭제 버튼을 누르면 확인 Alert을 띄우고, 확인 전에는 삭제 API를 호출하지 않는다', async () => {
  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-delete-button'));

  expect(mockedAlert).toHaveBeenCalled();
  const [title, , buttons] = mockedAlert.mock.calls[0];
  expect(title).toContain('삭제');
  expect(buttons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ style: 'cancel' }),
      expect.objectContaining({ style: 'destructive' }),
    ]),
  );
  expect(mockedRouter.back).not.toHaveBeenCalled();
});

test('Alert에서 확인하면 삭제 API를 호출하고, 성공하면 뒤로간다', async () => {
  // 목록 갱신은 더 이상 이 화면의 invalidateQueries가 아니라 돌아갈 화면의
  // useFocusEffect가 담당(HomeScreen/ReceiptListScreen 테스트 참고).
  const { unmount } = await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-delete-button'));
  await pressDestructiveAlertButton();

  await waitFor(() => {
    expect(mockedRouter.back).toHaveBeenCalled();
  });

  unmount();
});

test('삭제가 진행되는 동안 버튼이 비활성화되고 로딩 인디케이터를 보여준다', async () => {
  // 진짜로 영원히 안 끝나는 Promise를 쓰면 요청이 테스트가 끝난 뒤에도 msw에 걸린 채로
  // 남아서 다음 테스트로 새어나간다(resolver를 붙잡아뒀다가 단언이 끝나면 직접 resolve).
  let resolveDelete: () => void = () => {};
  server.use(
    http.delete(
      '*/receipts/:id',
      () =>
        new Promise<Response>(resolve => {
          resolveDelete = () =>
            resolve(new HttpResponse(null, { status: 204 }));
        }),
    ),
  );

  const { unmount } = await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-delete-button'));
  await pressDestructiveAlertButton();

  await waitFor(() => {
    expect(screen.getByTestId('detail-delete-loading')).toBeTruthy();
    expect(
      screen.getByTestId('detail-delete-button').props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  resolveDelete();
  await waitFor(() => {
    expect(mockedRouter.back).toHaveBeenCalled();
  });
  // goBack이 목이라 실제로는 화면이 unmount되지 않으므로
  // 실제 네비게이션이었다면 일어났을 unmount를 직접 흉내내서 정리.
  unmount();
});

test('삭제가 진행되는 동안 다시 눌러도 삭제 API가 중복 호출되지 않는다', async () => {
  let resolveDelete: () => void = () => {};
  const deleteHandler = jest.fn(
    () =>
      new Promise<Response>(resolve => {
        resolveDelete = () => resolve(new HttpResponse(null, { status: 204 }));
      }),
  );
  server.use(http.delete('*/receipts/:id', deleteHandler));

  const { unmount } = await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-delete-button'));
  await pressDestructiveAlertButton();
  await waitFor(() => {
    expect(screen.getByTestId('detail-delete-loading')).toBeTruthy();
  });

  // 로딩 중엔 버튼이 disabled라 다시 눌러도 실제 onPress가 안 불려야 함.
  fireEvent.press(screen.getByTestId('detail-delete-button'));

  await waitFor(() => {
    expect(deleteHandler).toHaveBeenCalledTimes(1);
  });

  resolveDelete();
  await waitFor(() => {
    expect(mockedRouter.back).toHaveBeenCalled();
  });
  unmount();
});

test('삭제에 실패하면 에러 문구를 보여주고 다시 시도할 수 있다', async () => {
  server.use(
    http.delete('*/receipts/:id', () =>
      HttpResponse.json({ message: 'error' }, { status: 500 }),
    ),
  );

  await renderDetailScreen();
  await waitFor(() => {
    expect(screen.getByTestId('detail-merchant')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('detail-delete-button'));
  await pressDestructiveAlertButton();

  await waitFor(() => {
    expect(
      screen.getByText('삭제에 실패했어요. 다시 시도해주세요.'),
    ).toBeTruthy();
  });
  expect(mockedRouter.back).not.toHaveBeenCalled();
  expect(
    screen.getByTestId('detail-delete-button').props.accessibilityState
      .disabled,
  ).toBe(false);
});
