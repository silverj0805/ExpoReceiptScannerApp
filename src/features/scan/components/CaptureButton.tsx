import { Pressable, View } from 'react-native';

interface CaptureButtonProps {
  capture: () => void;
  isCapturing: boolean;
}

const CaptureButton = ({ capture, isCapturing }: CaptureButtonProps) => {
  return (
    <Pressable
      testID="scan-capture-button"
      onPress={capture}
      disabled={isCapturing}
      hitSlop={8}
      className={`h-18 w-18 items-center justify-center rounded-full border-4 border-white ${
        isCapturing ? 'opacity-40' : ''
      }`}
    >
      <View className="h-14.5 w-14.5 rounded-full bg-white" />
    </Pressable>
  );
};

export default CaptureButton;
