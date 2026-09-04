/**
 * client.ts는 axios.create() 시점에 EXPO_PUBLIC_API_BASE_URL을 캡처한다. 테스트마다 이 값을
 * 바꿔가며 재캡처시키려면 jest.resetModules()로 모듈 레지스트리를 비운 뒤 매 테스트에서
 * require()로 새로 로드해야 한다(파일 상단 static import는 최초 1회만 평가되어 재사용 불가).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- 위 사유로 테스트별 지연 require 필요 */
import { http, HttpResponse } from 'msw';

import { server } from '@/mocks/server';

jest.mock('@/shared/firebase/crashlyticsRecorder', () => ({
  recordApiError: jest.fn(),
}));

// react-native-device-info는 네이티브 모듈이라 공식 목(jest/react-native-device-info-mock)으로 대체.
// getUniqueId()는 이 목에서 'unknown'을 resolve한다.
const BASE_URL = 'https://example.com';

describe('shared/api/client', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('EXPO_PUBLIC_API_BASE_URL을 baseURL로 사용한다', async () => {
    server.use(
      http.get(`${BASE_URL}/ping`, () => HttpResponse.json({ ok: true })),
    );

    const client = require('./client').default;
    const response = await client.get('/ping');

    expect(response.data).toEqual({ ok: true });
  });

  test('모든 요청에 기기 고유 ID를 X-Device-Id 헤더로 실어보낸다', async () => {
    let receivedHeader: string | null = null;
    server.use(
      http.get(`${BASE_URL}/ping`, ({ request }) => {
        receivedHeader = request.headers.get('X-Device-Id');
        return HttpResponse.json({ ok: true });
      }),
    );

    const client = require('./client').default;
    await client.get('/ping');

    expect(receivedHeader).toBe('unknown');
  });

  test('응답 에러 발생 시 recordApiError를 호출하고 에러를 그대로 던진다', async () => {
    server.use(
      http.get(`${BASE_URL}/boom`, () =>
        HttpResponse.json({ message: 'server error' }, { status: 500 }),
      ),
    );

    const client = require('./client').default;
    // resetModules 이후 client.ts가 실제로 참조한 것과 동일한(새로) 모킹된 인스턴스를 가져와야 함 —
    // 이 파일 상단에서 미리 import해두면 resetModules 이전 인스턴스라 별개의 mock이 되어버린다.
    const { recordApiError } = require('@/shared/firebase/crashlyticsRecorder');

    await expect(client.get('/boom')).rejects.toBeTruthy();
    expect(recordApiError).toHaveBeenCalledTimes(1);
    const [, config, response] = recordApiError.mock.calls[0];
    expect(config).toEqual(expect.objectContaining({ url: '/boom' }));
    expect(response).toEqual(expect.objectContaining({ status: 500 }));
  });
});
