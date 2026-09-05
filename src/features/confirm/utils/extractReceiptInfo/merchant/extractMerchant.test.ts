import { extractMerchant } from './extractMerchant';

test('점포명 라벨 기준으로 가맹점을 추출한다', () => {
  const rawText = [
    '점포명 : 스타벅스 강남점',
    '서울 강남구 테헤란로 123',
  ].join('\n');

  expect(extractMerchant(rawText)).toBe('스타벅스 강남점');
});

test('라벨과 값 사이에 콜론/공백이 없어도 추출한다', () => {
  expect(extractMerchant('점포명GS25 역삼점')).toBe('GS25 역삼점');
});

test('해당 라벨이 없으면 null이다', () => {
  expect(extractMerchant('아무 의미 없는 텍스트')).toBeNull();
});

test('상호/점포명 라벨이 없는 카드전표에서는 가맹점을 못 잡는다', () => {
  expect(extractMerchant('대기번호 167\n승인금액 2.000원')).toBeNull();
});
