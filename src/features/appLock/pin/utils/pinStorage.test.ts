import { clearPin, hasPinSet, savePin, verifyStoredPin } from './pinStorage';

afterEach(async () => {
  await clearPin();
});

test('PIN을 저장하기 전엔 hasPinSet이 false다', async () => {
  await expect(hasPinSet()).resolves.toBe(false);
});

test('PIN을 저장하면 hasPinSet이 true가 된다', async () => {
  await savePin('1234');

  await expect(hasPinSet()).resolves.toBe(true);
});

test('저장한 PIN과 같은 값으로 검증하면 true다', async () => {
  await savePin('1234');

  await expect(verifyStoredPin('1234')).resolves.toBe(true);
});

test('저장한 PIN과 다른 값으로 검증하면 false다', async () => {
  await savePin('1234');

  await expect(verifyStoredPin('9999')).resolves.toBe(false);
});

test('PIN이 저장돼 있지 않으면 검증은 항상 false다', async () => {
  await expect(verifyStoredPin('1234')).resolves.toBe(false);
});

test('clearPin 이후엔 hasPinSet이 다시 false가 된다', async () => {
  await savePin('1234');

  await clearPin();

  await expect(hasPinSet()).resolves.toBe(false);
});
