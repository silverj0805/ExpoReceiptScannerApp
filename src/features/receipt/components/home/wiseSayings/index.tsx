import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { WISE_SAYINGS } from './constants';

const getRandomIndex = (length: number) => Math.floor(Math.random() * length);

const WiseSaying = () => {
  const [index, setIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setIndex(getRandomIndex(WISE_SAYINGS.length));
    }, []),
  );

  return (
    <Text
      className="text-sm font-semibold text-[#6a9480] bg-amber-50 self-start"
      style={{ transform: [{ skewX: '-8deg' }] }}
    >
      💡&quot;{WISE_SAYINGS[index]}&quot;
    </Text>
  );
};

export default WiseSaying;
