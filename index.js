// // index.js
import { completeUpload, displayUploadedFiles, fetchProblemSets } from './controller/fileUploadController.js';
import { activateTab } from './controller/tabController.js';
import { SessionManager, getCookie } from './controller/sessionManager.js';
import { toggleFavorite } from './controller/favoriteController.js';
import { fetchProblems, fetchAnswers } from './controller/workbookController.js';

window.onload = async function() {
    const userId = SessionManager.getUserId();
    console.log('userId:', userId);
    const fileInput = document.getElementById('file-upload');
    const completeBtn = document.getElementById('upload-complete-btn');

    if (fileInput && completeBtn) {
        fileInput.addEventListener('change', displayUploadedFiles);
        completeBtn.addEventListener('click', completeUpload);
    } else {
        console.error('Required elements are missing.');
    }

    // 초기 탭 활성화 (파일 업로드 탭)
    activateTab(document.querySelector('.tab:first-child'), 'upload');

    await fetchProblemSets(); // 문제집 목록 조회 추가
};

// 내비게이션 바를 업데이트하는 함수
function updateNavbar() {
    console.log('updateNavbar 함수 호출됨');
    const navbar = document.querySelector('.navigation');
    if (!navbar) {
        console.error('Navbar element not found');
        return;
    }
    const userId = getCookie('userId');
    console.log('userId from cookie:', userId);

    if (userId) {
        console.log('로그인 상태: 로그아웃 버튼 표시');
        navbar.innerHTML = `
            <div class="nav-links">
                <div class="nav-link" onclick="location.href='/main-page/main.html'">Home</div>
                <div class="nav-link" onclick="location.href='#'">서비스 소개</div>
                <div class="nav-link" onclick="location.href='#'">문제집 생성</div>
            </div>
            <div class="divider"></div>
            <div class="nav-link" onclick="logout()">로그아웃</div>
        `;
    } else {
        console.log('로그아웃 상태: 로그인, 회원가입 버튼 표시');
    }
};

// 로그아웃 함수
window.logout = async function() { // window 객체에 logout 함수 추가
    console.log('로그아웃 함수 호출');
    try {
        const response = await axios.post(`${BASE_URL}/api/users/logout`, {}, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log('로그아웃 응답:', response.data);
        
        // 쿠키 삭제
        document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        console.log('쿠키 삭제 후:', document.cookie);
        
        // 내비게이션 바 업데이트
        updateNavbar();

        // 메인 페이지로 이동
        window.location.href = '/main-page/main.html'; // 메인 페이지로 리다이렉트

    } catch (error) {
        console.error('로그아웃 중 오류 발생:', error);
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
    }
};

// activateTab 함수를 전역으로 설정
window.activateTab = activateTab; // window 객체에 activateTab 함수 추가

// 페이지 로드 시 내비게이션 바 업데이트
document.addEventListener('DOMContentLoaded', updateNavbar);

// 문제 조회 함수
window.viewProblems = async function(problemSetId) {
    fetchProblems(problemSetId);
};

// 정답 조회 함수
window.viewAnswers = async function(problemSetId) {
    fetchAnswers(problemSetId);
};

// 즐겨찾기 토글 이벤트 추가 (이벤트 위임 사용)
document.getElementById('problem-list').addEventListener('click', (event) => {
    if (event.target.classList.contains('toggleFavorite')) {
        const button = event.target;
        const problemSetId = button.getAttribute('data-id'); // 버튼에서 ID 가져오기
        console.log('Toggle Favorite called for ID:', problemSetId); // 디버깅 로그
        toggleFavorite(problemSetId, button); // ID와 버튼을 함께 전달
    }
});

// html에서 접근하기 위해(onclick으로 호출하고 있기 때문에) toggleFavorite 함수를 전역으로 설정
window.toggleFavorite = toggleFavorite;