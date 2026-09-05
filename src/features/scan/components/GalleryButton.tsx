import { Pressable } from 'react-native';

import Icon from '@/shared/components/Icon';

interface GalleryButtonProps {
  openGallery: () => void;
}

const GalleryButton = ({ openGallery }: GalleryButtonProps) => {
  return (
    <Pressable
      testID="scan-gallery-button"
      onPress={openGallery}
      hitSlop={8}
      className="h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.14)]"
    >
      <Icon name="image-outline" size={20} colorClassName="accent-white" />
    </Pressable>
  );
};

export default GalleryButton;
