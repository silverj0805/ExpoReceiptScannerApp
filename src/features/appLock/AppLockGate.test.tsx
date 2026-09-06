import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import useSessionTimeout from './hooks/useSessionTimeout';
import { useAppLockStore } from './stores/useAppLockStore';

import AppLockGate from './AppLockGate';

// BioAuthVerify 자체 동작(생체인증 시도, 에러 메시지 등)은 BioAuthVerify.test.tsx가
// 이미 다루므로, 여기서는 "게이트가 상태에 따라 BioAuthVerify를 보여주는지"만
// 확인하면 되도록 가벼운 스텁으로 대체한다(HomeSecurityOnboarding.test.tsx와 동일
// 패턴).
jest.mock('./bio/components/BioAuthVerify', () => {
  // jest.mock 팩토리는 호이스팅돼서 바깥(모듈 최상단) import를 참조할 수 없어 인라인
  // require가 불가피함.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: MockText } = require('react-native');
  return function MockBioAuthVerify() {
    return <MockText>mock bio auth verify</MockText>;
  };
});

// useSessionTimeout 자체 동작(AppState 감지, 5분 경과 판단 등)은
// useSessionTimeout.test.ts가 이미 다루므로, 여기서는 "게이트가 이 훅을
// 호출하는지"만 확인한다.
jest.mock('./hooks/useSessionTimeout');
const mockedUseSessionTimeout = useSessionTimeout as jest.Mock;

// FrozenScreen 자체 동작(카운트다운, 버튼 활성화 등)은 FrozenScreen.test.tsx가
// 이미 다루므로, 여기서도 같은 이유로 스텁으로 대체한다.
jest.mock('./components/frozenScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: MockText } = require('react-native');
  return function MockFrozenScreen() {
    return <MockText>mock frozen screen</MockText>;
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  useAppLockStore.setState({
    isLockSetUp: false,
    hasHydrated: true,
    authenticated: false,
    frozenUntil: null,
  });
});

test('마운트되면 useSessionTimeout을 호출한다', async () => {
  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(mockedUseSessionTimeout).toHaveBeenCalled();
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

test('잠금 상태면 자식 대신 BioAuthVerify를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.getByText('mock bio auth verify')).toBeTruthy();
});

test('얼어붙은 상태면 BioAuthVerify 대신 FrozenScreen을 보여준다', async () => {
  useAppLockStore.setState({
    isLockSetUp: true,
    frozenUntil: Date.now() + 10_000,
  });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.queryByText('mock bio auth verify')).toBeNull();
  expect(screen.getByText('mock frozen screen')).toBeTruthy();
});

// 실측으로 확인한 버그 재현: SecuritySection에서 잠금 토글을 켜면 isLockSetUp이
// 곧바로 true가 되는데, 이 게이트는 앱 루트에 항상 마운트돼 있어서 그 순간 즉시
// 리렌더된다. authenticated를 세션 로컬 useState로 뒀을 땐 이게 항상 false라
// 방금 토글을 켠 화면(설정 화면)째로 잠금 화면으로 바뀌어버렸다 — 이미 이
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
