import { act, render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';

import { WISE_SAYINGS } from './constants';

import WiseSaying from './index';

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));
const mockedUseFocusEffect = useFocusEffect as jest.Mock;

afterEach(() => {
  jest.restoreAllMocks();
  // restoreAllMocks()는 jest.spyOn()으로 만든 스파이만 원상복구할 뿐, jest.fn()으로 만든
  // useFocusEffect 목의 mock.calls 기록은 안 비워서 다음 테스트로 그대로 새어나간다(실측으로
  // 확인 — 첫 테스트의 콜백을 다음 테스트에서 잘못 잡아 이미 언마운트된 인스턴스의 state를
  // 갱신하는 버그가 났었음). 명시적으로 비워서 테스트 간 격리.
  mockedUseFocusEffect.mockClear();
});

// 컴포넌트가 💡"{saying}" 형태로 이모지/따옴표까지 같은 Text에 붙여서 렌더링하므로
// getByText의 기본 정확 일치로는 못 찾는다 — exact: false(부분 일치)로 찾는다.
// index도 하드코딩하면 WISE_SAYINGS 배열 길이가 바뀔 때마다 다시 깨지므로, 컴포넌트와
// 동일한 공식(Math.floor(random * length))으로 매번 계산한다.
const randomIndexFor = (random: number) =>
  Math.floor(random * WISE_SAYINGS.length);

// expo-router는 실제 라우터 마운트 없이 useFocusEffect를 그대로 호출하면 동작하지
// 않으므로(react-navigation 컨텍스트 필요), CLI처럼 NavigationContainer로 실제 포커스/블러를
// 재현하는 대신 useFocusEffect 자체를 목으로 대체하고, 컴포넌트가 넘긴 콜백을 직접
// 꺼내서 호출하는 방식으로 "포커스됨"을 흉내낸다.
const getFocusCallback = () => {
  const calls = mockedUseFocusEffect.mock.calls;
  return calls[calls.length - 1][0];
};

test('홈이 포커스되면 목록 중 하나의 명언을 보여준다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  await render(<WiseSaying />);

  // 동기 act(() => ...)로는 이 프로젝트의 React 19 설정에서 setIndex 갱신이 화면에
  // 반영되기 전에 act()가 끝나버려(실측으로 확인) 다음 단언이 이전 렌더 결과를 봄 —
  // await act(async () => ...)로 감싸야 실제로 반영된 뒤 단언할 수 있다.
  await act(async () => {
    getFocusCallback()();
  });

  expect(
    screen.getByText(WISE_SAYINGS[randomIndexFor(0.5)], { exact: false }),
  ).toBeTruthy();
});

test('홈이 다시 포커스되면 새 인덱스의 명언을 보여준다', async () => {
  const random = jest.spyOn(Math, 'random');
  random.mockReturnValue(0);
  await render(<WiseSaying />);

  await act(async () => {
    getFocusCallback()();
  });
  expect(
    screen.getByText(WISE_SAYINGS[randomIndexFor(0)], { exact: false }),
  ).toBeTruthy();

  random.mockReturnValue(0.5);
  await act(async () => {
    getFocusCallback()();
  });

  expect(
    screen.getByText(WISE_SAYINGS[randomIndexFor(0.5)], { exact: false }),
  ).toBeTruthy();
});
