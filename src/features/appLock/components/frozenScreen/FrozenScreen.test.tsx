import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { useAppLockStore } from '../../stores/useAppLockStore';

import FrozenScreen from './index';

beforeEach(() => {
  jest.useFakeTimers();
  useAppLockStore.setState({ frozenUntil: Date.now() + 10_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

test('카운트다운 중엔 남은 시간을 mm:ss로 보여준다', async () => {
  await render(<FrozenScreen />);

  expect(screen.getByText('00:10')).toBeTruthy();
});

test('시간이 흐르면 남은 시간 표시가 줄어든다', async () => {
  await render(<FrozenScreen />);

  await act(async () => {
    jest.advanceTimersByTime(4_000);
  });

  expect(screen.getByText('00:06')).toBeTruthy();
});

test('카운트다운 중엔 "인증 다시 시도하기" 버튼이 비활성화돼 있다', async () => {
  await render(<FrozenScreen />);

  expect(
    screen.getByTestId('frozen-retry').props.accessibilityState.disabled,
  ).toBe(true);
});

test('버튼이 비활성화된 동안엔 눌러도 아무 일도 안 일어난다', async () => {
  await render(<FrozenScreen />);

  await fireEvent.press(screen.getByTestId('frozen-retry'));

  expect(useAppLockStore.getState().frozenUntil).not.toBeNull();
});

test('카운트다운이 끝나면 버튼이 활성화된다', async () => {
  await render(<FrozenScreen />);

  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });

  expect(
    screen.getByTestId('frozen-retry').props.accessibilityState.disabled,
  ).toBe(false);
});

test('카운트다운이 끝난 뒤 버튼을 누르면 얼어붙은 상태가 풀린다', async () => {
  await render(<FrozenScreen />);

  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });

  await fireEvent.press(screen.getByTestId('frozen-retry'));

  expect(useAppLockStore.getState().frozenUntil).toBeNull();
});
