const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000'


export async function getCookie(): Promise<string> {


  try {
    const response = await fetch(`${API_BASE_URL}/api/accounts/csrf-token/`, {
      method: 'GET',
      credentials: 'include',
    });

    
    if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
    }
    
    const data = await response.json();
    const csrfToken: string = data.csrfToken;
    console.log("Cookie Response: ", csrfToken);
    
    return csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw error;
  }
}


// export function getCookieFromStore (name: string) {
//     let cookieValue = null;
//     if(document.cookie && document.cookie !== '') {
//         const cookies = document.cookie.split(';');
//         for (let i=0; i<cookies.length; i++) {
//             const cookie = cookies[i].trim();
//             if (cookie.substring(0, name.length + 1)) {
//                 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                 break;
//             }
//         }
//     }
//     return cookieValue;
// }