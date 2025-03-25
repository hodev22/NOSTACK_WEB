document.addEventListener('DOMContentLoaded', function () {

  const BASE_URL = `http://52.62.131.25:8080`; // Base URL 변수 설정

  const nameInput = document.querySelector('.input-name');
  const emailInput = document.querySelector('.input-email');
  const telInput = document.querySelector('.input-tel');
  const passwordInput = document.querySelector('.input-pwd');
  const passwordConfirmInput = document.querySelector('.input-pwdcon');
  const personalCheckbox = document.querySelector('#personal');
  const submitButton = document.querySelector('.submit-button');
  const verifyButton = document.querySelector('.verify-button');

  let verificationTimeout;
  let isVerified = false;
  let verificationInput;
  let verificationConfirmButton;
  let timerElement;

  function initVerification() {
    // 인증번호 입력 필드 및 확인 버튼 생성
    if (!verificationInput) {
      verificationInput = document.createElement('input');
      verificationInput.className = 'input-verification';
      verificationInput.placeholder = '인증번호 입력';
      telInput.parentElement.insertBefore(verificationInput, telInput.nextSibling);
    }

    if (!verificationConfirmButton) {
      verificationConfirmButton = document.createElement('button');
      verificationConfirmButton.className = 'verification-confirm-button';
      verificationConfirmButton.textContent = '확인';
      telInput.parentElement.insertBefore(verificationConfirmButton, verificationInput.nextSibling);
    }

    if (!timerElement) {
      timerElement = document.createElement('div');
      timerElement.className = 'timer';
      telInput.parentElement.insertBefore(timerElement, verificationConfirmButton.nextSibling);
    }

    // 3분 타이머 시작
    let timeLeft = 180; // 3분 설정

    const updateTimer = () => {
      if (timeLeft <= 0) {
        clearTimeout(verificationTimeout);
        timerElement.textContent = '인증 시간이 만료되었습니다.';
        timerElement.style.color = 'red';
        clearVerificationElements();
        return;
      }
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `남은 시간: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      timeLeft--;
    };

    updateTimer();
    verificationTimeout = setInterval(updateTimer, 1000);

    // 인증번호 확인 버튼 클릭 시
    verificationConfirmButton.addEventListener('click', function (event) {
      event.preventDefault(); // 기본 동작 방지
      axios.post(`${BASE_URL}/sms-certification/confirms`, {
        'phone': telInput.value.replace(/-/g, ''), 
        'certificationNumber': verificationInput.value
      })
      .then(response => {
        if (response.status === 200) {
          isVerified = true;
          alert('전화번호 인증 완료!');
          clearVerificationElements();
        } else {
          showError(verificationInput, '인증번호가 올바르지 않습니다.');
        }
      })
      .catch(error => {
        if (error.response) {
          if (error.response.status === 401) {
          showError(verificationInput, '인증번호가 올바르지 않습니다.');
        } else {
          console.error('Error:', error.message);
          alert('인증번호 확인 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
      }
    });
    });
  }

  function clearVerificationElements() {
    if (verificationInput) verificationInput.remove();
    if (verificationConfirmButton) verificationConfirmButton.remove();
    if (timerElement) timerElement.remove();
    verificationInput = null;
    verificationConfirmButton = null;
    timerElement = null;
    clearTimeout(verificationTimeout);
  }

  // 폼 제출 버튼 클릭 시
  submitButton.addEventListener('click', function (event) {
    event.preventDefault(); // 기본 동작 방지
    clearValidationMessages();
    if (validateForm()) {
      if (!isVerified) {
        showError(telInput, '전화번호 인증을 완료해 주세요.');
        return;
      }

      const data = {
        email: emailInput.value,
        name: nameInput.value,
        password: passwordInput.value,
        passwordCheck: passwordConfirmInput.value,
        phone: telInput.value.replace(/-/g, '') // 전화번호에서 하이픈 제거
      };

      // 회원가입을 위한 통신 부분 코드
      axios.post(`${BASE_URL}/api/users/join`, data, { //BASE_URL 변수 추가
        headers: {
          'Content-Type': 'application/JSON'
        },
      })
      .then(response => {
        console.log('Server response: ', response.data);
        if (response.data.message === 'User registered successfully') {
          alert('회원가입 성공!');
          window.location.href = 'Signup_completed.html';
        } else {
          alert('회원가입 처리에 문제가 발생했습니다.');
        }
      })
      .catch(function (xhr) {
        if (xhr.status === 400) {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.message === 'Email is already in use') {
            showError(emailInput, '이메일이 이미 사용 중입니다.');
          } else {
            alert('회원가입에 실패했습니다. 다시 시도해 주세요.');
          }
        } else {
          alert('서버 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
        }
      });
    }
  });

  // 인증 버튼 클릭 시
  verifyButton.addEventListener('click', function (event) {
    event.preventDefault(); // 기본 동작 방지
    clearValidationMessages();
    if (!validatePhoneNumber(telInput.value)) {
      showError(telInput, '유효한 전화번호를 입력해 주세요.');
      return;
    }

    // 인증번호 전송 로직 (서버와 통신)
    axios.post(`${BASE_URL}/sms-certification/sends`, { 'phone': telInput.value.replace(/-/g, '') }) //BASE_URL 변수 추가
    .then(() => {
      alert('인증코드가 발송되었습니다!');
      console.log('Verification code sent successfully');
      if (!verificationInput) {
        initVerification();
      }
    })
    .catch(error => {
      if (error.response) {
        if (error.response.status === 401) {
          showError(telInput, '인증번호가 올바르지 않습니다.');
        } else if (error.response.status === 500) {
          console.error('Internal Server Error:', error.response.data);
          alert('서버 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
        } else {
          console.error('Error:', error.response.data);
          alert('인증번호 전송에 실패했습니다. 다시 시도해 주세요.');
        }
      } else {
        console.error('Error:', error.message);
        alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.');
      }
    });
  });

  function validateForm() {
    let isValid = true;

    if (!nameInput.value.trim()) {
      showError(nameInput, '이름을 입력해 주세요.');
      isValid = false;
    }
    if (!validateEmail(emailInput.value)) {
      showError(emailInput, '유효한 이메일 주소를 입력해 주세요.');
      isValid = false;
    }
    if (!validatePhoneNumber(telInput.value)) {
      showError(telInput, '유효한 전화번호를 입력해 주세요.');
      isValid = false;
    }
    if (!validatePwd(passwordInput.value)) {
      showError(
        passwordInput,
        '비밀번호는 8-16자, 숫자, 문자, 특수문자를 포함해야 합니다.'
      );
      isValid = false;
    }
    if (passwordInput.value !== passwordConfirmInput.value) {
      showError(passwordConfirmInput, '비밀번호가 일치하지 않습니다.');
      isValid = false;
    }
    if (!personalCheckbox.checked) {
      showError(personalCheckbox, '개인정보 활용에 동의해 주세요.');
      isValid = false;
    }
    return isValid;
  }

  function showError(input, message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.style.color = 'red';
    error.textContent = message;
    input.parentElement.appendChild(error);
  }

  function clearValidationMessages() {
    const errors = document.querySelectorAll('.error-message');
  }

  function validatePwd(pwd) {
    const re =
      /^.*(?=^.{8,16}$)(?=.*\d)(?=.*[a-zA-Z])(?=.*[~,!,@,#,$,*,(,),=,+,_,.,|]).*$/;
    return re.test(pwd);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function validatePhoneNumber(phone) {
    const re = /^\d{3}-\d{3,4}-\d{4}$/;
    return re.test(phone);
  }
});
