import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAppLockStore } from '../../stores/useAppLockStore';

import SettingSecuritySection from '.';

// SecuritySetupSheet 자체 동작(토글, 방법 선택, 인증 초기화 등)은
// SecuritySetupSheet.test.tsx가 이미 다루므로, 여기서는 "버튼을 누르면 시트가
// 열리는지"만 확인하면 되도록 가벼운 스텁으로 대체한다(AppLockGate.test.tsx와
// 동일 패턴).
jest.mock('../securitySetupSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: MockText, TouchableOpacity } = require('react-native');
  return function MockSecuritySetupSheet({
    visible,
    onClose,
  }: {
    visible: boolean;
    onClose: () => void;
  }) {
    if (!visible) return null;
    return (
      <>
        <MockText>mock security setup sheet</MockText>
        <TouchableOpacity testID="mock-sheet-close" onPress={onClose}>
          <MockText>close</MockText>
        </TouchableOpacity>
      </>
    );
  };
});

beforeEach(() => {
  useAppLockStore.setState({ isLockSetUp: false, lockType: null });
});

test('무잠금 상태면 잠금 풀림 아이콘과 안내문구, "설정하기" 버튼을 보여준다', async () => {
  await render(<SettingSecuritySection />);

  expect(screen.getByText('앱 잠금 OFF')).toBeTruthy();
  expect(
    screen.getByText('PIN 또는 생체인증으로 앱을 잠글 수 있어요'),
  ).toBeTruthy();
  expect(screen.getByText('설정하기')).toBeTruthy();
});

test('잠금 상태(생체인증)면 잠김 아이콘과 안내문구, "변경하기" 버튼을 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });

  await render(<SettingSecuritySection />);

  expect(screen.getByText('생체인증으로 잠겨 있어요')).toBeTruthy();
  expect(screen.getByText('변경하기')).toBeTruthy();
});

test('잠금 상태(PIN)면 PIN 안내문구를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'pin' });

  await render(<SettingSecuritySection />);

  expect(screen.getByText('PIN 번호로 잠겨 있어요')).toBeTruthy();
});

test('버튼을 누르면 SecuritySetupSheet가 열린다', async () => {
  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('security-section-open-sheet'));

  expect(screen.getByText('mock security setup sheet')).toBeTruthy();
});

test('시트의 onClose가 불리면 다시 닫힌다', async () => {
  await render(<SettingSecuritySection />);

  await fireEvent.press(screen.getByTestId('security-section-open-sheet'));
  expect(screen.getByText('mock security setup sheet')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('mock-sheet-close'));

  expect(screen.queryByText('mock security setup sheet')).toBeNull();
});
