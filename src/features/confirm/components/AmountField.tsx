import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Text, TextInput } from 'react-native';

import type { ConfirmFormValues } from '../types';

import { FormControl, FormField } from './FormField';

interface AmountFieldProps {
  control: Control<ConfirmFormValues>;
  errors: FieldErrors<ConfirmFormValues>;
}

const AmountField = ({ control, errors }: AmountFieldProps) => (
  <FormField label="금액" required error={errors.amount?.message}>
    <Controller
      control={control}
      name="amount"
      rules={{ required: '금액을 입력해주세요' }}
      render={({ field: { onChange, onBlur, value } }) => (
        <FormControl className="flex-row items-center">
          <Text className="text-lg font-extrabold text-gray">₩</Text>
          <TextInput
            testID="amount-input"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="number-pad"
            placeholder="0"
            className="flex-1 text-right text-lg font-extrabold text-black"
          />
        </FormControl>
      )}
    />
  </FormField>
);

export default AmountField;
