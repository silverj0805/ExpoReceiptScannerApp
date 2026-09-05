import { fireEvent, render, screen } from '@testing-library/react-native';

import DatePickerModal from './DatePickerModal';

const today = new Date('2026-09-01T12:00:00');
const pickerValue = new Date('2026-08-20T12:00:00');

const mockOnDismiss = jest.fn();
const mockOnConfirm = jest.fn();
const mockOnValueChange = jest.fn();

function renderModal(visible = true) {
  return render(
    <DatePickerModal
      visible={visible}
      value={pickerValue}
      maximumDate={today}
      onDismiss={mockOnDismiss}
      onConfirm={mockOnConfirm}
      onValueChange={mockOnValueChange}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('visible이면 피커와 확인 버튼을 보여준다', async () => {
  await renderModal(true);

  expect(screen.getByTestId('date-picker-modal')).toBeTruthy();
  expect(screen.getByTestId('date-picker-native')).toBeTruthy();
  expect(screen.getByText('확인')).toBeTruthy();
});

test('확인을 누르면 onConfirm을 호출한다', async () => {
  await renderModal();

  await fireEvent.press(screen.getByText('확인'));

  expect(mockOnConfirm).toHaveBeenCalledTimes(1);
});

test('배경을 누르면 onDismiss를 호출한다', async () => {
  await renderModal();

  await fireEvent.press(screen.getByTestId('date-picker-backdrop'));

  expect(mockOnDismiss).toHaveBeenCalledTimes(1);
});

test('피커 값을 바꾸면 onValueChange를 호출한다', async () => {
  await renderModal();

  await fireEvent.changeText(
    screen.getByTestId('date-picker-native'),
    '2026-08-25T12:00:00',
  );

  expect(mockOnValueChange).toHaveBeenCalledWith(
    new Date('2026-08-25T12:00:00'),
  );
});
