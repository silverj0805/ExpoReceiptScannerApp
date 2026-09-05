import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Platform, Pressable, Text } from 'react-native';

import Icon from '@/shared/components/Icon';

import type { ConfirmFormValues } from '../types';
import { formatPickerDate, toPickerDate } from '../utils/date';

import DatePickerModal from './DatePickerModal';
import { FORM_CONTROL_CLASS_NAME, FormField } from './FormField';

interface DateFieldProps {
  control: Control<ConfirmFormValues>;
  errors: FieldErrors<ConfirmFormValues>;
}

const DateField = ({ control, errors }: DateFieldProps) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [today] = useState(() => new Date());

  return (
    <FormField label="날짜" required error={errors.date?.message}>
      <Controller
        control={control}
        name="date"
        rules={{ required: '날짜를 선택해주세요' }}
        render={({ field: { onChange, value } }) => {
          const openPicker = () => {
            if (Platform.OS === 'android') {
              DateTimePickerAndroid.open({
                value: toPickerDate(value, today),
                mode: 'date',
                maximumDate: today,
                onChange: (event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    onChange(formatPickerDate(selectedDate));
                  }
                },
              });
            } else {
              setPendingDate(toPickerDate(value, today));
              setDatePickerOpen(true);
            }
          };

          const closePicker = () => setDatePickerOpen(false);

          return (
            <>
              <Pressable
                testID="date-input"
                onPress={openPicker}
                className={`flex-row items-center gap-2 ${FORM_CONTROL_CLASS_NAME}`}
              >
                <Icon
                  name="calendar-outline"
                  size={16}
                  colorClassName="accent-gray"
                />
                <Text
                  className={`flex-1 text-sm font-semibold ${
                    value ? 'text-black' : 'text-gray'
                  }`}
                >
                  {value
                    ? dayjs(value).format('YYYY년 M월 D일')
                    : '날짜를 선택해주세요'}
                </Text>
              </Pressable>

              {Platform.OS === 'ios' && (
                <DatePickerModal
                  visible={datePickerOpen}
                  value={pendingDate ?? toPickerDate(value, today)}
                  maximumDate={today}
                  onDismiss={closePicker}
                  onValueChange={setPendingDate}
                  onConfirm={() => {
                    onChange(
                      formatPickerDate(
                        pendingDate ?? toPickerDate(value, today),
                      ),
                    );
                    closePicker();
                  }}
                />
              )}
            </>
          );
        }}
      />
    </FormField>
  );
};

export default DateField;
