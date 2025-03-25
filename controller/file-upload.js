let worker = null;
const BASE_URL = config.BASE_URL; 
const problemGenerationApiUrl = `${BASE_URL}/api/workbook/front/processText`; // 문제 생성 API URL

let ocrResult = ''; // OCR 결과 초기화

// Google Cloud Vision API 설정
const OCR_apikey = config.OCR_apikey;  // Google Cloud Vision API 키
const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${OCR_apikey}`;

// PDF.js 설정
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// performOCR 함수 수정 (이미지 데이터를 API 요청으로 전달)
async function performOCR(base64Image) {
    return new Promise(async (resolve, reject) => {
        try {
            // 요청 데이터 설정
            const requestBody = {
                requests: [
                    {
                        image: { content: base64Image },  // Base64 이미지를 올바르게 전송
                        features: [{ type: 'TEXT_DETECTION' }],  // 텍스트 감지 기능 명시
                        imageContext: { languageHints: ['ko', 'lo', 'eng'] }
                    }
                ]
            };

            // 콘솔에 요청 본문 출력 (디버깅용)
            console.log('Request Body:', JSON.stringify(requestBody)); // 요청 데이터 확인

            // API 요청
            const response = await fetch(visionApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // API 응답 처리
            const data = await response.json();
            if (data.responses && data.responses[0].fullTextAnnotation) {
                const text = data.responses[0].fullTextAnnotation.text;
                resolve(text);  // 텍스트 추출 성공
            } else {
                console.error('OCR 실패, 응답 데이터:', data);  // 실패 시 응답 데이터 출력
                reject(new Error('텍스트를 감지하지 못했습니다.'));
            }
        } catch (error) {
            console.error('OCR 처리 중 오류 발생:', error);
            reject(new Error('OCR 처리 중 오류가 발생했습니다.'));
        }
    });
}


// 이미지 파일을 Base64로 변환하는 함수
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Base64 문자열 반환
        reader.onerror = reject;
        reader.readAsDataURL(file); // 파일을 Base64로 변환
    });
}

// PDF 파일 처리 함수
async function processPDF(file) {
    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        // 캔버스를 Base64로 변환 후 OCR 처리
        const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]; // Base64로 변환
        try {
            const text = await performOCR(base64Image); // Base64로 전달
            ocrResult += text.trim() + '\n\n';
        } catch (error) {
            console.error(`PDF 페이지 OCR 처리 중 오류 발생 (페이지 ${pageNum}):`, error);
            ocrResult += `페이지 ${pageNum} 처리 중 오류 발생: ${error.message}\n\n`;
        }
    }
}

// 이미지 파일 처리 함수
async function handleImageFile(file) {
    const base64Image = await convertFileToBase64(file); // 이미지 파일을 Base64로 변환
    try {
        const text = await performOCR(base64Image); // Base64로 OCR 수행
        ocrResult += text.trim() + '\n\n'; // OCR 결과 추가
    } catch (error) {
        console.error(`이미지 OCR 처리 중 오류 발생:`, error);
        ocrResult += `이미지 OCR 처리 중 오류 발생: ${error.message}\n\n`;
    }
}

// 파일 업로드 완료 버튼 클릭 이벤트
document.getElementById('upload-complete-btn').addEventListener('click', async () => {
    const files = document.getElementById('file-upload').files;
    if (files.length === 0) {
        alert('업로드할 파일을 선택해 주세요.');
        return;
    }

    // 로딩 표시
    displayOCRResult("OCR 처리 중... 조금만 기다려 주세요!");

    // OCR 결과 초기화
    ocrResult = ''; // 이전 결과 초기화

    // 각 파일에 대해 OCR 처리
    for (let file of files) {
        if (file.type === 'application/pdf') {
            await processPDF(file); // PDF 파일 처리
        } else if (file.type.startsWith('image/')) {
            await handleImageFile(file); // 이미지 파일 처리
        } else {
            alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
        }
    }

    // OCR 결과 표시
    document.getElementById('ocr-result').textContent = ocrResult;
    activateTab(document.querySelector('.tab[onclick*="convert"]'), 'convert');

    // 문제 생성 버튼 추가
    let existingButton = document.getElementById('generate-button');
    if (!existingButton) {
        const generateButton = document.createElement('button');
        generateButton.id = 'generate-button'; // 버튼 ID 추가
        generateButton.textContent = '문제 생성';
        generateButton.onclick = function() {
            // 문제 생성 탭으로 이동
            activateTab(document.querySelector('.tab[onclick*="generate"]'), 'generate');
            generateQuestions(ocrResult); // 문제 생성 함수 호출
        };

        // ocr-result-box 바깥에 버튼 추가
        const resultBox = document.getElementById('ocr-result-box'); // ocr-result-box 요소 선택
        resultBox.parentNode.appendChild(generateButton); // 버튼을 박스 바깥으로 이동
    }
});


// 문제 생성 함수
async function generateQuestions(text = ocrResult) {
    //console.log('generateQuestions 함수 시작');
    const apiUrl = `${BASE_URL}/api/workbook/front/processText`;
    const questionGenerationDiv = document.getElementById('question-generation');

    // 로딩 메시지와 스피너 표시
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

// 생성된 문제 표시 함수
function displayGeneratedQuestions(response) {
    console.log('displayGeneratedQuestions 함수 시작', JSON.stringify(response, null, 2));
    const questionGenerationDiv = document.getElementById('question-generation');
    if (!questionGenerationDiv) {
        console.error('question-generation 요소를 찾을 수 없습니다.');
        return;
    }
    
    questionGenerationDiv.innerHTML = '<h2>생성된 문제</h2>';

    if (response && response.message) {
        console.log('응답 데이터 처리 시작');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'question-content';

        const questionsDiv = document.createElement('div');
        questionsDiv.className = 'questions';

        const answersDiv = document.createElement('div');
        answersDiv.className = 'answers';

        const questionText = response.message.question || '';
        const answerText = response.message.answer || '';

        // 문제와 해설을 번호로 분리
        const questions = questionText.split(/(\d+\..*?)(?=\n\n|\n*$)/g) || [];
        const answers = answerText.split(/\d+\./).filter(a => a.trim());

        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            
            // 선지를 새로운 줄로 정렬하고 들여쓰기 추가
            const formattedQuestion = question.trim().replace(/([①②③④])\s/g, '<br>&nbsp;&nbsp;&nbsp;&nbsp;$1 '); // 선지 번호에 맞춰 줄바꿈 추가
            
            questionDiv.innerHTML = `<h3>문제</h3><p>${formattedQuestion}</p>`;
            questionsDiv.appendChild(questionDiv);
        });

        answers.forEach((answer, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-item';
            
            // 답과 해설 분리
            const answerParts = answer.split('**해설:**');
            const answerPart = answerParts[0].replace('**정답:**', '').trim();
            const explanationPart = answerParts[1] ? answerParts[1].trim() : '';
            
            answerDiv.innerHTML = `
                <h4>정답 ${index + 1}</h4>
                <p>${answerPart}</p>
                ${explanationPart ? `<p><strong>해설:</strong> ${explanationPart}</p>` : ''}
            `;
            
            answersDiv.appendChild(answerDiv);
        });

        contentDiv.appendChild(questionsDiv);
        contentDiv.appendChild(answersDiv);
        questionGenerationDiv.appendChild(contentDiv);

        console.log('문제 및 답변 HTML 생성 완료');
    } else {
        console.log('유효하지 않은 응답');
        questionGenerationDiv.innerHTML += '<p>유효하지 않은 응답입니다.</p>';
    }

    console.log('displayGeneratedQuestions 함수 종료');

    // 버튼 담을 컨테이너 생성
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    // 버튼 컨테이너 스타일 수정
    buttonContainer.style.textAlign = 'center';
    buttonContainer.style.marginTop = '20px';

    // PDF 저장 버튼 추가
    const savePDFButton = document.createElement('button');
    savePDFButton.textContent = 'PDF로 저장';
    savePDFButton.onclick = () => {
        // response.id가 없으면 현재 시간을 사용
        const id = response.id || Date.now();
        saveToPdf(id);
    };
    buttonContainer.appendChild(savePDFButton);

    // 문제 재생성 버튼 추가
    const regenerateButton = document.createElement('button');
    regenerateButton.textContent = '문제 재생성';
    regenerateButton.onclick = regenerateQuestions;
    buttonContainer.appendChild(regenerateButton);

    // 버튼 스타일 수정
    const buttonStyle = 'padding: 10px 20px; margin: 0 10px; font-size: 16px; color: #fff; background-color: #007bff; border: none; border-radius: 5px; cursor: pointer;';
    savePDFButton.style = buttonStyle;
    regenerateButton.style = buttonStyle;

    // 버튼 컨테이너를 questionGenerationDiv에 추가
    questionGenerationDiv.appendChild(buttonContainer);
}

// PDF 저장 함수 추가
function saveToPdf(id) {
    const element = document.getElementById('question-generation');
    const opt = {
        margin: 10,
        filename: `문제집 ${id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
}

