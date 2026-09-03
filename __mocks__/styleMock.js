// Jest는 Metro의 CSS 파이프라인(uniwind/lightningcss)을 거치지 않아서 .css import를
// 그냥 파싱하려다 실패함(문법 자체가 JS가 아니라서) — 빈 모듈로 목 처리.
module.exports = {};
