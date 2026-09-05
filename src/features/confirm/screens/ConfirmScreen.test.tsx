import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';

import { receiptQueryFactory, receiptRepository } from '@/features/receipt/api';
import type { Receipt } from '@/features/receipt/api/types/receipt';

import NativeReceiptScannerModule from '../../../../modules/native-receipt-scanner/src/NativeReceiptScannerModule';
import { deleteTempImage } from '../utils/deleteTempImage';

import ConfirmScreen from './ConfirmScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../../../modules/native-receipt-scanner/src/NativeReceiptScannerModule', () => ({
  __esModule: true,
  default: { scanText: jest.fn() },
}));

jest.mock('../utils/deleteTempImage', () => ({
  deleteTempImage: jest.fn(),
}));

jest.mock('@/features/receipt/api', () => ({
  ...jest.requireActual('@/features/receipt/api'),
  receiptRepository: {
    postReceipt: jest.fn(),
    patchReceipt: jest.fn(),
  },
}));

const mockedRouter = router as unknown as {
  back: jest.Mock;
  dismissTo: jest.Mock;
};
const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockedScanText = NativeReceiptScannerModule.scanText as jest.Mock;
const mockedDeleteTempImage = deleteTempImage as jest.Mock;
const mockedPostReceipt = receiptRepository.postReceipt as jest.Mock;
const mockedPatchReceipt = receiptRepository.patchReceipt as jest.Mock;

const RAW_TEXT_SUCCESS = [
  '점포명 : 스타벅스 강남점',
  '서울 강남구 테헤란로 123',
  '주문일시 : 2026-08-20 14:32:00',
  '아메리카노 Tall   4,500',
  '카페라떼 Grande   5,900',
  '총 액          12,400',
].join('\n');

// ReceiptDetailScreen의 "수정"에서 넘어올 때 route.params.info로 오는 값.
// (expo-router는 실제 값을 JSON 문자열로만 넘길 수 있어 params.info는 항상 string.)
const EDIT_RECEIPT: Receipt = {
  id: 1,
  merchant: '스타벅스 강남점',
  amount: 12400,
  category: 'food',
  date: '2026-08-20',
  rawText: RAW_TEXT_SUCCESS,
};

// ConfirmScreen이 useMutation/useQueryClient를 쓰므로 QueryClientProvider로 감싸야 함
// (HomeScreen.test.tsx와 동일한 패턴).
const renderConfirmScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmScreen />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseLocalSearchParams.mockReturnValue({
    imageUri: 'file:///tmp/photo.jpg',
  });
});

test('인식 중엔 로딩 상태를 보여준다', async () => {
  mockedScanText.mockReturnValue(new Promise(() => {})); // 영원히 pending

  await renderConfirmScreen();

  expect(screen.getByTestId('confirm-loading')).toBeTruthy();
});

test('인식에 성공하면 점포명/총액/주문일시로 폼을 채운다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();

  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
    expect(screen.getByDisplayValue('12400')).toBeTruthy();
    // 날짜는 더 이상 TextInput이 아니라 피커를 여는 Pressable이라 표시 텍스트로 확인.
    expect(screen.getByText('2026년 8월 20일')).toBeTruthy();
  });
});

test('품명 입력란은 비어있는 채로 시작하고, 비어있어도 저장할 수 있다(옵셔널)', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  expect(screen.getByTestId('item-name-input').props.value).toBe('');

  await fireEvent.press(screen.getByTestId('category-food'));

  await waitFor(() => {
    expect(
      screen.getByTestId('save-button').props.accessibilityState.disabled,
    ).toBe(false);
  });
});

test('품명을 입력하면 저장 시 payload에 포함된다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);
  mockedPostReceipt.mockResolvedValue({});

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.changeText(
    screen.getByTestId('item-name-input'),
    '아메리카노 Tall',
  );
  await fireEvent.press(screen.getByTestId('category-food'));
  await fireEvent.press(screen.getByText('저장하기'));

  await waitFor(() => {
    expect(mockedPostReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: '아메리카노 Tall' }),
      expect.anything(),
    );
  });
});

