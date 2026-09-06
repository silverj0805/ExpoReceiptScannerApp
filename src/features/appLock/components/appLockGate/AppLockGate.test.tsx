import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAppLockStore } from '../../stores/useAppLockStore';

import AppLockGate from './index';

beforeEach(() => {
  useAppLockStore.setState({
    isLockSetUp: false,
    hasHydrated: true,
    authenticated: false,
    auth: jest.fn().mockResolvedValue(true),
  });
});

test('하이드레이션이 끝나기 전에는 아무것도 보여주지 않는다', async () => {
  useAppLockStore.setState({ hasHydrated: false });

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
  useAppLockStore.setState({ isLockSetUp: true });

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
  useAppLockStore.setState({ isLockSetUp: true, auth });

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
  useAppLockStore.setState({ isLockSetUp: true, auth });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  await fireEvent.press(screen.getByTestId('app-lock-authenticate'));

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.getByTestId('app-lock-authenticate')).toBeTruthy();
});

// 실측으로 확인한 버그 재현: SecuritySection에서 잠금 토글을 켜면 isLockSetUp이
// 곧바로 true가 되는데, 이 게이트는 앱 루트에 항상 마운트돼 있어서 그 순간 즉시
// 리렌더된다. authenticated를 세션 로컬 useState로 뒀을 땐 이게 항상 false라
// 방금 토글을 켠 화면(설정 화면)째로 잠금 플레이스홀더로 바뀌어버렸다 — 이미 이
// 세션에서 앱을 쓰고 있던 사람인데도 즉시 잠기는 게 문제였다. authenticated가
// true인 상태에서 isLockSetUp만 나중에 true가 되는 경우엔 계속 자식을 보여줘야 한다.
test('이미 인증된 세션에서는 잠금을 켜도 곧바로 잠기지 않는다', async () => {
  useAppLockStore.setState({ isLockSetUp: false, authenticated: true });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  act(() => {
    useAppLockStore.setState({ isLockSetUp: true });
  });

  expect(screen.getByText('메인 화면')).toBeTruthy();
});
