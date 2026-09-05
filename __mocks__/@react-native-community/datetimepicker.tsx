import { TextInput } from 'react-native';

type PickerEventHandler = (
  event: { type: 'set' | 'dismissed' },
  date?: Date,
) => void;

interface MockDateTimePickerProps {
  testID?: string;
  value: Date;
  onChange?: PickerEventHandler;
  onValueChange?: PickerEventHandler;
}

function DateTimePicker({
  testID = 'date-picker-native',
  value,
  onValueChange,
}: MockDateTimePickerProps) {
  return (
    <TextInput
      testID={testID}
      value={value.toISOString()}
      onChangeText={text => {
        const date = new Date(text);
        const handler = onValueChange;
        handler?.({ type: 'set' }, date);
      }}
    />
  );
}

export const DateTimePickerAndroid = {
  open: jest.fn(),
  dismiss: jest.fn(),
};

export default DateTimePicker;
