import { fireEvent, render, screen } from '@testing-library/react-native';

import PinKeypad from './PinKeypad';

test('0~9 숫자 키가 전부 표시된다', async () => {
  await render(
    <PinKeypad onPressDigit={jest.fn()} onPressDelete={jest.fn()} />,
  );

  for (let digit = 0; digit <= 9; digit++) {
    expect(screen.getByTestId(`pin-key-${digit}`)).toBeTruthy();
  }
});

test('지우기 키가 표시된다', async () => {
  await render(
    <PinKeypad onPressDigit={jest.fn()} onPressDelete={jest.fn()} />,
  );

  expect(screen.getByTestId('pin-key-delete')).toBeTruthy();
});

test('숫자 키를 누르면 onPressDigit이 그 숫자와 함께 호출된다', async () => {
  const onPressDigit = jest.fn();
  await render(
    <PinKeypad onPressDigit={onPressDigit} onPressDelete={jest.fn()} />,
  );

  await fireEvent.press(screen.getByTestId('pin-key-7'));

  expect(onPressDigit).toHaveBeenCalledWith('7');
});

test('지우기 키를 누르면 onPressDelete가 호출된다', async () => {
  const onPressDelete = jest.fn();
  await render(
    <PinKeypad onPressDigit={jest.fn()} onPressDelete={onPressDelete} />,
  );

  await fireEvent.press(screen.getByTestId('pin-key-delete'));

  expect(onPressDelete).toHaveBeenCalled();
});

test('disabled면 숫자 키를 눌러도 onPressDigit이 호출되지 않는다', async () => {
  const onPressDigit = jest.fn();
  await render(
    <PinKeypad
      onPressDigit={onPressDigit}
      onPressDelete={jest.fn()}
      disabled
    />,
  );

  await fireEvent.press(screen.getByTestId('pin-key-1'));

  expect(onPressDigit).not.toHaveBeenCalled();
});

test('disabled면 지우기 키를 눌러도 onPressDelete가 호출되지 않는다', async () => {
  const onPressDelete = jest.fn();
  await render(
    <PinKeypad
      onPressDigit={jest.fn()}
      onPressDelete={onPressDelete}
      disabled
    />,
  );

  await fireEvent.press(screen.getByTestId('pin-key-delete'));

  expect(onPressDelete).not.toHaveBeenCalled();
});