// 문제 재생성 함수 
async function regenerateQuestions() {
    // 쿠키에서 userId 가져옴
    const userIdString = SessionManager.getUserId();
    if (!userIdString) {
        console.error('userId를 찾을 수 없습니다.');
        alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
        return;
    }

    const userId = parseInt(userIdString, 10);
    if (isNaN(userId)) {
        console.error('유효하지 않은 userId입니다.');
        alert('유효하지 않은 사용자 정보입니다. 다시 로그인해 주세요.');
        return;
    }

    const questionGenerationDiv = document.getElementById('question-generation')

    // 로딩 메시지와 스피너 표시
    questionGenerationDiv.innerHTML = `
        <div class="loading-message">
            <h2>문제 생성 중...</h2>
            <div class="spinner"></div> 
            <p>잠시만 기다려 주세요.</p>
        </div>
    `;

    try {
        const response = await axios.post(`${BASE_URL}/api/workbook/front/retext`, 
            {}, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                },
                params: { userId: userId }
            }
        );

        if (response && response.data) {
            console.log('문제 재생성 응답:', response.data);
            
            // 문제와 정답을 displayGeneratedQuestions 함수에 전달
            displayGeneratedQuestions(response.data);
        } else {
            alert('문제 재생성 중 오류가 발생했습니다. 유효한 응답이 아닙니다.');
        }
    } catch (error) {
        console.error('문제 재생성 API 호출 중 오류 발생:', error);
        alert('문제 재생성 중 오류가 발생했습니다: ' + error.message);
    }
}


