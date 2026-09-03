import { http, HttpResponse } from 'msw';

import { server } from './server';

// MSW 설정 자체가 실제로 동작하는지 확인하는 인프라 테스트
// 화면별 API 목은 각 화면 개발할 때 handlers.ts에 추가하고, 이 테스트는 그대로 회귀 검증용으로 남겨둠.
test('MSW가 fetch 요청을 가로채서 목 응답을 돌려준다', async () => {
  server.use(
    http.get('https://example.com/ping', () => {
      return HttpResponse.json({ ok: true });
    }),
  );

  const response = await fetch('https://example.com/ping');
  const body = await response.json();

  expect(body).toEqual({ ok: true });
});
