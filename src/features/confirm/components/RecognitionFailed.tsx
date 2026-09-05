import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

interface RecognitionFailedProps {
  goBack: () => void;
  enterManually: () => void;
}

const RecognitionFailed = ({
  goBack,
  enterManually,
}: RecognitionFailedProps) => (
  <View className="flex-1 items-center justify-center gap-4.5 bg-background px-8">
    <Icon
      name="document-text-outline"
      size={72}
      colorClassName="accent-primary"
    />
    <View className="items-center gap-2">
      <Text className="text-[17px] font-extrabold text-black">
        텍스트를 인식하지 못했어요
      </Text>
      <Text className="text-center text-[13px] leading-5 text-gray">
        다시 촬영하거나{'\n'}직접 입력할 수 있어요
      </Text>
    </View>
    <View className="flex-row gap-2.5">
      <Pressable
        onPress={goBack}
        className="rounded-2xl border border-[#e8e6e1] bg-white px-5.5 py-3.5"
      >
        <Text className="text-sm font-bold text-black">다시 촬영</Text>
      </Pressable>
      <Pressable
        onPress={enterManually}
        className="rounded-2xl bg-primary px-5.5 py-3.5"
      >
        <Text className="text-sm font-bold text-white">직접 입력</Text>
      </Pressable>
    </View>
  </View>
);

export default RecognitionFailed;
