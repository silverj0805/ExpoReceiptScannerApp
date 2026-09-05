import { Pressable, ScrollView, Text, View } from 'react-native';

import type { CategoryId } from '@/features/receipt/api/types/category';
import { CATEGORY_IDS, getCategoryInfo } from '@/shared/utils/category';

import type { PeriodFilter } from '../../utils/receiptFilters';

const PERIOD_TABS: { id: PeriodFilter; label: string }[] = [
  { id: 'month', label: '이번 달' },
  { id: 'last', label: '지난 달' },
  { id: 'all', label: '전체' },
];

const CATEGORY_CHIPS: { id: 'all' | CategoryId }[] = [
  { id: 'all' },
  ...CATEGORY_IDS.map(id => ({ id })),
];

interface ListFiltersProps {
  period: PeriodFilter;
  selectedCategories: CategoryId[];
  onPeriodChange: (period: PeriodFilter) => void;
  onToggleCategory: (id: CategoryId) => void;
  onSelectAllCategories: () => void;
}

const ListFilters = ({
  period,
  selectedCategories,
  onPeriodChange,
  onToggleCategory,
  onSelectAllCategories,
}: ListFiltersProps) => (
  <View className="mb-5 gap-3 px-5 pt-4 pb-2">
    <Text className="text-xl font-extrabold text-black">전체 내역</Text>

    <View className="flex-row rounded-xl border border-[#e8e6e1] bg-white p-1">
      {PERIOD_TABS.map(tab => {
        const selected = tab.id === period;
        return (
          <Pressable
            key={tab.id}
            testID={`period-${tab.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onPeriodChange(tab.id)}
            className={`flex-1 items-center rounded-lg py-2 ${
              selected ? 'bg-background' : ''
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                selected ? 'text-primary' : 'text-gray'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-px">
        {CATEGORY_CHIPS.map(({ id }) => {
          const info = id === 'all' ? null : getCategoryInfo(id);
          const label = id === 'all' ? '전체' : info!.label;
          const selected =
            id === 'all'
              ? selectedCategories.length === 0
              : selectedCategories.includes(id);
          const activeBg = info?.bg ?? '#1C1B1A';
          const activeColor = info?.color ?? '#FFFFFF';

          return (
            <Pressable
              key={id}
              testID={`category-filter-${id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() =>
                id === 'all' ? onSelectAllCategories() : onToggleCategory(id)
              }
              className="rounded-full px-3.5 py-2"
              style={{
                backgroundColor: selected ? activeBg : '#ffffff',
                borderWidth: 1,
                borderColor: selected ? activeColor : '#e8e6e1',
              }}
            >
              <Text
                className="text-[13px] font-bold"
                style={{ color: selected ? activeColor : '#6f6d68' }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  </View>
);

export default ListFilters;
