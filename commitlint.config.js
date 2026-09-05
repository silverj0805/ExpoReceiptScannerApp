module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 한글 커밋 메시지가 기본이고 "Prettier", "ConfirmScreen", "aos"처럼
    // 영문 고유명사/약어로 문장이 시작하는 경우가 흔해서, 대문자로 시작하는
    // 첫 단어만 보고 sentence-case로 오탐하는 이 규칙을 끈다.
    'subject-case': [0],
    'header-max-length': [2, 'always', 200],
  },
};
