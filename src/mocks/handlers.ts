import type { HttpHandler } from 'msw';

// shared/api 이식 시 실제 엔드포인트 핸들러가 여기 채워진다. 지금은 테스트 인프라
// 배선(server.ts + jest.setup.js의 MSW 라이프사이클)만 검증하는 단계라 비워둔다.
export const handlers: HttpHandler[] = [];
