import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import useBioAuth from '../../bio/hooks/useBioAuth';
import { useAppLockStore } from '../../stores/useAppLockStore';

import SecuritySetupSheet from '.';

// BottomSheetModal은 BottomSheetModalProvider(루트 레이아웃에 실제로 붙어 있음) 컨텍스트가
// 없으면 렌더링 시 바로 던진다 — 실제 앱과 동일하게 감싸서 렌더링한다.
function renderSheet(props: { visible: boolean; onClose: () => void }) {
  return render(
    <BottomSheetModalProvider>
      <SecuritySetupSheet {...props} />
    </BottomSheetModalProvider>,
  );
}

jest.mock('../../bio/hooks/useBioAuth');
const mockedUseBioAuth = useBioAuth as jest.Mock;

// PIN 저장/조회 자체(SecureStore 연동)는 pin/utils/index.test.ts가 이미 다루므로,
// 여기서는 "이 시트가 언제 그 함수들을 부르는지"만 확인하면 되도록 모킹으로 대체한다.
// pinRegisterModal도 같은 모듈(pin/utils)에서 savePin을 가져다 쓰므로 이 모킹 하나로
// 둘 다 커버된다(Jest는 실제 파일 경로 기준으로 모킹하지, import 시 쓴 상대경로
// 문자열 기준이 아니다).
jest.mock('../../pin/utils', () => ({
  ...jest.requireActual('../../pin/utils'),
  hasPinSet: jest.fn(),
  savePin: jest.fn(),
  clearPin: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinUtils = require('../../pin/utils');
const mockedHasPinSet = pinUtils.hasPinSet as jest.Mock;
const mockedSavePin = pinUtils.savePin as jest.Mock;
const mockedClearPin = pinUtils.clearPin as jest.Mock;

// 실제 Alert을 띄우면 Jest에서 못 다루니 스파이로 대체.
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const mockedAlert = Alert.alert as jest.Mock;

const pressConfirmAlertButton = async () => {
  const buttons = mockedAlert.mock.calls[mockedAlert.mock.calls.length - 1][2];
  const destructive = buttons.find(
    (button: { style?: string }) => button.style === 'destructive',
  );
  await act(async () => {
    destructive.onPress();
  });
};

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedHasPinSet.mockResolvedValue(false);
  mockedSavePin.mockResolvedValue(undefined);
  mockedClearPin.mockResolvedValue(undefined);
  mockedUseBioAuth.mockReturnValue({
    isReady: true,
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
  });
  useAppLockStore.setState({
    isLockSetUp: false,
    lockType: null,
    authenticated: false,
  });
});

test('토글이 꺼져있으면 방법 선택과 인증 초기화가 비활성화된다', async () => {
  await renderSheet({ visible: true, onClose: jest.fn() });

  expect(
    screen.getByTestId('choose-biometric').props.accessibilityState.disabled,
  ).toBe(true);
  expect(
    screen.getByTestId('choose-pin').props.accessibilityState.disabled,
  ).toBe(true);
  expect(
    screen.getByTestId('security-reset').props.accessibilityState.disabled,
  ).toBe(true);
});

// PIN이 실제로 저장되기 전에 isLockSetUp이 먼저 persist되면, PIN 등록 도중
// 앱이 강제 종료됐을 때 재실행 시 "잠금은 켜져 있는데 PIN은 없는" 상태가 돼
// 사용자가 영영 못 들어갈 수 있다 — 그래서 PIN이 이미 있을 때만 토글 즉시 잠금이 활성화되고,
// 없으면 등록을 마쳐야만 활성화되게 한다.
test('PIN이 이미 있으면 토글을 켜자마자 잠금이 활성화된다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });

  expect(useAppLockStore.getState().isLockSetUp).toBe(true);
});

test('PIN이 이미 있으면 토글을 켜자마자 이번 세션이 인증된 것으로 표시된다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });

  expect(useAppLockStore.getState().authenticated).toBe(true);
});

test('PIN이 없으면 토글을 켜도 PIN 등록을 마치기 전까지 잠금이 활성화되지 않는다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });
  await screen.findByText('PIN 번호를 설정해주세요');

  expect(useAppLockStore.getState().isLockSetUp).toBe(false);
});

test('PIN이 없는 상태에서 토글을 켜고 등록을 마치면 그제서야 잠금과 인증이 활성화된다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });
  await screen.findByText('PIN 번호를 설정해주세요');

  await pressDigits('1234');
  await pressDigits('1234');

  expect(useAppLockStore.getState().isLockSetUp).toBe(true);
  expect(useAppLockStore.getState().authenticated).toBe(true);
});

