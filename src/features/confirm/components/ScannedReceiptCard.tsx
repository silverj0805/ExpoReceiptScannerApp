import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

interface ScannedReceiptCardProps {
  onRetake: () => void;
}

const ScannedReceiptCard = ({ onRetake }: ScannedReceiptCardProps) => (
  <>
    <View className="flex-row items-center justify-between rounded-2xl border border-[#e8e6e1] bg-white px-3.5 py-3">
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-11 items-center justify-center rounded-lg border border-[#e8e6e1] bg-white">
          <Icon
            name="document-outline"
            size={20}
            colorClassName="accent-gray"
          />
        </View>
        <Text className="text-xs text-gray">촬영한 영수증</Text>
      </View>
      <Pressable onPress={onRetake}>
        <Text className="text-xs font-bold text-primary">다시 촬영</Text>
      </Pressable>
    </View>

    <View className="flex-row items-center gap-2">
      <Icon
        name="information-circle-outline"
        size={15}
        colorClassName="accent-gray"
      />
      <Text className="text-xs text-gray">
        자동 인식 결과는 부정확할 수 있습니다. 확인 후 저장해주세요.
      </Text>
    </View>
  </>
);

export default ScannedReceiptCard;
