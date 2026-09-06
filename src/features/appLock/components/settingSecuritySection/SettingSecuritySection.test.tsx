import { fireEvent, render, screen } from '@testing-library/react-native';

import { useAppLockStore } from '../../stores/useAppLockStore';

import SettingSecuritySection from '.';

beforeEach(() => {
  useAppLockStore.setState({ isLockSetUp: false, authenticated: false });
});

test('무잠금 상태면 잠금 풀림 아이콘과 안내문구, OFF 토글을 보여준다', async () => {
  await render(<SettingSecuritySection />);

  expect(screen.getByText('앱 잠금 OFF')).toBeTruthy();
  expect(screen.getByText('생체인증으로 앱을 잠글 수 있어요')).toBeTruthy();
  expect(screen.getByTestId('security-section-toggle').props.value).toBe(false);
});

test('잠금 상태면 잠김 아이콘과 안내문구, ON 토글을 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true });

  await render(<SettingSecuritySection />);

  expect(screen.getByText('생체인증으로 잠겨 있어요')).toBeTruthy();
  expect(screen.getByTestId('security-section-toggle').props.value).toBe(true);
});

test('토글을 켜면 확인창 없이 바로 잠금 설정이 켜진다', async () => {
  await render(<SettingSecuritySection />);

  fireEvent(screen.getByTestId('security-section-toggle'), 'valueChange', true);

  expect(useAppLockStore.getState().isLockSetUp).toBe(true);
});

test('토글을 끄면 확인창 없이 바로 잠금 설정이 꺼진다', async () => {
  useAppLockStore.setState({ isLockSetUp: true });

  await render(<SettingSecuritySection />);

  fireEvent(
    screen.getByTestId('security-section-toggle'),
    'valueChange',
    false,
  );

  expect(useAppLockStore.getState().isLockSetUp).toBe(false);
});

// 방금 토글을 켠 사람은 이미 이 세션에서 앱을 쓰고 있던 사람이다 — 켜자마자
// AppLockGate(앱 루트에 항상 마운트돼 있음)에 다시 걸려 지금 보던 설정 화면이
// 잠금 화면으로 바뀌는 걸 막기 위해, 켜는 순간 이번 세션을 인증된 것으로 표시한다.
test('토글을 켜면 이번 세션이 이미 인증된 것으로 표시된다', async () => {
  await render(<SettingSecuritySection />);

  fireEvent(screen.getByTestId('security-section-toggle'), 'valueChange', true);

  expect(useAppLockStore.getState().authenticated).toBe(true);
});
