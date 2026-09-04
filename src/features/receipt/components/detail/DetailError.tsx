import { View, Text, Pressable } from 'react-native';

import Icon from '@/shared/components/Icon';

const DetailError = ({
  isNotFound,
  goBack,
}: {
  isNotFound: boolean;
  goBack: () => void;
}) => {
  return (
    <View className="flex-1 items-center justify-center gap-4.5 bg-background px-8">
      <Icon
        name="document-text-outline"
        size={72}
        colorClassName="accent-primary"
      />
      <Text className="text-center text-[13px] leading-5 text-gray">
        {isNotFound
          ? '영수증을 찾을 수 없어요'
          : '영수증을 불러오지 못했어요. 다시 시도해주세요.'}
      </Text>
      <Pressable
        onPress={goBack}
        className="rounded-2xl border border-[#e8e6e1] bg-white px-5.5 py-3.5"
      >
        <Text className="text-sm font-bold text-black">돌아가기</Text>
      </Pressable>
    </View>
  );
};

export default DetailError;
