import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { ConfirmFormValues } from '../types';

import { FormField, FormTextInput } from './FormField';

interface MerchantFieldProps {
  control: Control<ConfirmFormValues>;
  errors: FieldErrors<ConfirmFormValues>;
}

const MerchantField = ({ control, errors }: MerchantFieldProps) => (
  <FormField label="가맹점명" required error={errors.merchant?.message}>
    <Controller
      control={control}
      name="merchant"
      rules={{ required: '가맹점명을 입력해주세요' }}
      render={({ field: { onChange, onBlur, value } }) => (
        <FormTextInput
          testID="merchant-input"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder="가맹점명을 입력해주세요"
        />
      )}
    />
  </FormField>
);

export default MerchantField;
