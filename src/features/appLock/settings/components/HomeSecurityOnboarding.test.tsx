import { fireEvent, render, screen } from '@testing-library/react-native';

import useSecuritySetupStatus from '../hooks/useSecuritySetupStatus';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import HomeSecurityOnboarding from './HomeSecurityOnboarding';

jest.mock('../hooks/useSecuritySetupStatus');

jest.mock('./SecuritySetupSheet', () => {
  // jest.mock 팩토리는 호이스팅돼서 바깥(모듈 최상단) import를 참조할 수 없어 인라인
  // require가 불가피함(ScanScreen.test.tsx와 같은 패턴).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, TouchableOpacity } = require('react-native');
  return function MockSecuritySetupSheet({
    visible,
    onComplete,
  }: {
    visible: boolean;
    onComplete: () => void;
  }) {
    if (!visible) return null;
    return (
      <TouchableOpacity testID="mock-sheet-complete" onPress={onComplete}>
        <Text>mock sheet</Text>
      </TouchableOpacity>
    );
  };
});

const mockedUseSecuritySetupStatus = useSecuritySetupStatus as jest.Mock;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  useSecuritySettingsStore.setState({ onboardingDeclinedAt: null });
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: false,
    isLoading: false,
    refetch: jest.fn(),
  });
});

test('미설정 + 오늘 거절 기록 없음이면 안내 모달을 보여준다', async () => {
  await render(<HomeSecurityOnboarding />);

  expect(screen.getByText('영수증을 더 안전하게 보관해보세요')).toBeTruthy();
});

test('이미 설정된 상태면 안내 모달을 보여주지 않는다', async () => {
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: true,
    isLoading: false,
  });

  await render(<HomeSecurityOnboarding />);

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});

test('오늘 이미 거절했으면(24시간 이내) 안내 모달을 보여주지 않는다', async () => {
  useSecuritySettingsStore.setState({
    onboardingDeclinedAt: Date.now() - 60_000,
  });

  await render(<HomeSecurityOnboarding />);

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});

test('거절한 지 24시간이 지났으면 다시 안내 모달을 보여준다', async () => {
  useSecuritySettingsStore.setState({
    onboardingDeclinedAt: Date.now() - (ONE_DAY_MS + 60_000),
  });

  await render(<HomeSecurityOnboarding />);

  expect(screen.getByText('영수증을 더 안전하게 보관해보세요')).toBeTruthy();
});

test('"다음에 할게요"를 누르면 오늘 거절 기록이 남고 모달이 닫힌다', async () => {
  await render(<HomeSecurityOnboarding />);

  await fireEvent.press(screen.getByText('다음에 할게요'));

  expect(
    useSecuritySettingsStore.getState().onboardingDeclinedAt,
  ).not.toBeNull();
  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});

test('"네, 설정할게요"를 누르면 모달이 닫히고 SecuritySetupSheet가 열린다', async () => {
  await render(<HomeSecurityOnboarding />);

  await fireEvent.press(screen.getByText('네, 설정할게요'));

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
  expect(screen.getByText('mock sheet')).toBeTruthy();
});

// 실기기(시뮬레이터) 재현으로 확인한 버그: 이 컴포넌트의 useSecuritySetupStatus()는
// 마운트 시 한 번만 hasPinSet()을 조회해서 isSecuritySetUp을 계산한다. SecuritySetupSheet
// 안에서 PIN 전용(생체인증 미선택) 등록이 막 끝나도 이 컴포넌트는 재마운트되지 않으므로
// (같은 홈 화면 위의 오버레이일 뿐) isSecuritySetUp이 여전히 stale한 false로 남아서,
// 시트가 닫히자마자 온보딩 모달이 곧바로 다시 뜬다 — 방금 설정을 끝낸 사용자에게
// "다시 설정하라"는 모달이 즉시 재노출되는 버그. onComplete에서 refetch()도 같이
// 호출해야 이 stale 상태가 갱신된다.
test('SecuritySetupSheet에서 설정을 완료하면 isSecuritySetUp을 다시 조회한다(온보딩 모달 재노출 버그 방지)', async () => {
  const refetch = jest.fn();
  mockedUseSecuritySetupStatus.mockReturnValue({
    isSecuritySetUp: false,
    isLoading: false,
    refetch,
  });

  await render(<HomeSecurityOnboarding />);
  await fireEvent.press(screen.getByText('네, 설정할게요'));

  await fireEvent.press(screen.getByTestId('mock-sheet-complete'));

  expect(refetch).toHaveBeenCalled();
});
