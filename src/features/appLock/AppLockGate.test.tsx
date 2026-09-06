import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
  const { Text: MockText, TouchableOpacity } = require('react-native');
  // 실제 컴포넌트는 PIN이 등록돼 있을 때만 버튼을 보여주지만, 여기서는 게이트가
  // onUsePinInstead를 받아 PinVerify로 전환하는지만 보면 되므로 항상 눌러볼 수
  // 있게 렌더한다(그 조건부 노출 자체는 BioAuthVerify.test.tsx가 다룸).
  return function MockBioAuthVerify({
    onUsePinInstead,
  }: {
    onUsePinInstead?: () => void;
  }) {
    return (
      <>
        <MockText>mock bio auth verify</MockText>
        {onUsePinInstead && (
          <TouchableOpacity
            testID="mock-use-pin-instead"
            onPress={onUsePinInstead}
          >
            <MockText>mock use pin instead</MockText>
          </TouchableOpacity>
        )}
      </>
    );
  };
});

// PinVerify 자체 동작(PIN 검증, 시도 횟수 등)은 PinVerify.test.tsx가 이미 다루므로,
// 여기서도 같은 이유로 스텁으로 대체한다.
jest.mock('./pin/components/pinVerify', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: MockText } = require('react-native');
  return function MockPinVerify() {
    return <MockText>mock pin verify</MockText>;
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
    lockType: null,
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

test('잠금 상태 + lockType이 bio면 BioAuthVerify를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.getByText('mock bio auth verify')).toBeTruthy();
});

// lockType이 null인 건 이 기능이 생기기 전부터 생체인증으로 잠금을 설정해둔
// 사용자거나, 아직 방법을 명시적으로 고르지 않은 상태다 — 이 경우 기존 동작
// (생체인증)을 그대로 유지해야 하므로 BioAuthVerify로 기본 분기한다.
test('잠금 상태 + lockType이 null이면(기존 사용자) 기본값으로 BioAuthVerify를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: null });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.getByText('mock bio auth verify')).toBeTruthy();
});

test('잠금 상태 + lockType이 pin이면 PinVerify를 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'pin' });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('메인 화면')).toBeNull();
  expect(screen.queryByText('mock bio auth verify')).toBeNull();
  expect(screen.getByText('mock pin verify')).toBeTruthy();
});

test('얼어붙은 상태면 BioAuthVerify 대신 FrozenScreen을 보여준다', async () => {
  useAppLockStore.setState({
    isLockSetUp: true,
    lockType: 'bio',
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

// frozenUntil이 lockType보다 먼저 확인돼야 한다 — PIN을 5번 틀려 얼어붙은
// 상태에서도(lockType: 'pin') PinVerify로 재시도를 계속 받아주면 안 되고
// FrozenScreen이 완전히 가려야 한다.
test('얼어붙은 상태면 lockType이 pin이어도 PinVerify 대신 FrozenScreen을 보여준다', async () => {
  useAppLockStore.setState({
    isLockSetUp: true,
    lockType: 'pin',
    frozenUntil: Date.now() + 10_000,
  });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  expect(screen.queryByText('mock pin verify')).toBeNull();
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

  // 동기 act(() => {...})만 쓰면 이 렌더가 만든 패시브 이펙트(예: usePinInstead
  // 리셋 이펙트)가 이 act 경계 안에서 다 플러시된다는 보장이 없어("You called
  // act(async () => ...) without await" 경고와 함께) 다음 테스트로 상태가 샐 수
  // 있다(실측: 이 테스트 바로 뒤에 오는 테스트가 렌더링에 실패하는 걸로 확인) —
  // async act로 감싸고 await해서 이 테스트 안에서 확실히 다 정리되게 한다.
  await act(async () => {
    useAppLockStore.setState({ isLockSetUp: true });
  });

  expect(screen.getByText('메인 화면')).toBeTruthy();
});

// 생체인증을 골랐어도 PIN은 대체 수단으로 등록되므로, Face ID가 계속 실패할
// 때(마스크·젖은 손 등) PIN 화면으로 전환할 수 있어야 한다.
test('BioAuthVerify에서 "PIN으로 입력"을 누르면 PinVerify로 전환된다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  await fireEvent.press(screen.getByTestId('mock-use-pin-instead'));

  expect(screen.getByText('mock pin verify')).toBeTruthy();
  expect(screen.queryByText('mock bio auth verify')).toBeNull();
});

// usePinInstead는 세션 로컬 전환일 뿐이라, 인증에 성공해 잠금이 풀리고 나면
// 다음번에 다시 잠길 때는 원래 방식(생체인증)부터 보여줘야 한다 — 한 번 PIN으로
// 전환했다고 그 상태가 영구히 남아있으면 안 된다.
test('PIN으로 전환한 뒤 인증에 성공하면, 다음 잠금 때는 다시 BioAuthVerify부터 보여준다', async () => {
  useAppLockStore.setState({ isLockSetUp: true, lockType: 'bio' });

  await render(
    <AppLockGate>
      <Text>메인 화면</Text>
    </AppLockGate>,
  );

  await fireEvent.press(screen.getByTestId('mock-use-pin-instead'));
  expect(screen.getByText('mock pin verify')).toBeTruthy();

  // 동기 act(() => {...})만 쓰면(테스트9와 같은 이유로) 패시브 이펙트가 이
  // act 경계 안에서 확실히 플러시된다는 보장이 없다 — async act로 감싸고 await한다.
  await act(async () => {
    useAppLockStore.setState({ authenticated: true });
  });
  expect(screen.getByText('메인 화면')).toBeTruthy();

  await act(async () => {
    useAppLockStore.setState({ authenticated: false });
  });
  expect(screen.getByText('mock bio auth verify')).toBeTruthy();
});
