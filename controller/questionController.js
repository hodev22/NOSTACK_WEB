//import { displayGeneratedQuestions } from '../view/questionView.js'; // 문제 표시 관련 함수 import
// import html2pdf from 'html2pdf.js';
import { SessionManager } from './sessionManager.js';

const BASE_URL = config.BASE_URL;

export async function generateQuestions(text = ocrResult) {
    const apiUrl = `${BASE_URL}/api/workbook/front/processText`;
    const questionGenerationDiv = document.getElementById('question-generation');

    questionGenerationDiv.innerHTML = `
        <div class="loading-message">
            <h2>문제 생성 중...</h2>
            <div class="spinner"></div> 
            <p>잠시만 기다려 주세요.</p>
        </div>
    `;

    try {
        const userId = SessionManager.getUserId();
        if (!userId) {
            console.error('userId를 찾을 수 없습니다.');
            alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
            return;
        }

        const response = await axios.post(apiUrl, 
            { text },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer YOUR_API_KEY`
                },
                params: { userId: userId }
            }
        );

        console.log('문제 생성 응답:', response.data);
        // 문제 생성
        displayGeneratedQuestions(response.data);
        
    } catch (error) {
        console.error('문제 생성 중 오류 발생:', error);
        questionGenerationDiv.innerHTML = '<h2>문제 생성 실패</h2><p>오류가 발생했습니다: ' + error.message + '</p>';
    }
    //console.log('generateQuestions 함수 종료');
    
    // 강제로 generate-section 표시
    const generateSection = document.getElementById('generate-section');
    if (generateSection) {
        generateSection.style.display = 'block';
        //console.log('generate-section 강제 표시');
    } else {
        console.error('generate-section을 찾을 수 없습니다.');
    }
}


// 버튼 생성 함수 (pdf 저장 및 문제 재생성 버튼)
function createButton(label, onClick, customStyle = '') {
    const button = document.createElement('button');
    button.textContent = label;
    button.style = `
        padding: 10px 20px;
        margin: 0 10px;
        font-size: 16px;
        color: #fff;
        background-color: #007bff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        ${customStyle}
    `;
    button.onclick = onClick;
    return button;
}

// HTML 요소 생성
function createDivElement(className, innerHTML = '') {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = innerHTML;
    return div;
}

// 문제 HTML 생성
function generateQuestionsHTML(questions) {
    return questions
        .map((question, index) => {
            const formattedQuestion = question
                .trim()
                .replace(/([①②③④])\s/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;$1 ');
            return `
                <div class="question-item">
                    <h3>문제 ${index + 1}</h3>
                    <p>${formattedQuestion}</p>
                </div>
            `;
        })
        .join('');
}

// 답안 HTML 생성
function generateAnswersHTML(answers) {
    return answers
        .map((answer, index) => {
            const [answerPart, explanationPart] = answer
                .split('**해설:**')
                .map(part => part.trim());
            return `
                <div class="answer-item">
                    <h4>정답 ${index + 1}</h4>
                    <p>${answerPart.replace('**정답:**', '').trim()}</p>
                    ${
                        explanationPart
                            ? `<p><strong>해설:</strong> ${explanationPart}</p>`
                            : ''
                    }
                </div>
            `;
        })
        .join('');
}

// 문제 및 답안 표시
function displayGeneratedQuestions(response) {
    console.log('displayGeneratedQuestions 함수 시작', JSON.stringify(response, null, 2));

    const questionGenerationDiv = document.getElementById('question-generation');
    if (!questionGenerationDiv) {
        console.error('question-generation 요소를 찾을 수 없습니다.');
        return;
    }

    questionGenerationDiv.innerHTML = '<h2>생성된 문제</h2>';

    if (response?.message) {
        const { question: questionText = '', answer: answerText = '' } = response.message;

        const questions = questionText.split(/(\d+\..*?)(?=\n\n|\n*$)/g) || [];
        const answers = answerText.split(/\d+\./).filter(a => a.trim());

        const questionsHTML = generateQuestionsHTML(questions);
        const answersHTML = generateAnswersHTML(answers);

        const contentDiv = createDivElement('question-content', `
            <div class="questions">${questionsHTML}</div>
            <div class="answers">${answersHTML}</div>
        `);

        questionGenerationDiv.appendChild(contentDiv);
        console.log('문제 및 답변 HTML 생성 완료');
    } else {
        questionGenerationDiv.innerHTML += '<p>유효하지 않은 응답입니다.</p>';
    }

    const buttonContainer = createDivElement('button-container');
    buttonContainer.style.textAlign = 'center';
    buttonContainer.style.marginTop = '20px';

    // PDF 저장 버튼
    const savePDFButton = createButton('PDF로 저장', () => { 
        const id = response?.id || Date.now();
        saveToPdf(id);
    });

    // 문제 재생성 버튼
    const regenerateButton = createButton('문제 재생성', regenerateQuestions);

    buttonContainer.appendChild(savePDFButton);
    buttonContainer.appendChild(regenerateButton);
    questionGenerationDiv.appendChild(buttonContainer);

    console.log('displayGeneratedQuestions 함수 종료');
}


// PDF 저장 함수 추가
export function saveToPdf(id) {
    const element = document.getElementById('question-generation');
    if (!element) {
        console.error('PDF 저장 대상 요소를 찾을 수 없습니다.');
        return;
    }

    const opt = {
        margin: 10,
        filename: `문제집 ${id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // PDF 생성 및 저장
    html2pdf()
        .set(opt)
        .from(element)
        .save()
        .catch(error => {
            console.error('PDF 저장 중 오류 발생:', error);
        });
}

// 문제 재생성 함수 
export async function regenerateQuestions() {
    //문제 재생성 표시할 요소 불러오기
    const questionGenerationDiv = document.getElementById('question-generation');
    if(!questionGenerationDiv) {
        console.error('문제 생성 요소를 찾을 수 없습니다.');
        return;
    }

    try {
        //userId 가져오기
        const userId = getUserIdOption();

        // 로딩 메시지와 스피너 표시
        renderLoadingMessage(questionGenerationDiv);

        // 문제 재생성 api 호출
        const response = await fetchRegenerateQuestions(userId);

        // 응답 확인 및 처리
        handleRegenerationResponse(response, questionGenerationDiv);
    } catch (error) {
        handleRegenerationError(error, questionGenerationDiv);
    }
}

    // userId 가져오는 함수
    function getUserIdOption() {
        try {
            const userId = SessionManager.getUserId();
            if (!userId) {
                console.warn('userId를 찾을 수 없습니다. userId 없이 진행합니다.');
                return null; // userId가 없어도 null 반환
            }
            return userId;
        } catch (error) {
            console.error('userId 가져오는 중 오류 발생:', error);
            return null; // 오류 발생 시 null 반환
        }
    }

    // 로딩 메시지, 스피너 함수
    function renderLoadingMessage(targetElement) {
        renderLoadingMessage.innerHTML = `
            <div class="loading-message">
                <h2>문제 생성 중...</h2>
                <div class="spinner"></div> 
                <p>잠시만 기다려 주세요.</p>
            </div>
        `;
    }

    //문제 재생성 api 호출 함수
    async function fetchRegenerateQuestions(userId) {
        const apiUrl = `${BASE_URL}/api/workbook/front/retext`;
        const params = userId ? { userId: userId } : {}; 
    
        return axios.post(
            apiUrl,
            {}, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                },
                params: { userId: userId }
            }
        );
    }

    //응답 처리 함수
    function handleRegenerationResponse(response, targetElement) {
        if (response && response.data) {
            console.log('문제 재생성 응답:', response.data);
            
            // 문제와 정답을 displayGeneratedQuestions 함수에 전달
            displayGeneratedQuestions(response.data);
        } else {
            alert('문제 재생성 중 오류가 발생했습니다. 유효한 응답이 아닙니다.');
        }
    }

    //오류 처리 함수
    function handleRegenerationError(error, targetElement) {
        console.error('문제 재생성 API 호출 중 오류 발생:', error);
        targetElement.innerHTML = `<p>문제 재생성 중 오류가 발생했습니다: ${error.message}</p>`;
        alert('문제 재생성 중 오류가 발생했습니다: ' + error.message);
    }