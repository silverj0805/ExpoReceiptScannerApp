import React from 'react';
import { View, Text, Pressable } from 'react-native';

import SummaryCard, { SummaryCardProps } from '../summaryCard';
import SummaryCardSkeleton from '../summaryCard/SummaryCardSkeleton';
import WiseSaying from '../wiseSayings/index';

interface ListHeaderComponentProps {
  isLoading: boolean;
  summary?: SummaryCardProps;
  onPress: () => void;
}

const ListHeaderComponent = ({
  isLoading,
  summary,
  onPress,
}: ListHeaderComponentProps) => (
  <View className="gap-6">
    <View className="gap-2">
      <View className="flex-row   gap-1 items-baseline">
        <Text className="text-2xl font-bold">🧸가계부</Text>
        <Text className="text-xs text-gray font0-semibold">
          오늘도 잘 모으곰 부자되세요!
        </Text>
      </View>
      <WiseSaying />
    </View>

    {isLoading || !summary ? (
      <SummaryCardSkeleton />
    ) : (
      <SummaryCard {...summary} />
    )}

    <View className="flex-row items-center justify-between">
      <Text className="text-base font-bold">최근 영수증</Text>
      <Pressable onPress={onPress}>
        <Text className="text-base font-bold text-primary">전체 보기</Text>
      </Pressable>
    </View>
  </View>
);

export default ListHeaderComponent;
