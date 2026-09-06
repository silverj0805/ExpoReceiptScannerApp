import { render, screen } from '@testing-library/react-native';

import { PIN_LENGTH } from '../utils';

import PinDots from './PinDots';

test(`항상 PIN_LENGTH(${PIN_LENGTH})개의 점을 그린다`, async () => {
  await render(<PinDots length={0} />);

  expect(screen.getAllByTestId(/^pin-dot-/)).toHaveLength(PIN_LENGTH);
});

test('length가 0이면 점이 하나도 채워지지 않는다', async () => {
  await render(<PinDots length={0} />);

  for (let index = 0; index < PIN_LENGTH; index++) {
    expect(
      screen.getByTestId(`pin-dot-${index}`).props.accessibilityState?.selected,
    ).toBe(false);
  }
});

test('length가 2면 앞 2개만 채워진 상태로 표시된다', async () => {
  await render(<PinDots length={2} />);

  expect(
    screen.getByTestId('pin-dot-0').props.accessibilityState?.selected,
  ).toBe(true);
  expect(
    screen.getByTestId('pin-dot-1').props.accessibilityState?.selected,
  ).toBe(true);
  expect(
    screen.getByTestId('pin-dot-2').props.accessibilityState?.selected,
  ).toBe(false);
});

test(`length가 PIN_LENGTH(${PIN_LENGTH})와 같으면 전부 채워진다`, async () => {
  await render(<PinDots length={PIN_LENGTH} />);

  for (let index = 0; index < PIN_LENGTH; index++) {
    expect(
      screen.getByTestId(`pin-dot-${index}`).props.accessibilityState?.selected,
    ).toBe(true);
  }
});
