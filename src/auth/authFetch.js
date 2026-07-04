import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./tokenStorage.js";

const MEMBER_API_BASE_URL = "/member";

function isJwtLike(token) {
  return Boolean(token && token.split(".").length === 3);
}

function decodeJwtPayload(token) {
  const payloadBase64Url = token.split(".")[1];
  const payloadBase64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayloadBase64 = payloadBase64.padEnd(
    payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
    "="
  );

  return JSON.parse(atob(paddedPayloadBase64));
}

export function getCurrentTokenPayload() {
  const accessToken = getAccessToken();

  if (!isJwtLike(accessToken)) {
    return null;
  }

  try {
    return decodeJwtPayload(accessToken);
  } catch (error) {
    return null;
  }
}

function isJwtExpired(token) {
  if (!isJwtLike(token)) {
    return true;
  }

  try {
    const payload = decodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);

    return !payload.exp || payload.exp <= now;
  } catch (error) {
    return true;
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Refresh token does not exist.");
  }

  const response = await fetch(`${MEMBER_API_BASE_URL}/jwt/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Refresh token failed.");
  }

  const data = await response.json();

  if (!data.accessToken) {
    throw new Error("Access token does not exist in refresh response.");
  }

  setAccessToken(data.accessToken);

  return data.accessToken;
}

async function getValidAccessToken() {
  const accessToken = getAccessToken();

  if (!accessToken || isJwtExpired(accessToken)) {
    return refreshAccessToken();
  }

  return accessToken;
}

function createAuthHeaders(originalHeaders, accessToken) {
  const headers = new Headers(originalHeaders || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export async function authFetch(url, options = {}) {
  try {
    const accessToken = await getValidAccessToken();
    const response = await fetch(url, {
      ...options,
      headers: createAuthHeaders(options.headers, accessToken),
    });

    if (response.status !== 401) {
      return response;
    }

    const newAccessToken = await refreshAccessToken();

    return fetch(url, {
      ...options,
      headers: createAuthHeaders(options.headers, newAccessToken),
    });
  } catch (error) {
    clearTokens();
    throw error;
  }
}
