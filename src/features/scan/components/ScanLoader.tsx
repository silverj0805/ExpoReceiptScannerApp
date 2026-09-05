import { View, ActivityIndicator, StyleSheet } from 'react-native';

const ScanLoader = () => {
  return (
    <View
      testID="camera-loading"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      className="items-center justify-center bg-[#141513]"
    >
      <ActivityIndicator color="#ffffff" />
    </View>
  );
};

export default ScanLoader;
