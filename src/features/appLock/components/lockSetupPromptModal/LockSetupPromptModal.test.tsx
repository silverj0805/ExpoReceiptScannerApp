import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useIsFocused } from 'expo-router';

import { useAppLockStore } from '../../stores/useAppLockStore';

import LockSetupPromptModal from './index';

// expo-router의 router는 실제 네비게이션 컨테이너 없이 호출하면 동작하지 않으므로,
// SettingsScreen.test.tsx와 동일하게 router.push를 직접 모킹한다. useIsFocused도
// 실제 네비게이션 컨테이너 없인 동작하지 않아 함께 모킹 — 기본은 포커스된 것으로 취급.
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useIsFocused: jest.fn(() => true),
}));
const mockedRouter = router as unknown as { push: jest.Mock };
const mockedUseIsFocused = useIsFocused as jest.Mock;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseIsFocused.mockReturnValue(true);
  useAppLockStore.setState({
    hasHydrated: true,
    isLockSetUp: false,
    declinedAt: null,
  });
});

test('하이드레이션이 끝나기 전에는 아무것도 보여주지 않는다', async () => {
  useAppLockStore.setState({ hasHydrated: false });

  await render(<LockSetupPromptModal />);

  expect(screen.toJSON()).toBeNull();
});

test('무잠금 + 오늘 거절 기록 없음이면 안내 모달을 보여준다', async () => {
  await render(<LockSetupPromptModal />);

  expect(screen.getByText('영수증을 더 안전하게 보관해보세요')).toBeTruthy();
});

test('이미 잠금 설정된 상태면 안내 모달을 보여주지 않는다', async () => {
  useAppLockStore.setState({ isLockSetUp: true });

  await render(<LockSetupPromptModal />);

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});

test('오늘 이미 거절했으면(24시간 이내) 안내 모달을 보여주지 않는다', async () => {
  useAppLockStore.setState({ declinedAt: Date.now() - 60_000 });

  await render(<LockSetupPromptModal />);

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});

test('거절한 지 24시간이 지났으면 다시 안내 모달을 보여준다', async () => {
  useAppLockStore.setState({ declinedAt: Date.now() - (ONE_DAY_MS + 60_000) });

  await render(<LockSetupPromptModal />);

  expect(screen.getByText('영수증을 더 안전하게 보관해보세요')).toBeTruthy();
});

test('"다음에 할게요"를 누르면 오늘 거절 기록이 남는다', async () => {
  await render(<LockSetupPromptModal />);

  await fireEvent.press(screen.getByText('다음에 할게요'));

  expect(useAppLockStore.getState().declinedAt).not.toBeNull();
});

test('"네, 설정할게요"를 누르면 설정 화면으로 이동한다', async () => {
  await render(<LockSetupPromptModal />);

  await fireEvent.press(screen.getByText('네, 설정할게요'));

  expect(mockedRouter.push).toHaveBeenCalledWith('/settings');
});

// 홈은 바텀탭 화면이라 다른 탭으로 이동해도 언마운트되지 않는다 — 포커스 여부를
// 안 보면, 조건(무잠금+미거절)이 맞는 한 다른 탭 위에도 이 모달이 계속 떠 있게 된다.
test('무잠금 + 오늘 거절 기록 없음이어도 홈 탭에 포커스가 없으면 안내 모달을 보여주지 않는다', async () => {
  mockedUseIsFocused.mockReturnValue(false);

  await render(<LockSetupPromptModal />);

  expect(screen.queryByText('영수증을 더 안전하게 보관해보세요')).toBeNull();
});
