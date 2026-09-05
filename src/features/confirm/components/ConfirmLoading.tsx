import { ActivityIndicator, View } from 'react-native';

const ConfirmLoading = () => (
  <View
    testID="confirm-loading"
    className="flex-1 items-center justify-center bg-background"
  >
    <ActivityIndicator color="#1B5E43" />
  </View>
);

export default ConfirmLoading;