function createQuestionElement(question, answer, index) {
    const questionElement = document.createElement('div');
    questionElement.className = 'question';
    
    questionElement.innerHTML = `
        <h3>문제 ${index + 1}</h3>
        <div class="question-content">
            <div class="question-text">
                <p>${question}</p>
            </div>
            <div class="question-answer">
                <p><strong>정답:</strong> ${answer}</p>
            </div>
        </div>
    `;
    return questionElement;
}

// 탭 전환 함수 수정
function activateTab(tab, sectionId) {
    console.log(`탭 활성화: ${sectionId}`);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const activeSection = document.getElementById(sectionId + '-section');
    if (activeSection) {
        activeSection.style.display = 'block';
        activeSection.style.width = '100%';
        activeSection.style.minHeight = '500px';
        
    } else {
        console.error(`${sectionId}-section 요소를 찾을 수 없습니다.`);
    }

    // 'generate' 탭 활성화 시 자동으로 문제 생성하지 않도록 수정
    if (sectionId === 'generate') {
        const questionGenerationDiv = document.getElementById('question-generation');
        if (questionGenerationDiv && questionGenerationDiv.innerHTML.trim() === '') {
            questionGenerationDiv.innerHTML = '<p>문제 생성 버튼을 클릭하여 문제를 생성하세요.</p>';
        }
    }
}

function displayOCRResult(text) {
    const resultDiv = document.getElementById('ocr-result');
    if (resultDiv) {
        resultDiv.textContent = text;
    } else {
        console.error('OCR result div not found.');
    }
}

function displayUploadedFiles() {
    const input = document.getElementById('file-upload');
    const output = document.getElementById('uploaded-files');
    output.innerHTML = '';

    if (input && output) {
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const fileItem = document.createElement('div');
            fileItem.textContent = file.name;
            output.appendChild(fileItem);
        }
        output.style.display = 'block';
    } else {
        console.error('Input or output element not found.');
    }
}

async function processFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const img = new Image();
                img.src = e.target.result;
                img.onload = async function() {
                    try {
                        const result = await worker.recognize(img);
                        if (result && result.data && result.data.text) {
                            resolve(result.data.text);
                        } else {
                            throw new Error('OCR 결과를 찾을 수 없습니다.');
                        }
                    } catch (error) {
                        console.error('OCR 처리 중 오류 발생:', error);
                        reject(error);
                    }
                };
                img.onerror = function() {
                    reject(new Error('이미지 로딩 중 오류 발생'));
                };
            } catch (error) {
                console.error('OCR 처리 중 오류 발생:', error);
                reject(error);
            }
        };
        reader.onerror = function() {
            reject(new Error('파일 읽기 중 오류 발생'));
        };
        reader.readAsDataURL(file);
    });
}

// 쿠키에서 useId 가져오기
const SessionManager = {
    getUserId() {
        return getCookie('userId');
    },
};

// getCookie 함수 수정
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    console.log('getCookie called for:', name);
    console.log('Cookie value:', value);
    console.log('Parts:', parts);
    if (parts.length === 2) {
        const result = parts.pop().split(';').shift();
        console.log('Cookie result:', result);
        return result;
    }
    console.log('Cookie not found');
    return null;
}

