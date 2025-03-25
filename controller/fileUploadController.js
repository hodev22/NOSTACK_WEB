import { displayOCRResult } from '../view/Ocr/ocrView.js';
import { activateTab } from './tabController.js';
import { processPDF, handleImageFile } from '../controller/ocrController.js'; // 파일 처리 유틸리티
import { SessionManager } from './sessionManager.js'; // 세션 관리
import { generateQuestions } from './questionController.js'; // 문제 생성 함수 가져오기
import { loadFavoriteStatus } from './favoriteController.js'; // 즐겨찾기 함수 가져오기


const BASE_URL = config.BASE_URL;

export async function completeUpload() {
    const files = document.getElementById('file-upload').files;
    if (files.length === 0) {
        alert('업로드할 파일을 선택해 주세요.');
        return;
    }

    displayOCRResult("OCR 처리 중... 조금만 기다려 주세요!");

    const ocrResult = await processFiles(files); // 파일 처리 함수 호출

    // OCR 결과 표시
    document.getElementById('ocr-result').textContent = ocrResult || 'OCR 결과가 없습니다.'; // 결과가 없을 경우 메시지 표시
    activateTab(document.querySelector('.tab[onclick*="convert"]'), 'convert');

    // 문제 생성 버튼 추가
    addGenerateButton(ocrResult); // 문제 생성 버튼 추가 함수 호출
}

// 파일 처리 함수
async function processFiles(files) {
    let ocrResult = ''; // 이전 결과 초기화

    for (let file of files) {
        ocrResult += await processFile(file); // 파일 처리
    }

    return ocrResult; // 최종 결과 반환
}

// 개별 파일 처리 함수(이미지, pdf 파일 처리)
async function processFile(file) {
    if (file.type === 'application/pdf') {
        return await processPDF(file); // PDF 파일 처리
    } else if (file.type.startsWith('image/')) {
        return await handleImageFile(file); // 이미지 파일 처리
    } else {
        alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
        return ''; // 지원하지 않는 파일 형식일 경우 빈 문자열 반환
    }
}

// 문제 생성 버튼 추가 함수
function addGenerateButton(ocrResult) {
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
}

export function displayUploadedFiles() {
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

// 문제집 목록 조회 함수
export async function fetchProblemSets() {
    try {
        const userId = getUserId(); // userId 가져오기
        const response = await fetchAllProblemSets(userId); // API 호출
        
        if (Array.isArray(response?.data?.data)) {
            processAndDisplayProblemSets(response.data.data); // 문제집 처리 및 표시
        } else {
            throw new Error('유효하지 않은 데이터 형식입니다.');
        }
    } catch (error) {
        handleProblemSetsError(error); // 오류 처리
    }
}

// userId 가져오는 함수
function getUserId() {
    const userId = SessionManager.getUserId();
    if (!userId) {
        throw new Error('userId를 찾을 수 없습니다. 다시 로그인해 주세요.');
    }
    return userId;
}

// 문제집 API 호출 함수
async function fetchAllProblemSets(userId) {
    const apiUrl = `${BASE_URL}/api/workbook/front/all`;
    return axios.get(apiUrl, { params: { userId } });
}

// 문제집 처리 및 표시 함수
function processAndDisplayProblemSets(problemSets) {
    const savedFavorites = loadFavoriteStatus(); // 즐겨찾기 상태 불러오기

    // 문제집 정렬 및 번호 부여
    const numberedProblemSets = problemSets
        .sort((a, b) => b.wb_id - a.wb_id) // wb_id 기준 내림차순 정렬
        .map((set, index) => ({
            ...set,
            displayIndex: index + 1 // 1부터 시작하는 인덱스 부여
        }));

    displayProblemSets(numberedProblemSets, savedFavorites); // 문제집 표시
}

// 문제집을 화면에 표시하는 함수
function displayProblemSets(problemSets, favoriteStatus) {
    const problemListDiv = document.getElementById('problem-list');
    problemListDiv.innerHTML = ''; // 기존 내용 초기화

    if (problemSets.length === 0) {
        problemListDiv.innerHTML = '<p>저장된 문제집이 없습니다.</p>';
        return;
    }

    problemSets.forEach((set) => {
        const setDiv = document.createElement('div');
        setDiv.className = 'problem-set'; // CSS 클래스 추가
        setDiv.innerHTML = `
            <div class="id-and-favorite">
                <h2>${set.wb_title}
                <button class="toggleFavorite">
                    <img src="/assets/img/${favoriteStatus[set.wb_id] ? 'star-filled' : 'star-empty'}.png" 
                         alt="즐겨찾기" 
                         class="star-icon">
                </button>
                </h2>
            </div>
            <h3>${set.wb_create} 생성</h3> 
            <div class="workbook-button">
                <button class="viewProblems" data-id="${set.wb_id}">문제집</button>
                <button class="viewAnswers" data-id="${set.wb_id}">답안지</button>
            </div>
        `;

        // 즐겨찾기 버튼 이벤트 리스너 추가
        setDiv.querySelector('.toggleFavorite').addEventListener('click', () => {
            toggleFavorite(set.wb_id, setDiv.querySelector('.toggleFavorite'));
        });

        // 문제집 및 답안지 버튼 이벤트 리스너 추가
        setDiv.querySelector('.viewProblems').addEventListener('click', () => window.viewProblems(set.wb_id));
        setDiv.querySelector('.viewAnswers').addEventListener('click', () => window.viewAnswers(set.wb_id));

        problemListDiv.appendChild(setDiv);
    });
}

// 오류 처리 함수
function handleProblemSetsError(error) {
    console.error('문제집 조회 중 오류 발생:', error);
    alert('문제집 조회 중 오류가 발생했습니다. 다시 로그인해 주세요.');
}