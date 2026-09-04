// setupFiles(=setupFilesAfterEnv보다 먼저, 모듈이 로드되기 전) 단계에서 실행돼야 하는
// 환경변수 기본값 설정. shared/api/client.ts가 모듈 로드 시점에 한 번
// process.env.EXPO_PUBLIC_API_BASE_URL을 읽어 axios baseURL로 캡처하는데, 실제 앱에서는
// Metro가 .env.development에서 빌드 타임에 인라인해주지만 Jest는 이 인라인을 전혀
// 안 해서(client.test.ts처럼 테스트가 직접 세팅하지 않는 한) 기본적으로 undefined다.
// baseURL이 undefined면 axios가 상대 경로로 요청을 보내면서 MSW가 못 가로채는 요청이
// 되어 쿼리가 절대 settle되지 않는 문제를 실측으로 발견 — 화면 테스트가 항상 유효한
// baseURL을 갖도록 여기서 기본값을 깔아준다(MSW 핸들러가 '*/receipts' 같은 와일드카드로
// 매칭하므로 실제 값 자체는 의미 없음). 이미 특정 테스트가 값을 세팅했다면 덮어쓰지 않음.
process.env.EXPO_PUBLIC_API_BASE_URL ??= 'https://example.com';