test('인식된 원문 토글을 누르면 원문을 펼치고 접는다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });

  expect(screen.queryByText(RAW_TEXT_SUCCESS)).toBeNull();

  await fireEvent.press(screen.getByText('인식된 원문'));
  expect(screen.getByText(RAW_TEXT_SUCCESS)).toBeTruthy();

  await fireEvent.press(screen.getByText('인식된 원문'));
  expect(screen.queryByText(RAW_TEXT_SUCCESS)).toBeNull();
});

test('텍스트 인식에 실패하면(빈 문자열) 안내를 보여준다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();

  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
  expect(screen.getByText('다시 촬영')).toBeTruthy();
  expect(screen.getByText('직접 입력')).toBeTruthy();
});

test('scanText가 실패(reject)해도 죽지 않고 인식 실패 화면을 보여준다', async () => {
  // 존재하지 않는 imageUri 등으로 네이티브 쪽이 reject하는 경우.
  // .catch() 없이 방치하면 unhandled rejection으로 앱이 죽은 것처럼 보였던 회귀 재발 방지.
  mockedScanText.mockRejectedValue(new Error('SCAN_ERROR'));

  await renderConfirmScreen();

  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
});

test('인식이 끝나면(성공) 임시 사진 파일을 지운다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();

  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  expect(mockedDeleteTempImage).toHaveBeenCalledWith('file:///tmp/photo.jpg');
});

test('인식이 실패해도(reject) 임시 사진 파일은 지운다', async () => {
  mockedScanText.mockRejectedValue(new Error('SCAN_ERROR'));

  await renderConfirmScreen();

  await waitFor(() => {
    expect(mockedDeleteTempImage).toHaveBeenCalledWith('file:///tmp/photo.jpg');
  });
});

test('인식 실패 화면에서 다시 촬영을 누르면 이전 화면으로 돌아간다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });

  await fireEvent.press(screen.getByText('다시 촬영'));

  expect(mockedRouter.back).toHaveBeenCalled();
});

test('인식 실패 화면에서 직접 입력을 누르면 빈 폼으로 전환된다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });

  await fireEvent.press(screen.getByText('직접 입력'));

  expect(screen.getByTestId('merchant-input').props.value).toBe('');
  expect(screen.getByTestId('amount-input').props.value).toBe('');
});

test('카테고리를 선택할 수 있다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });

  await fireEvent.press(screen.getByTestId('category-transit'));

  expect(
    screen.getByTestId('category-transit').props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    screen.getByTestId('category-food').props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test('필드를 채웠다 비우면 해당 필드의 에러 메시지를 보여준다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
  await fireEvent.press(screen.getByText('직접 입력'));

  // mode: 'onChange'라 필드를 한 번 건드려야 검증이 도는데, 이미 빈 값이므로
  // 값이 있다가 지워지는 상황을 만들어서 required 검증을 트리거함.
  await fireEvent.changeText(screen.getByTestId('merchant-input'), '가');
  await fireEvent.changeText(screen.getByTestId('merchant-input'), '');

  await waitFor(() => {
    expect(screen.getByText('가맹점명을 입력해주세요')).toBeTruthy();
  });
});

test('날짜를 아직 선택하지 않았으면 안내 문구를 보여주고, 피커에서 고르면 반영된다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
  await fireEvent.press(screen.getByText('직접 입력'));

  expect(screen.getByText('날짜를 선택해주세요')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('date-input'));
  expect(screen.getByTestId('date-picker-native')).toBeTruthy();

  // 타임존 변환에 흔들리지 않도록 UTC('Z') 대신 로컬 시각으로 지정.
  await fireEvent.changeText(
    screen.getByTestId('date-picker-native'),
    '2026-08-25T12:00:00',
  );
  await fireEvent.press(screen.getByText('확인'));

  expect(screen.getByText('2026년 8월 25일')).toBeTruthy();
});

test('피커 휠을 건드리지 않고 확인만 눌러도 기본값(오늘)이 그대로 셋팅된다', async () => {
  // 회귀 테스트: iOS UIDatePicker는 사용자가 실제로 휠을 굴려야만 onChange가 오기
  // 때문에, 기본값을 그대로 둔 채 확인만 누르면 onChange가 한 번도 안 와서 폼에
  // 반영이 안 되는 버그가 있었음(pendingDate로 항상 커밋하도록 고침).
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
  await fireEvent.press(screen.getByText('직접 입력'));

  await fireEvent.press(screen.getByTestId('date-input'));
  expect(screen.getByTestId('date-picker-native')).toBeTruthy();

  // 피커 값은 건드리지 않고 바로 확인.
  await fireEvent.press(screen.getByText('확인'));

  expect(screen.getByText(dayjs().format('YYYY년 M월 D일'))).toBeTruthy();
});

