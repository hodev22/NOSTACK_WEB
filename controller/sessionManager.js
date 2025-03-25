// controller/sessionManager.js
export const SessionManager = {
    getUserId() {
        return getCookie('userId');
    },
};

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    // console.log('getCookie called for:', name);
    // console.log('Cookie value:', value);
    // console.log('Parts:', parts);
    if (parts.length === 2) {
        const result = parts.pop().split(';').shift();
        console.log('Cookie result:', result);
        return result;
    }
    console.log('Cookie not found');
    return null;
}