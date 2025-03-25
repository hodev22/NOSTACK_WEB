// Google Cloud Vision API 설정
const OCR_apikey = config.OCR_apikey;  // Google Cloud Vision API 키
const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${OCR_apikey}`;

// performOCR 함수 리팩 완 (이미지 데이터를 API 요청으로 전달)
export async function performOCR(base64Image) {
    const requestBody = {
        requests: [
            {
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION' }],
                imageContext: { languageHints: ['ko', 'lo', 'eng'] }
            }
        ]
    };

    try {
        const response = await fetch(visionApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.responses && data.responses[0].fullTextAnnotation) {
            return data.responses[0].fullTextAnnotation.text; // 텍스트 반환
        } else {
            throw new Error('텍스트를 감지하지 못했습니다.');
        }
    } catch (error) {
        throw new Error('OCR 처리 중 오류가 발생했습니다: ' + error.message);
    }
}


// 이미지 파일을 Base64로 변환하는 함수
export function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Base64 문자열 반환
        reader.onerror = reject;
        reader.readAsDataURL(file); // 파일을 Base64로 변환
    });
}

// PDF 파일 처리 함수
export async function processPDF(file) {
    console.log('Processing PDF:', file.name);
    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let ocrResult = ''; // OCR 결과 초기화

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = await createCanvasForPage(page); // async로 호출하여 캔버스 가져오기

        // 캔버스를 Base64로 변환 후 OCR 처리
        const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]; // Base64로 변환
        try {
            const text = await performOCR(base64Image); // Base64로 전달
            ocrResult += text.trim() + '\n\n'; // OCR 결과 누적
        } catch (error) {
            console.error(`PDF 페이지 OCR 처리 중 오류 발생 (페이지 ${pageNum}):`, error);
            ocrResult += `페이지 ${pageNum} 처리 중 오류 발생: ${error.message}\n\n`;
        }
    }

    console.log('OCR Result:', ocrResult);
    return ocrResult; // 최종 OCR 결과 반환
}

// 페이지에 대한 캔버스를 생성(pdf 페이지를 렌더링 하기 위해 html의 canvas 요소를 사용)하는 함수)
export async function createCanvasForPage(page) {
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise; // await 사용 가능

    return canvas;
}

// 이미지 파일 처리 함수
export async function handleImageFile(file) {
    console.log('Handling image file:', file.name);
    const base64Image = await convertFileToBase64(file); // 이미지 파일을 Base64로 변환
    try {
        const text = await performOCR(base64Image); // Base64로 OCR 수행
        console.log('OCR Result:', text);
        return text.trim() + '\n\n'; // OCR 결과 반환
    } catch (error) {
        console.error(`이미지 OCR 처리 중 오류 발생:`, error);
        return `이미지 OCR 처리 중 오류 발생: ${error.message}\n\n`; // 오류 메시지 반환
    }
}