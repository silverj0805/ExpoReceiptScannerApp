// 이 파일만 Node 내장 모듈 타입이 필요해서 tsconfig의 전역 types(["jest"])는 그대로 두고
// 파일 단위로만 선언한다 — 앱 소스 전역에 Node 앰비언트 타입(Buffer, process 등)이 새는 걸 피하기 위함.
/// <reference types="node" />

// expo-crypto가 node_modules/expo-crypto/mocks/ExpoCrypto.ts로 제공하는 공식 Jest mock은
// expo-modules-test-core가 자동 생성한 더미 스텁이라 digestStringAsync가 항상 ''을 반환한다
// (실측으로 발견 — PIN 해시 테스트가 salt/PIN이 달라도 전부 같은 값('')으로 나와서 실패했음).
// 실제 해시 계산 결과 자체를 검증해야 하는 테스트가 있어서, Node 내장 crypto로 진짜 SHA-256 등을 계산하는 mock으로 대체한다.
import { createHash, randomUUID as nodeRandomUUID, randomBytes } from 'crypto';

export enum CryptoDigestAlgorithm {
  SHA1 = 'SHA-1',
  SHA256 = 'SHA-256',
  SHA384 = 'SHA-384',
  SHA512 = 'SHA-512',
  MD2 = 'MD2',
  MD4 = 'MD4',
  MD5 = 'MD5',
}

export enum CryptoEncoding {
  HEX = 'hex',
  BASE64 = 'base64',
}

const ALGORITHM_TO_NODE_NAME: Record<CryptoDigestAlgorithm, string> = {
  [CryptoDigestAlgorithm.SHA1]: 'sha1',
  [CryptoDigestAlgorithm.SHA256]: 'sha256',
  [CryptoDigestAlgorithm.SHA384]: 'sha384',
  [CryptoDigestAlgorithm.SHA512]: 'sha512',
  [CryptoDigestAlgorithm.MD2]: 'md2',
  [CryptoDigestAlgorithm.MD4]: 'md4',
  [CryptoDigestAlgorithm.MD5]: 'md5',
};

export async function digestStringAsync(
  algorithm: CryptoDigestAlgorithm,
  data: string,
  options?: { encoding?: CryptoEncoding },
): Promise<string> {
  const nodeAlgorithm = ALGORITHM_TO_NODE_NAME[algorithm] ?? 'sha256';
  const encoding =
    options?.encoding === CryptoEncoding.BASE64 ? 'base64' : 'hex';
  return createHash(nodeAlgorithm).update(data, 'utf8').digest(encoding);
}

export function getRandomBytes(byteCount: number): Uint8Array {
  return new Uint8Array(randomBytes(byteCount));
}

export async function getRandomBytesAsync(
  byteCount: number,
): Promise<Uint8Array> {
  return getRandomBytes(byteCount);
}

export function getRandomValues<
  T extends { length: number; set: (arr: Uint8Array) => void },
>(typedArray: T): T {
  typedArray.set(randomBytes(typedArray.length));
  return typedArray;
}

export function randomUUID(): string {
  return nodeRandomUUID();
}
