import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { ConfirmFormValues } from '../types';

import { FormField, FormTextInput } from './FormField';

interface ItemNameFieldProps {
  control: Control<ConfirmFormValues>;
}

const ItemNameField = ({ control }: ItemNameFieldProps) => (
  <FormField label="품명">
    <Controller
      control={control}
      name="itemName"
      render={({ field: { onChange, onBlur, value } }) => (
        <FormTextInput
          testID="item-name-input"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder="품명을 입력해주세요 (선택)"
        />
      )}
    />
  </FormField>
);

export default ItemNameField;
