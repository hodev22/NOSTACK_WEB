document.addEventListener('DOMContentLoaded', function() {
  const BASE_URL = config.BASE_URL;
  const naver_apikey = config.naver_apikey;

  console.log(naverLoginSignup, naverLoginMain);

  // 회원가입 페이지 네이버 로그인
  var naverLoginSignup = new naver.LoginWithNaverId({
    clientId: naver_apikey,
    callbackUrl: "http://localhost:8000/view/Sign/Signup_completed.html",
    callbackHandle: true
  });

  // 로그인 페이지 네이버 로그인
  var naverLoginMain = new naver.LoginWithNaverId({
    clientId: naver_apikey,
    callbackUrl: "http://localhost:8000/view/Main/main.html",
    callbackHandle: true
  });

  // 회원가입 페이지 버튼 초기화 및 이벤트 처리
  var signupButton = document.getElementById('naverIdLogin');
  if (signupButton) {
    naverLoginSignup.init();
    signupButton.addEventListener('click', function(e) {
      e.preventDefault();
      naverLoginSignup.authorize();
    });
  }

  // 로그인 페이지 버튼 초기화 및 이벤트 처리
  var loginButton = document.getElementById('naverId_Login');
  if (loginButton) {
    naverLoginMain.init();
    loginButton.addEventListener('click', function(e) {
      e.preventDefault();
      naverLoginMain.authorize();
    });
  }
});
