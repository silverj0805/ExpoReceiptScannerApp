import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import type { CategoryId } from '@/features/receipt/api/types/category';
import { getCategoryInfo } from '@/shared/utils/category';

import { CATEGORY_IDS, type ConfirmFormValues } from '../types';

import { FormField } from './FormField';

interface CategoryFieldProps {
  control: Control<ConfirmFormValues>;
  errors: FieldErrors<ConfirmFormValues>;
}

interface CategoryButtonProps {
  id: CategoryId;
  selected: boolean;
  onPress: (id: CategoryId) => void;
}

function CategoryButton({ id, selected, onPress }: CategoryButtonProps) {
  const categoryInfo = getCategoryInfo(id);

  return (
    <Pressable
      testID={`category-${id}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(id)}
      className="rounded-full px-3.5 py-2"
      style={{
        backgroundColor: selected ? categoryInfo.bg : '#ffffff',
        borderWidth: 1,
        borderColor: selected ? categoryInfo.color : '#e8e6e1',
      }}
    >
      <Text
        className="text-[13px] font-bold"
        style={{
          color: selected ? categoryInfo.color : '#6f6d68',
        }}
      >
        {categoryInfo.label}
      </Text>
    </Pressable>
  );
}

const CategoryField = ({ control, errors }: CategoryFieldProps) => (
  <FormField label="카테고리" required error={errors.category?.message}>
    <Controller
      control={control}
      name="category"
      rules={{ required: '카테고리를 선택해주세요' }}
      render={({ field: { onChange, value } }) => (
        <View className="flex-row flex-wrap gap-1">
          {CATEGORY_IDS.map(id => (
            <CategoryButton
              key={id}
              id={id}
              selected={value === id}
              onPress={onChange}
            />
          ))}
        </View>
      )}
    />
  </FormField>
);

export default CategoryField;
