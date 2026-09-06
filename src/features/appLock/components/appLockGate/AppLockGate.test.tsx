import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAppLock } from '../../hooks/useAppLock';

import AppLockGate from './index';

beforeEach(() => {
  useAppLock.setState({
    isLockSetUp: false,
    hasHydrated: true,
    auth: jest.fn().mockResolvedValue(true),
  });
});

test('하이드레이션이 끝나기 전에는 아무것도 보여주지 않는다', async () => {
  useAppLock.setState({ hasHydrated: false });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.toJSON()).toBeNull();
});

test('무잠금 상태면 자식을 그대로 보여준다', async () => {
  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.getByText('메인 화면')).toBeTruthy();
});

test('잠금 상태면 자식 대신 플레이스홀더 화면을 보여준다', async () => {
  useAppLock.setState({ isLockSetUp: true });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.getByTestId('app-lock-authenticate')).toBeTruthy();
});

test('잠금 상태에서 인증하기를 누르고 auth()가 성공하면 자식을 보여준다', async () => {
  const auth = jest.fn().mockResolvedValue(true);
  useAppLock.setState({ isLockSetUp: true, auth });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  await fireEvent.press(screen.getByTestId('app-lock-authenticate'));

  expect(auth).toHaveBeenCalled();
  expect(await screen.findByText('메인 화면')).toBeTruthy();
});

test('인증하기를 눌러도 auth()가 실패하면 계속 잠긴 채로 남는다', async () => {
  const auth = jest.fn().mockResolvedValue(false);
  useAppLock.setState({ isLockSetUp: true, auth });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  await fireEvent.press(screen.getByTestId('app-lock-authenticate'));

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.getByTestId('app-lock-authenticate')).toBeTruthy();
});
