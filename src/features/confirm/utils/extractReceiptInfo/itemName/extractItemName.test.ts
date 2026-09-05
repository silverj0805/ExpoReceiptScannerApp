import { extractItemName } from './extractItemName';

test('품명 추출은 아직 구현되지 않아 null이다', () => {
  expect(extractItemName('품명\n아메리카노 Tall   4,500')).toBeNull();
});