async function generateProblems(text) {
    try {
        // userId를 쿠키에서 가져옵니다.
        const userIdString = SessionManager.getUserId();
        if (!userIdString) {
            console.error('userId를 찾을 수 없습니다.');
            alert('로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
            return;
        }

        // userId를 정수로 변환합니다.
        const userId = parseInt(userIdString, 10);
        if (isNaN(userId)) {
            console.error('유효하지 않은 userId입니다.');
            alert('유효하지 않은 사용자 정보입니다. 다시 로그인해 주세요.');
            return;
        }

        const response = await axios.post(`${BASE_URL}/api/workbook/front/processText`, 
            { text }, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                },
                params: { userId: userId } // Request-Query에 userId를 int 형식으로 추가
            }
        );

        // 응답 데이터 처리
        console.log('문제 생성 응답:', response.data);
        const generateSection = document.getElementById('generate-section');
        if (generateSection) {
            generateSection.textContent = JSON.stringify(response.data, null, 2); // 응답 데이터 표시
        }
    } catch (error) {
        console.error('문제 생성 API 호출 중 오류 발생:', error);
        alert('문제 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

// completeUpload 함수 추가
async function completeUpload() {
    const files = document.getElementById('file-upload').files;
    if (files.length === 0) {
        alert('업로드할 파일을 선택해 주세요.');
        return;
    }

    // 로딩 표시
    displayOCRResult("OCR 처리 중... 조금만 기다려 주세요!");

    try {
        for (let i = 0; i < files.length; i++) {
            const text = await performOCR(files[i]);
            ocrResult += text + '\n\n';
        }
        displayOCRResult(ocrResult);
        activateTab(document.querySelector('.tab[onclick*="convert"]'), 'convert');
    } catch (error) {
        console.error('OCR 처리 중 오류 발생:', error);
        displayOCRResult("OCR 처리 중 오류가 생했습니다.");
    }
}

window.onload = async function() {
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
}

// 로그아웃 함수
async function logout() {
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
}

// 페이지 로드 시 내비게이션 바 업데이트
document.addEventListener('DOMContentLoaded', updateNavbar);

// 문제집 목록 조회 함수
async function fetchProblemSets() {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    try {
        const response = await axios.get(`${BASE_URL}/api/workbook/front/all`, {
            params: { userId: userId } // userId 쿼리 파라미터로 추가
        });

        // 응답 데이터가 배열인지 확인
        console.log('문제집 조회 응답:', response.data); // 응답 데이터 로그
        if (Array.isArray(response.data.data)) {
            favoriteStatus = {}; // 즐겨찾기 상태 초기화
            // 로컬 스토리지에서 즐겨찾기 상태 불러오기
            const savedFavorites = JSON.parse(localStorage.getItem('favoriteStatus')) || {};

             // 문제집을 wb_id 기준으로 내림차순으로 정렬
             const sortedProblemSets = response.data.data.sort((a, b) => b.wb_id - a.wb_id);

            // 문제집 번호를 유지하면서 위치만 변경
            const numberedProblemSets = sortedProblemSets.map((set, index) => ({
                ...set,
                displayIndex: index + 1 // 1부터 시작하는 인덱스
            }));

            displayProblemSets(numberedProblemSets, savedFavorites); // 문제집 목록 표시
        } else {
            console.error('응답 데이터가 배열이 아닙니다:', response.data);
            alert('문제집을 조회하는 중 오류가 발생했습니다. 유효한 데이터가 아닙니다.');
        }
    } catch (error) {
        console.error('문제집 조회 중 오류 발생:', error);
        alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
    }
}

// 문제집을 화면에 표시하는 함수
function displayProblemSets(problemSets, savedFavorites) {
    const problemListDiv = document.getElementById('problem-list');
    problemListDiv.innerHTML = ''; // 기존 내용 초기화

    if (problemSets.length === 0) {
        problemListDiv.innerHTML = '<p>저장된 문제집이 없습니다.</p>';
        return;
    }

    problemSets.forEach((set) => {
        const setDiv = document.createElement('div');
        setDiv.className = 'problem-set';
        favoriteStatus[set.wb_id] = savedFavorites[set.wb_id] !== undefined ? savedFavorites[set.wb_id] : set.isFavorite; // 로컬 스토리지에서 상태 불러오기

        setDiv.innerHTML = `
            <h3>${set.wb_title} : ${set.wb_create} 생성</h3>
            <button class="viewProblems" onclick="viewProblems(${set.wb_id})">문제 보기</button>
            <button class="viewAnswers" onclick="viewAnswers(${set.wb_id})">정답 보기</button>
            <button class="toggleFavorite" onclick="toggleFavorite(${set.wb_id}, this)">
                <i class="fas ${favoriteStatus[set.wb_id] ? 'fa-star' : 'fa-star-half-alt'}"></i>
            </button>
        `;
        problemListDiv.appendChild(setDiv);
    });
}

// 문제집의 문제를 보여주는 함수
async function viewProblems(problemSetId) {
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
        const newWindow = window.open('문제 조회 페이지', '_blank'); // 새 탭 열기
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

// 문제 데이터 배열
let problems = [];

// 문제를 API에서 가져오는 함수 (예시)
async function fetchProblems() {
    // API 호출 로직 추가
    const response = await axios.get('API_URL'); // 실제 API URL로 변경
    problems = response.data; // API 응답을 문제 배열에 저장
}

// 정답과 해설을 가져오는 함수
function getAnswerForProblem(index) {
    // 문제 배열에서 정답을 가져옵니다.
    return problems[index]?.answer || "정답 없음"; // 정답이 없을 경우 기본값
}

function getExplanationForProblem(index) {
    // 문제 배열에서 해설을 가져옵니다.
    return problems[index]?.explanation || "해설 없음"; // 해설이 없을 경우 기본값
}

// 정답 표시 초기화 함수
function clearAnswers() {
    const answersDisplayDiv = document.getElementById('answers-display'); // 정답을 표시할 div의 ID
    if (answersDisplayDiv) {
        answersDisplayDiv.innerHTML = ''; // 정답 내용 초기화
    } else {
        console.error('정답 표시 div를 찾을 수 없습니다.');
    }
}

// 문제집의 정답을 보여주는 함수
async function viewAnswers(problemSetId) {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    try {
        const response = await axios.get(`${BASE_URL}/api/workbook/front/answer/search`, {
            params: { 
                wb_id: problemSetId,
                userId: userId
            }
        });
        //console.log('정답 조회 응답:', response.data); // 응답 데이터 로그

        // 새로운 페이지 열기
        const newWindow = window.open('', '_blank'); // 새 탭 열기
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

// 문제를 화면에 표시하는 함수
function displayProblems(problems) {
    const problemDisplayDiv = document.getElementById('problem-display');
    problemDisplayDiv.innerHTML = ''; // 기존 내용 초기화

    if (!problems || !Array.isArray(problems)) {
        console.error('문제 배열이 유효하지 않습니다.');
        return; // 문제가 유효하지 않으면 함수 종료
    }

    problems.forEach((problem, index) => {
        const problemDiv = document.createElement('div');
        problemDiv.className = 'problem-item';
        
        // 문제와 정답, 해설을 올바르게 표시
        problemDiv.innerHTML = `
            <h4>문제 ${index + 1}</h4>
            <p>${problem.question || '문제가 없습니다.'}</p>
            <p><strong>정답:</strong> ${problem.answer || '정답 없음'}</p>
            <p><strong>해설:</strong> ${problem.explanation || '해설 없음'}</p>
        `;
        problemDisplayDiv.appendChild(problemDiv);
    });
}

// 즐겨찾기 토글 함수
async function toggleFavorite(problemSetId, button) {
    const userId = SessionManager.getUserId(); // userId를 세션에서 가져옴
    if (!userId) {
        alert('로그인 정보가 없습니다. 다시 로그인해 주세요.');
        return;
    }

    try {
        const response = await axios.patch(`${BASE_URL}/api/workbook/front/favorite`, null, {
            params: {
                wb_id: problemSetId, // 문제집 ID
                userId: userId // 사용자 ID
            }
        });
        console.log(response.data);
        alert(response.data.message);

        // 클라이언트 측 상태 업데이트
        favoriteStatus[problemSetId] = !favoriteStatus[problemSetId]; // 상태 반전

        // 아이콘 업데이트
        const icon = button.querySelector('i');
        if (favoriteStatus[problemSetId]) {
            icon.classList.remove('fa-star-half-alt');
            icon.classList.add('fa-star'); // 채워진 별
        } else {
            icon.classList.remove('fa-star');
            icon.classList.add('fa-star-half-alt'); // 비어 있는 별
        }

        // 로컬 스토리지에 즐겨찾기 상태 저장
        localStorage.setItem('favoriteStatus', JSON.stringify(favoriteStatus));
    } catch (error) {
        console.error('즐겨찾기 토글 중 오류 발생:', error);
        alert('즐겨찾기 설정 중 오류가 발생했습니다: ' + error.message);
    }
}