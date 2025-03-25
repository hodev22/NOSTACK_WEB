import { SessionManager } from './sessionManager.js';

const BASE_URL = config.BASE_URL;

// 즐겨찾기 상태를 저장하는 함수
function saveFavoriteStatus(problemSetId, isFavorite) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || {};
    favorites[problemSetId] = isFavorite;
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// 즐겨찾기 상태를 불러오는 함수
export function loadFavoriteStatus() {
    return JSON.parse(localStorage.getItem('favorites')) || {};
}

// 즐겨찾기 토글 함수
export async function toggleFavorite(problemSetId, button) {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    if (!userId) {
        alert('로그인 정보가 없습니다. 다시 로그인해 주세요.');
        return;
    }

    try {
        const response = await axios.patch(`${BASE_URL}/api/workbook/front/favorite`, null, {
            params: {
                wb_id: problemSetId,
                userId: userId
            }
        });

        console.log(response.data);
        alert(response.data.message);

        // 서버 응답에 따라 즐겨찾기 상태 업데이트
        const isFavorite = response.data.favorite; // 서버 응답에서 favorite 값 가져오기
        const icon = button.querySelector('img');
        icon.src = isFavorite ? '/assets/img/star-filled.png' : '/assets/img/star-empty.png'; // 아이콘 변경

        // 클라이언트 측 상태 업데이트
        const favorites = loadFavoriteStatus();
        favorites[problemSetId] = isFavorite; // 상태 업데이트
        saveFavoriteStatus(problemSetId, isFavorite); // 로컬 스토리지에 저장
    } catch (error) {
        console.error('즐겨찾기 토글 중 오류 발생:', error);
        alert('즐겨찾기 설정 중 오류가 발생했습니다: ' + error.message);
    }
}