test('직접 입력 모드에서는 처음엔 저장하기 버튼이 비활성화돼 있다', async () => {
  mockedScanText.mockResolvedValue('');

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByText('텍스트를 인식하지 못했어요')).toBeTruthy();
  });
  await fireEvent.press(screen.getByText('직접 입력'));

  expect(
    screen.getByTestId('save-button').props.accessibilityState.disabled,
  ).toBe(true);
});

test('인식에 성공해도 카테고리를 직접 고르기 전까지는 저장하기 버튼이 비활성화돼 있다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });

  // 가맹점명/금액/날짜는 자동 인식으로 채워졌지만 카테고리는 아직 안 골랐음.
  expect(
    screen.getByTestId('save-button').props.accessibilityState.disabled,
  ).toBe(true);
});

test('가맹점명/금액/날짜/카테고리를 모두 채우면 저장하기 버튼이 활성화된다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  expect(
    screen.getByTestId('save-button').props.accessibilityState.disabled,
  ).toBe(true);

  await fireEvent.press(screen.getByTestId('category-food'));

  await waitFor(() => {
    expect(
      screen.getByTestId('save-button').props.accessibilityState.disabled,
    ).toBe(false);
  });
});

test('저장하기를 누르면 postReceipt를 호출하고 성공하면 홈으로 이동한다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);
  mockedPostReceipt.mockResolvedValue({});

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  await fireEvent.press(screen.getByTestId('category-food'));
  await waitFor(() => {
    expect(
      screen.getByTestId('save-button').props.accessibilityState.disabled,
    ).toBe(false);
  });

  await fireEvent.press(screen.getByText('저장하기'));

  await waitFor(() => {
    // useMutation의 mutationFn은 (variables, context) 두 인자로 호출되므로
    // (context는 {client, meta, mutationKey} — react-query 내부 구현, 우리 코드는 안 씀)
    // 두 번째 인자는 느슨하게 매칭.
    expect(mockedPostReceipt).toHaveBeenCalledWith(
      {
        merchant: '스타벅스 강남점',
        amount: 12400,
        category: 'food',
        date: '2026-08-20',
        rawText: RAW_TEXT_SUCCESS,
      },
      expect.anything(),
    );
    // CLI는 goBack() + navigate(Home) 두 번으로 홈 탭까지 이동했지만, expo-router에서는
    // dismissTo('/')로 스택 깊이에 상관없이 한 번에 홈으로 이동한다(ConfirmScreen 코드 주석 참고).
    expect(mockedRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

test('저장이 진행되는 동안 버튼이 비활성화되고 저장하기 대신 로딩 인디케이터를 보여준다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);
  let resolvePostReceipt: (value: unknown) => void = () => {};
  mockedPostReceipt.mockReturnValue(
    new Promise(resolve => {
      resolvePostReceipt = resolve;
    }),
  );

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  await fireEvent.press(screen.getByTestId('category-food'));

  // postReceipt가 영원히 pending이라 await하면(act flush가 끝나길 기다림) 테스트가
  // 타임아웃남 — await 없이 이벤트만 트리거하고 waitFor로 결과만 폴링.
  fireEvent.press(screen.getByText('저장하기'));

  await waitFor(() => {
    expect(screen.queryByText('저장하기')).toBeNull();
    expect(screen.getByTestId('save-loading')).toBeTruthy();
    expect(
      screen.getByTestId('save-button').props.accessibilityState.disabled,
    ).toBe(true);
  });

  resolvePostReceipt({});
  await waitFor(() => {
    expect(mockedRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

test('저장이 진행되는 동안 다시 눌러도 postReceipt가 중복 호출되지 않는다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);
  mockedPostReceipt.mockReturnValue(new Promise(() => {})); // 영원히 pending

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  await fireEvent.press(screen.getByTestId('category-food'));

  // postReceipt가 영원히 pending이라 await하면 act flush가 안 끝나서 타임아웃남.
  fireEvent.press(screen.getByText('저장하기'));
  await waitFor(() => {
    expect(screen.getByTestId('save-loading')).toBeTruthy();
  });
  // 로딩 중에 버튼이 disabled라 실제 onPress가 안 불리는지까지 확인.
  fireEvent.press(screen.getByTestId('save-button'));
  fireEvent.press(screen.getByTestId('save-button'));

  await waitFor(() => {
    expect(mockedPostReceipt).toHaveBeenCalledTimes(1);
  });
});

test('저장에 실패하면 에러 문구를 보여주고 다시 시도할 수 있다', async () => {
  mockedScanText.mockResolvedValue(RAW_TEXT_SUCCESS);
  mockedPostReceipt.mockRejectedValue(new Error('SAVE_ERROR'));

  await renderConfirmScreen();
  await waitFor(() => {
    expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
  });
  await fireEvent.press(screen.getByTestId('category-food'));

  await fireEvent.press(screen.getByText('저장하기'));

  await waitFor(() => {
    expect(
      screen.getByText('저장에 실패했어요. 다시 시도해주세요.'),
    ).toBeTruthy();
    expect(mockedRouter.dismissTo).not.toHaveBeenCalled();
    // 실패 후엔 다시 시도할 수 있게 버튼이 풀려있어야 함.
    expect(
      screen.getByTestId('save-button').props.accessibilityState.disabled,
    ).toBe(false);
  });
});

describe('수정 모드 (route.params.info가 있을 때)', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({
      info: JSON.stringify(EDIT_RECEIPT),
    });
  });

  test('스캔을 하지 않고 바로 폼에 기존 값이 채워져 있다', async () => {
    await renderConfirmScreen();

    await waitFor(() => {
      expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('12400')).toBeTruthy();
    expect(screen.getByText('2026년 8월 20일')).toBeTruthy();
    expect(
      screen.getByTestId('category-food').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(mockedScanText).not.toHaveBeenCalled();
  });

  test('기존 값에 품명이 있으면 폼에 채워져 있다', async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      info: JSON.stringify({ ...EDIT_RECEIPT, itemName: '아메리카노 Tall' }),
    });

    await renderConfirmScreen();

    await waitFor(() => {
      expect(screen.getByDisplayValue('아메리카노 Tall')).toBeTruthy();
    });
  });

  test('헤더가 "영수증 수정"이고, 촬영 관련 UI는 보이지 않는다', async () => {
    await renderConfirmScreen();

    await waitFor(() => {
      expect(screen.getByText('영수증 수정')).toBeTruthy();
    });
    expect(screen.queryByText('촬영한 영수증')).toBeNull();
    expect(screen.queryByText('다시 촬영')).toBeNull();
  });

  test('저장 버튼 문구가 "수정하기"이다', async () => {
    await renderConfirmScreen();

    await waitFor(() => {
      expect(screen.getByText('수정하기')).toBeTruthy();
    });
    expect(screen.queryByText('저장하기')).toBeNull();
  });

  test('수정하기를 누르면 patchReceipt를 호출하고, 성공하면 해당 영수증의 상세 쿼리를 무효화한 뒤 이전 화면으로 돌아간다', async () => {
    mockedPatchReceipt.mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await render(
      <QueryClientProvider client={queryClient}>
        <ConfirmScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('수정하기'));

    await waitFor(() => {
      expect(mockedPatchReceipt).toHaveBeenCalledWith('1', {
        merchant: '스타벅스 강남점',
        amount: 12400,
        category: 'food',
        date: '2026-08-20',
        rawText: RAW_TEXT_SUCCESS,
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: receiptQueryFactory.detail('1').queryKey,
        refetchType: 'all',
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
      // Confirm이 Detail 위에 push된 것뿐이라 한 번만 뒤로가면 정확히 그 Detail로
      // 돌아간다 — 생성 때와 달리 홈으로 더 이동할 필요 없음.
      expect(mockedRouter.back).toHaveBeenCalledTimes(1);
      expect(mockedRouter.dismissTo).not.toHaveBeenCalled();
    });
  });

  test('수정이 진행되는 동안 버튼이 비활성화되고 로딩 인디케이터를 보여준다', async () => {
    let resolvePatch: (value: unknown) => void = () => {};
    mockedPatchReceipt.mockReturnValue(
      new Promise(resolve => {
        resolvePatch = resolve;
      }),
    );

    await renderConfirmScreen();
    await waitFor(() => {
      expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('수정하기'));

    await waitFor(() => {
      expect(screen.queryByText('수정하기')).toBeNull();
      expect(screen.getByTestId('save-loading')).toBeTruthy();
      expect(
        screen.getByTestId('save-button').props.accessibilityState.disabled,
      ).toBe(true);
    });

    resolvePatch({});
    await waitFor(() => {
      expect(mockedRouter.back).toHaveBeenCalled();
    });
  });

  test('수정에 실패하면 에러 문구를 보여주고 다시 시도할 수 있다', async () => {
    mockedPatchReceipt.mockRejectedValue(new Error('EDIT_ERROR'));

    await renderConfirmScreen();
    await waitFor(() => {
      expect(screen.getByDisplayValue('스타벅스 강남점')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('수정하기'));

    await waitFor(() => {
      expect(
        screen.getByText('수정에 실패했어요. 다시 시도해주세요.'),
      ).toBeTruthy();
      expect(mockedRouter.back).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('save-button').props.accessibilityState.disabled,
      ).toBe(false);
    });
  });
});

describe('직접 기록 모드 (route.params에 imageUri/info가 둘 다 없을 때 — 하단 탭 "기록")', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({});
  });

  test('스캔하지 않고 바로 빈 폼을 보여준다', async () => {
    await renderConfirmScreen();

    // 스캔 로딩 화면(confirm-loading)을 절대 거치지 않고 바로 폼이 보인다.
    expect(screen.queryByTestId('confirm-loading')).toBeNull();
    expect(screen.getByTestId('merchant-input').props.value).toBe('');
    expect(screen.getByTestId('amount-input').props.value).toBe('');
    expect(screen.getByText('날짜를 선택해주세요')).toBeTruthy();
    expect(mockedScanText).not.toHaveBeenCalled();
  });

  test('헤더가 "영수증 기록"이고, 인식/촬영 관련 UI는 전혀 보이지 않는다', async () => {
    await renderConfirmScreen();

    expect(screen.getByText('영수증 기록')).toBeTruthy();
    expect(screen.queryByText('촬영한 영수증')).toBeNull();
    expect(screen.queryByText('다시 촬영')).toBeNull();
    expect(
      screen.queryByText(
        '자동 인식 결과는 부정확할 수 있습니다. 확인 후 저장해주세요.',
      ),
    ).toBeNull();
    expect(screen.queryByText('인식된 원문')).toBeNull();
    expect(screen.queryByText('텍스트를 인식하지 못했어요')).toBeNull();
  });

  test('저장 버튼 문구는 "저장하기"이고, 값을 채우고 누르면 postReceipt(생성)를 호출한다', async () => {
    mockedPostReceipt.mockResolvedValue({});
    await renderConfirmScreen();

    expect(screen.getByText('저장하기')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId('merchant-input'),
      '스타벅스 강남점',
    );
    await fireEvent.changeText(screen.getByTestId('amount-input'), '12400');
    await fireEvent.press(screen.getByTestId('date-input'));
    await fireEvent.changeText(
      screen.getByTestId('date-picker-native'),
      '2026-08-20T12:00:00',
    );
    await fireEvent.press(screen.getByText('확인'));
    await fireEvent.press(screen.getByTestId('category-food'));

    await waitFor(() => {
      expect(
        screen.getByTestId('save-button').props.accessibilityState.disabled,
      ).toBe(false);
    });
    await fireEvent.press(screen.getByText('저장하기'));

    await waitFor(() => {
      expect(mockedPostReceipt).toHaveBeenCalledWith(
        {
          merchant: '스타벅스 강남점',
          amount: 12400,
          category: 'food',
          date: '2026-08-20',
          rawText: undefined,
        },
        expect.anything(),
      );
      expect(mockedPatchReceipt).not.toHaveBeenCalled();
    });
  });
});
