document.addEventListener('DOMContentLoaded', function() {
  const SessionManager = {
    setSessionCookie(name, value, days) {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = `${name}=${value}${expires}; path=/; SameSite=None; Secure`;
    },
    
    getSessionCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim(); // Trim leading spaces
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
      }
      return null;
    },

    eraseSessionCookie(name) {
      document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Lax`;
    },

    getUserId() {
      return this.getSessionCookie('userId');
    },

    setUserId(userId) {
      this.setSessionCookie('userId', userId, 1); // 1일 동안 유효
    },

    clearUserId() {
      this.eraseSessionCookie('userId');
    },

    isUserLoggedIn() {
      const userId = this.getUserId();
      console.log('User ID:', userId);
      return !!userId;
    }
  };

  function Create_Workbook() {
    const userId = SessionManager.getUserId();
    if (!userId) {
      alert("로그인 후 사용 가능한 서비스입니다.");
      window.location.href = '/login/login.html'; // 로그인 페이지로 이동
    } else {
      alert("문제집 생성 페이지로 이동");
      window.location.href = '../view/File-Upload/file-upload.html'; // 로그인 되어있으면(userId가 있으면) 문제집 생성 페이지로 이동
    }
  }

  // 내비게이션 바의 문제집 생성 버튼에 이벤트 리스너 추가
  const createWBbtn = document.querySelector('#createWB');
  if (createWBbtn) {
    createWBbtn.addEventListener('click', Create_Workbook);
  } else {
    console.error("CreateWB 버튼을 찾을 수 없습니다.");
  }
});
