import { SessionManager } from './sessionManager.js'; // 세션 관리

const BASE_URL = config.BASE_URL;

// 문제집의 문제를 보여주는 함수
export async function fetchProblems(problemSetId) {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    try {
        const response = await axios.get(`${BASE_URL}/api/workbook/front/search`, {
            params: {
                wb_id: problemSetId,
                userId: userId
            }
        });

        // 응답 데이터 로그
        console.log('문제집 조회 응답:', response.data);

        // 새로운 페이지 열기
        const newWindow = window.open("문제 보기", '_blank'); // 새 탭 열기
        if (!newWindow) {
            alert('팝업 차단이 활성화되어 있습니다. 팝업을 허용해 주세요.');
            return;
        }

        // 문제 내용 작성
        if (response && response.data) {
            const workbook = response.data; // 문제집 정보
            const questionText = workbook.content || ''; // 문제 내용

            // 문제 구분: 숫자. 으로 시작하는 문제를 정규식으로 분리 (번호와 본문 포함)
            const questions = questionText.match(/(\d+\..*?(?=\n\d+\.|\n*$))/gs) || [];

            let content = `<h2 style="font-family: 'Pretendard', sans-serif; text-align: center; margin: 20px;">${workbook.wb_title}</h2>
                        <div class="question-content" style="font-family: 'Pretendard', sans-serif; margin: 20px;">`;

            questions.forEach((question) => {
                const trimmedQuestion = question.trim(); // 공백 제거
                if (trimmedQuestion) {
                    // 문제와 선지 사이에 줄바꿈 추가
                    const formattedQuestion = trimmedQuestion
                        .replace(/([①②③④]\))/g, '<br>$1') // 한글 번호 선지 줄바꿈
                        .replace(/([1-4]\))/g, '<br>$1')   // 숫자형 선지 줄바꿈
                        .replace(/([a-d]\))/g, '<br>$1')   // 알파벳 선지 줄바꿈
                        .replace(/\n/g, '<br>');          // 일반 줄바꿈 처리
                    content += `<div class="question-item"><p>${formattedQuestion}</p><br></div>`;
                }
            });

            content += '</div>';
            newWindow.document.write(content); // 새 페이지에 내용 작성
            newWindow.document.close(); // 문서 닫기
        } else {
            newWindow.document.write('<p>유효하지 않은 응답입니다.</p>');
            newWindow.document.close();
        }
    } catch (error) {
        console.error('문제 조회 중 오류 발생:', error);
        alert('문제 조회하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 문제집의 정답을 보여주는 함수
export async function fetchAnswers(problemSetId) {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    try {
        const response = await axios.get(`${BASE_URL}/api/workbook/front/answer/search`, {
            params: { 
                wb_id: problemSetId,
                userId: userId
            }
        });
        console.log('정답 조회 응답:', response.data); // 응답 데이터 로그

        // 새로운 페이지 열기
        const newWindow = window.open("정답 보기", '_blank'); // 새 탭 열기
        if (!newWindow) {
            alert('팝업 차단이 활성화되어 있습니다. 팝업을 허용해 주세요.');
            return;
        }

        // 정답 내용 작성
        if (response && response.data) {
            const workbook = response.data; // 문제집 정보
            const answers = workbook.wb_answer; // 정답 내용

            let content = `<h2 style="font-family: 'Pretendard', sans-serif; text-align: center; margin: 20px;">${workbook.wb_title}</h2>
                               <div class="answer-content" style="font-family: 'Pretendard', sans-serif; margin: 20px;">`;

            if (answers) {
                content += `<p>${answers.replace(/\n/g, '<br>')}</p>`; // 정답 내용을 HTML로 변환(줄 바꿈 등등..)
            } else {
                content += '<p>정답이 없습니다.</p>'; // 정답이 없을 경우 메시지 추가
            }

            content += '</div>';
            newWindow.document.write(content); // 새 페이지에 내용 작성
            newWindow.document.close(); // 문서 닫기
        } else {
            newWindow.document.write('<p>유효하지 않은 응답입니다.</p>');
            newWindow.document.close();
        }
    } catch (error) {
        console.error('정답 조회 중 오류 발생:', error);
        alert('정답을 조회하는 중 오류가 발생했습니다: ' + error.message);
    }
}