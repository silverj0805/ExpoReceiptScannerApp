import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { fireEvent, render, screen } from '@testing-library/react-native';

import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import { savePin } from '../../pin/utils/pinStorage';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import SecuritySetupSheet from './SecuritySetupSheet';

// BottomSheetModal은 BottomSheetModalProvider(루트 레이아웃에 실제로 붙어 있음) 컨텍스트가
// 없으면 렌더링 시 바로 던진다 — 실제 앱과 동일하게 감싸서 렌더링한다.
function renderSheet(props: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  return render(
    <BottomSheetModalProvider>
      <SecuritySetupSheet {...props} />
    </BottomSheetModalProvider>,
  );
}

jest.mock('../../biometric/hooks/useBiometricAuth');
jest.mock('../../pin/utils/pinStorage', () => ({
  savePin: jest.fn(),
}));

const mockedUseBiometricAuth = useBiometricAuth as jest.Mock;
const mockedSavePin = savePin as jest.Mock;

async function pressDigits(digits: string) {
  for (const digit of digits) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSavePin.mockResolvedValue(undefined);
  useSecuritySettingsStore.setState({ biometricEnabled: false });
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: true,
    isEnrolled: true,
    authenticate: jest.fn(),
  });
});

test('생체인증을 지원+등록한 기기면 방법 선택 화면을 보여준다', async () => {
  await renderSheet({
    visible: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  });

  expect(screen.getByText('어떤 방법으로 잠글까요?')).toBeTruthy();
  expect(screen.getByText('생체인증으로 설정')).toBeTruthy();
  expect(screen.getByText('PIN 번호로 할래요')).toBeTruthy();
});

test('생체인증 미지원/미등록이면 선택 화면 없이 바로 PIN 등록 폼을 보여준다', async () => {
  mockedUseBiometricAuth.mockReturnValue({
    isSupported: false,
    isEnrolled: false,
    authenticate: jest.fn(),
  });

  await renderSheet({
    visible: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  });

  expect(screen.queryByText('생체인증으로 설정')).toBeNull();
  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
});

test('생체인증으로 설정을 선택해도 PIN 등록 폼이 강제로 뜬다', async () => {
  await renderSheet({
    visible: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  });

  await fireEvent.press(screen.getByText('생체인증으로 설정'));

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
  expect(useSecuritySettingsStore.getState().biometricEnabled).toBe(true);
  expect(
    screen.getByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeTruthy();
});

test('PIN 번호로 할래요를 선택하면 안내 문구 없이 PIN 등록 폼이 뜬다', async () => {
  await renderSheet({
    visible: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  });

  await fireEvent.press(screen.getByText('PIN 번호로 할래요'));

  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();
  expect(
    screen.queryByText(
      'Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요',
    ),
  ).toBeNull();
});

test('PIN 등록을 완료하면 onComplete를 호출한다', async () => {
  const onComplete = jest.fn();
  await renderSheet({ visible: true, onClose: jest.fn(), onComplete });

  await fireEvent.press(screen.getByText('PIN 번호로 할래요'));
  await pressDigits('1234');
  await pressDigits('1234');
  await new Promise(process.nextTick);

  expect(onComplete).toHaveBeenCalled();
});

test('닫기 버튼을 누르면 onClose를 호출한다', async () => {
  const onClose = jest.fn();
  await renderSheet({ visible: true, onClose, onComplete: jest.fn() });

  await fireEvent.press(screen.getByTestId('security-sheet-close-button'));

  expect(onClose).toHaveBeenCalled();
});

test('PIN 등록 화면으로 넘어간 뒤 닫기를 누르면 선택 화면 상태로 초기화된다', async () => {
  await renderSheet({
    visible: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  });

  await fireEvent.press(screen.getByText('PIN 번호로 할래요'));
  expect(screen.getByText('PIN 번호를 설정해주세요')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('security-sheet-close-button'));

  expect(screen.getByText('어떤 방법으로 잠글까요?')).toBeTruthy();
});

// "visible이 false면 아무것도 렌더링하지 않는다" 테스트는 BottomSheetModal 전환과 함께 제거했다.
// BottomSheet일 땐 우리 코드가 직접 `if (!visible) return null`로 껐지만, BottomSheetModal은
// present()/dismiss() 호출로 열고 닫는 게 정상 사용법이라 그 로직을 제거했고, 이제
// "visible=false → 안 보임"은 우리 코드가 아니라 라이브러리의 내부 mount 상태(실제 소스로
// 확인함: BottomSheetModal.tsx가 `return mount ? <Portal>... : null`로 처리)가 책임진다.
// __mocks__/@gorhom/bottom-sheet.tsx가 쓰는 공식 mock.js의 BottomSheetModal은 테스트 편의상
// present/dismiss와 무관하게 항상 children을 그대로 렌더링하는 단순화된 구현이라(mock.js
// 자체를 읽어 확인함) 이 mount 게이팅을 mock으로는 재현할 수 없다 — 실기기(시뮬레이터)로
// 별도 확인함.
