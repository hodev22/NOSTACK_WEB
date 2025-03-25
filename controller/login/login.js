// import config from './config/apikey.js';
// const BASE_URL = config.BASE_URL;

//로컬 로그인 api & 쿠키
const emailInput = document.querySelector('.input-email');
const passwordInput = document.querySelector('.input-password');
const submitButton = document.querySelector('.submit-button');
const loginform = document.querySelector('.login-form');

document.addEventListener('DOMContentLoaded', function () {
  // 폼 제출 이벤트 처리
  const loginForm = document.querySelector('.login-form'); // '.login-form' 선택자 확인
  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault(); // 폼 기본 제출 동작 방지

      // 입력된 이메일과 비밀번호 가져오기
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // 서버로 보낼 요청 데이터 준비
      const requestBody = {
        email: email,
        password: password,
      };

      console.log('서버로 보낼 요청 데이터:', requestBody);

      axios
        .post(`${config.BASE_URL}/api/users/login`, requestBody, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((response) => {
          console.log('서버 응답 데이터:', response.data);

          // 서버 응답에서 userId 추출
          const userId = response.data.userId;

          if (userId) {
            document.cookie = `userId=${userId}; path=/; max-age=3600`;
            console.log('userId가 쿠키에 저장되었습니다:', userId);

            // 로그인 성공 시 메인 페이지로 이동
            alert('로그인 성공!');
            window.location.href = '/main-page/main.html';
          } else {
            console.error('서버 응답에 userId가 없습니다.');
            alert('로그인 실패: 유효하지 않은 사용자입니다.');
          }
        })
        .catch((error) => {
          console.error('서버 요청 중 에러 발생:', error.response || error);
          alert('로그인 처리 중 에러가 발생했습니다.');
        });
    });
  } 
});