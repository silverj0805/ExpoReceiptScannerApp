import { generateSalt, hashPin, verifyPin } from './pinHash';

test('generateSalt는 32자리 16진수 문자열을 반환한다', async () => {
  const salt = await generateSalt();

  expect(salt).toMatch(/^[0-9a-f]{32}$/);
});

test('generateSalt를 두 번 호출하면 서로 다른 값이 나온다', async () => {
  const first = await generateSalt();
  const second = await generateSalt();

  expect(first).not.toBe(second);
});

test('hashPin은 SHA-256 다이제스트 형식(64자리 16진수)을 반환한다', async () => {
  const hash = await hashPin('1234', 'aabbccdd');

  expect(hash).toMatch(/^[0-9a-f]{64}$/);
});

test('같은 PIN·같은 salt면 항상 같은 해시가 나온다(결정론적)', async () => {
  const first = await hashPin('1234', 'aabbccdd');
  const second = await hashPin('1234', 'aabbccdd');

  expect(first).toBe(second);
});

test('salt가 다르면 같은 PIN이어도 다른 해시가 나온다', async () => {
  const withSaltA = await hashPin('1234', 'aaaaaaaa');
  const withSaltB = await hashPin('1234', 'bbbbbbbb');

  expect(withSaltA).not.toBe(withSaltB);
});

test('PIN이 다르면 같은 salt여도 다른 해시가 나온다', async () => {
  const pin1234 = await hashPin('1234', 'aabbccdd');
  const pin4321 = await hashPin('4321', 'aabbccdd');

  expect(pin1234).not.toBe(pin4321);
});

test('verifyPin은 올바른 PIN이면 true를 반환한다', async () => {
  const salt = await generateSalt();
  const hash = await hashPin('1234', salt);

  await expect(verifyPin('1234', salt, hash)).resolves.toBe(true);
});

test('verifyPin은 틀린 PIN이면 false를 반환한다', async () => {
  const salt = await generateSalt();
  const hash = await hashPin('1234', salt);

  await expect(verifyPin('9999', salt, hash)).resolves.toBe(false);
});
