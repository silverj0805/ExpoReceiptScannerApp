import { render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Platform, Text } from 'react-native';

import PrivacyScreenCover from './index';

// AppState.addEventListener를 spy로 가로채서, 실제 OS 이벤트 없이도 리스너를
// 직접 호출해 상태 전환('active' -> 'background' 등)을 시뮬레이션한다.
function emitAppStateChange(nextState: string) {
  const addEventListenerMock = AppState.addEventListener as jest.Mock;
  const [, listener] = addEventListenerMock.mock.calls[
    addEventListenerMock.mock.calls.length - 1
  ] as [string, (state: string) => void];
  listener(nextState);
}

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener');
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    configurable: true,
  });
});

test('active 상태에서는 커버를 씌우지 않고 children을 그대로 보여준다', async () => {
  await render(
    <PrivacyScreenCover>
      <Text>영수증 목록</Text>
    </PrivacyScreenCover>,
  );

  expect(screen.getByText('영수증 목록')).toBeTruthy();
  expect(screen.queryByTestId('privacy-screen-cover')).toBeNull();
});

test('background로 전환되면 커버로 화면을 가린다', async () => {
  await render(
    <PrivacyScreenCover>
      <Text>영수증 목록</Text>
    </PrivacyScreenCover>,
  );

  emitAppStateChange('background');

  await waitFor(() => {
    expect(screen.getByTestId('privacy-screen-cover')).toBeTruthy();
  });
});

test('inactive로 전환되어도 커버로 화면을 가린다 (iOS는 inactive 시점에 스냅샷을 찍음)', async () => {
  await render(
    <PrivacyScreenCover>
      <Text>영수증 목록</Text>
    </PrivacyScreenCover>,
  );

  emitAppStateChange('inactive');

  await waitFor(() => {
    expect(screen.getByTestId('privacy-screen-cover')).toBeTruthy();
  });
});

test('background에서 다시 active로 돌아오면 커버를 없앤다', async () => {
  await render(
    <PrivacyScreenCover>
      <Text>영수증 목록</Text>
    </PrivacyScreenCover>,
  );

  emitAppStateChange('background');
  await waitFor(() => {
    expect(screen.getByTestId('privacy-screen-cover')).toBeTruthy();
  });

  emitAppStateChange('active');
  await waitFor(() => {
    expect(screen.queryByTestId('privacy-screen-cover')).toBeNull();
  });
});

// 안드로이드는 스위처 썸네일 방지를 네이티브(MainActivity의
// setRecentsScreenshotEnabled)에서 처리한다 — JS 커버까지 덮으면 화면이 이중으로
// 가려지고, 애초에 AppState 타이밍이 안 맞아 효과도 없다(구 CLI 버전에서 실측 확인).
test('안드로이드에서는 background로 전환돼도 JS 커버를 씌우지 않는다', async () => {
  const originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });

  await render(
    <PrivacyScreenCover>
      <Text>영수증 목록</Text>
    </PrivacyScreenCover>,
  );

  emitAppStateChange('background');

  expect(screen.getByText('영수증 목록')).toBeTruthy();
  expect(screen.queryByTestId('privacy-screen-cover')).toBeNull();

  Object.defineProperty(Platform, 'OS', {
    value: originalOS,
    configurable: true,
  });
});