test('PIN이 없는 상태에서 토글을 켜면 PIN 등록 화면이 뜬다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await fireEvent(
    screen.getByTestId('security-sheet-toggle'),
    'valueChange',
    true,
  );

  expect(await screen.findByText('PIN 번호를 설정해주세요')).toBeTruthy();
});

test('이미 PIN이 있는 상태에서 토글을 켜면 PIN 등록 화면이 뜨지 않는다', async () => {
  mockedHasPinSet.mockResolvedValue(true);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });

  expect(screen.queryByText('PIN 번호를 설정해주세요')).toBeNull();
});

test('생체인증 지원 기기에서 토글을 켜면 lockType이 bio가 된다', async () => {
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });

  expect(useAppLockStore.getState().lockType).toBe('bio');
});

test('생체인증 미지원 기기에서 토글을 켜면 lockType이 pin이 된다', async () => {
  mockedUseBioAuth.mockReturnValue({
    isReady: true,
    isSupported: false,
    isEnrolled: false,
    authenticate: jest.fn(),
  });
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });

  expect(useAppLockStore.getState().lockType).toBe('pin');
});

test('생체인증 미지원 기기면 생체인증 선택지를 보여주지 않는다', async () => {
  mockedUseBioAuth.mockReturnValue({
    isReady: true,
    isSupported: false,
    isEnrolled: false,
    authenticate: jest.fn(),
  });

  await renderSheet({ visible: true, onClose: jest.fn() });

  expect(screen.queryByTestId('choose-biometric')).toBeNull();
});

test('생체인증으로 설정을 누르면 lockType이 bio로 바뀐다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'pin' });
  mockedHasPinSet.mockResolvedValue(true);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent.press(screen.getByTestId('choose-biometric'));
  });

  expect(useAppLockStore.getState().lockType).toBe('bio');
});

test('PIN 번호로 할래요를 누르면 lockType이 pin으로 바뀐다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });
  mockedHasPinSet.mockResolvedValue(true);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent.press(screen.getByTestId('choose-pin'));
  });

  expect(useAppLockStore.getState().lockType).toBe('pin');
});

test('현재 선택된 방법에 "현재 사용 중" 문구를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });

  await renderSheet({ visible: true, onClose: jest.fn() });

  expect(screen.getByText('현재 사용 중인 방법이에요')).toBeTruthy();
});

test('인증 초기화를 누르면 확인 Alert을 띄운다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });
  await renderSheet({ visible: true, onClose: jest.fn() });

  await fireEvent.press(screen.getByTestId('security-reset'));

  expect(mockedAlert).toHaveBeenCalled();
});

test('인증 초기화를 확인하면 PIN을 지우고 lockType/잠금을 초기화한다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });
  await renderSheet({ visible: true, onClose: jest.fn() });

  await fireEvent.press(screen.getByTestId('security-reset'));
  await pressConfirmAlertButton();

  expect(mockedClearPin).toHaveBeenCalled();
  expect(useAppLockStore.getState().lockType).toBeNull();
  expect(useAppLockStore.getState().isLockSetUp).toBe(false);
});

test('인증 초기화를 취소하면 아무것도 바뀌지 않는다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });
  await renderSheet({ visible: true, onClose: jest.fn() });

  await fireEvent.press(screen.getByTestId('security-reset'));

  expect(mockedClearPin).not.toHaveBeenCalled();
  expect(useAppLockStore.getState().lockType).toBe('bio');
});

test('PIN 등록을 완료하면 savePin이 호출되고 등록 화면이 닫힌다', async () => {
  mockedHasPinSet.mockResolvedValue(false);
  await renderSheet({ visible: true, onClose: jest.fn() });

  await act(async () => {
    fireEvent(screen.getByTestId('security-sheet-toggle'), 'valueChange', true);
  });
  await screen.findByText('PIN 번호를 설정해주세요');

  await pressDigits('1234');
  await pressDigits('1234');

  expect(mockedSavePin).toHaveBeenCalledWith('1234');
  expect(screen.queryByText('PIN 번호를 설정해주세요')).toBeNull();
  expect(useAppLockStore.getState().isLockSetUp).toBe(true);
});

test('닫기 버튼을 누르면 onClose를 호출한다', async () => {
  const onClose = jest.fn();
  await renderSheet({ visible: true, onClose });

  await fireEvent.press(screen.getByTestId('security-sheet-close-button'));

  expect(onClose).toHaveBeenCalled();
});
