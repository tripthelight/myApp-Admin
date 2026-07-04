import { authFetch } from "../auth/authFetch.js";
import { clearTokens, getRefreshToken, saveTokens } from "../auth/tokenStorage.js";

const MEMBER_API_BASE_URL = "/member";
const BOARD_API_BASE_URL = "/board";

async function handleJsonResponse(response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP Error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function loginAdmin({ username, password }) {
  const response = await fetch(`${MEMBER_API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const tokenResponse = await handleJsonResponse(response);
  saveTokens(tokenResponse.accessToken, tokenResponse.refreshToken);

  return tokenResponse;
}

export async function logoutAdmin() {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    await fetch(`${MEMBER_API_BASE_URL}/jwt/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });
  }

  clearTokens();
}

export async function getAdminSummary() {
  const response = await authFetch(`${MEMBER_API_BASE_URL}/admin/summary`, {
    method: "GET",
  });

  return handleJsonResponse(response);
}

export async function getAdminUsers() {
  const response = await authFetch(`${MEMBER_API_BASE_URL}/admin/users`, {
    method: "GET",
  });

  return handleJsonResponse(response);
}

export async function getBoards() {
  const response = await authFetch(`${BOARD_API_BASE_URL}/list`, {
    method: "GET",
  });

  return handleJsonResponse(response);
}
