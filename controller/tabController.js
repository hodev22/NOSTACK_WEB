export function activateTab(tab, sectionId) {
    console.log(`탭 활성화: ${sectionId}`);
    deactivateAllTabs(); // 모든 탭 비활성화
    tab.classList.add('active');
    activateTabContent(sectionId); // 특정 탭 콘텐츠 활성화
}

function deactivateAllTabs() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); // 모든 탭에서 active 클래스 제거
}

function activateTabContent(sectionId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none'; // 모든 탭 콘텐츠 숨김
    });
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
        activeSection.style.display = 'block'; // 특정 탭 콘텐츠 표시
        activeSection.style.width = '100%';
        activeSection.style.minHeight = '500px';
    } else {
        console.error(`${sectionId}-section 요소를 찾을 수 없습니다.`);
    }
}