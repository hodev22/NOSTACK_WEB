const BASE_URL = config.BASE_URL;  // Base URL 변수 설정
const kakao_apikey = config.kakao_apikey;

    Kakao.init(kakao_apikey);
    console.log(Kakao.isInitialized());

    function KakaoLogin() {
        window.Kakao.Auth.login({
            scope: "profile_nickname, profile_image, account_email",
            success: (authObj) => {
                console.log("authObj : ");
                console.log(authObj);

                axios.post(`${BASE_URL}/api/auth/kakao-login`, null, {
                    headers: {
                        'Authorization': authObj.access_token,                                
                    },
                    withCredentials: true
                  })
                  .then(response => {
                      console.log('Server response:', response.data);
                      
                      if (response.status === 200) {

                          // 로그인 성공 알림 표시
                          alert('로그인 성공!');

                          // 응답 데이터를 URL 파라미터로 인코딩하여 전달
                          const encodedResponse = encodeURIComponent(JSON.stringify(response.data));
                          console.log('Encoded response:', encodedResponse);
                          window.location.href = `/view/Sign/Signup_completed.html?response=${encodedResponse}`;
                      } else {
                          alert('로그인 처리에 문제가 발생했습니다.');
                      }
                  })
                  .catch(error => {
                      console.error('Login error:', error);
                      alert('로그인 중 오류가 발생했습니다.');
                  });
              },
              fail: (error) => {
                  console.error("Kakao login failed:", error);
                  alert('Kakao 로그인에 실패했습니다.');
              }
          });
    }