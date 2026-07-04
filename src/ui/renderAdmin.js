import {
  deleteBoardByAdmin,
  deleteAdminUser,
  getAdminSummary,
  getAdminUsers,
  getBoards,
  lockAdminUser,
  loginAdmin,
  logoutAdmin,
  unlockAdminUser,
} from "../api/adminApi.js";
import { getCurrentTokenPayload } from "../auth/authFetch.js";
import { getAccessToken } from "../auth/tokenStorage.js";

const app = document.querySelector("#app");

const state = {
  summary: null,
  users: [],
  boards: [],
  selectedBoard: null,
  keyword: "",
  loading: false,
  error: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function includesKeyword(...values) {
  const keyword = state.keyword.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return values.some((value) =>
    String(value ?? "").toLowerCase().includes(keyword)
  );
}

function getFilteredUsers() {
  return state.users.filter((user) =>
    includesKeyword(
      user.username,
      user.nickname,
      user.email,
      user.roleType,
      user.socialProviderType
    )
  );
}

function getFilteredBoards() {
  return state.boards.filter((board) =>
    includesKeyword(board.title, board.content, board.writer)
  );
}

function isAdminToken() {
  const payload = getCurrentTokenPayload();
  return payload?.role === "ROLE_ADMIN";
}

function renderLogin() {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-panel">
        <p class="eyebrow">myApp Admin</p>
        <h1>관리자 로그인</h1>
        <form id="loginForm" class="login-form">
          <label>
            아이디 또는 이메일
            <input id="usernameInput" name="username" type="text" autocomplete="username" required />
          </label>
          <label>
            비밀번호
            <input id="passwordInput" name="password" type="password" autocomplete="current-password" required />
          </label>
          <button type="submit">로그인</button>
          <p id="loginMessage" class="message"></p>
        </form>
      </section>
    </main>
  `;

  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.querySelector("#loginMessage");
    const username = document.querySelector("#usernameInput").value.trim();
    const password = document.querySelector("#passwordInput").value;

    message.textContent = "로그인 중입니다.";

    try {
      await loginAdmin({ username, password });

      if (!isAdminToken()) {
        await logoutAdmin();
        message.textContent = "관리자 권한이 없는 계정입니다.";
        return;
      }

      await loadDashboard();
    } catch (error) {
      message.textContent = "로그인에 실패했습니다.";
    }
  });
}

function renderMetric(label, value) {
  return `
    <article class="metric">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderUsersTable() {
  const users = getFilteredUsers();

  if (users.length === 0) {
    return `<div class="empty">조건에 맞는 회원이 없습니다.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Nickname</th>
            <th>Email</th>
            <th>Role</th>
            <th>Provider</th>
            <th>상태</th>
            <th>가입일</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (user) => `
                <tr>
                  <td>${escapeHtml(user.id)}</td>
                  <td>${escapeHtml(user.username)}</td>
                  <td>${escapeHtml(user.nickname || "-")}</td>
                  <td>${escapeHtml(user.email || "-")}</td>
                  <td><span class="badge">${escapeHtml(user.roleType)}</span></td>
                  <td>${escapeHtml(user.social ? user.socialProviderType || "SOCIAL" : "LOCAL")}</td>
                  <td>
                    <span class="badge ${user.lock ? "danger" : ""}">
                      ${user.lock ? "LOCKED" : "ACTIVE"}
                    </span>
                  </td>
                  <td>${escapeHtml(formatDate(user.createdDate))}</td>
                  <td>
                    <div class="row-actions">
                      <button
                        type="button"
                        class="secondary"
                        data-user-action="${user.lock ? "unlock" : "lock"}"
                        data-username="${escapeHtml(user.username)}"
                      >
                        ${user.lock ? "잠금 해제" : "잠금"}
                      </button>
                      <button
                        type="button"
                        class="danger"
                        data-user-action="delete"
                        data-username="${escapeHtml(user.username)}"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBoardsTable() {
  const boards = getFilteredBoards();

  if (boards.length === 0) {
    return `<div class="empty">조건에 맞는 게시글이 없습니다.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>제목</th>
            <th>작성자</th>
            <th>작성일</th>
            <th>수정일</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          ${boards
            .map(
              (board) => `
                <tr class="clickable-row" data-board-id="${escapeHtml(board.id)}">
                  <td>${escapeHtml(board.id)}</td>
                  <td>${escapeHtml(board.title)}</td>
                  <td>${escapeHtml(board.writer)}</td>
                  <td>${escapeHtml(formatDate(board.createdAt))}</td>
                  <td>${escapeHtml(formatDate(board.updatedAt))}</td>
                  <td>
                    <button
                      type="button"
                      class="danger"
                      data-board-action="delete"
                      data-board-id="${escapeHtml(board.id)}"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBoardDetail() {
  if (!state.selectedBoard) {
    return `<div class="empty">게시글을 선택하면 내용이 표시됩니다.</div>`;
  }

  return `
    <article class="detail">
      <div>
        <span class="badge">#${escapeHtml(state.selectedBoard.id)}</span>
        <h3>${escapeHtml(state.selectedBoard.title)}</h3>
      </div>
      <p class="muted">작성자: ${escapeHtml(state.selectedBoard.writer)}</p>
      <p class="content">${escapeHtml(state.selectedBoard.content)}</p>
    </article>
  `;
}

function renderDashboard() {
  const payload = getCurrentTokenPayload();

  app.innerHTML = `
    <main class="dashboard">
      <header class="topbar">
        <div>
          <p class="eyebrow">myApp Admin</p>
          <h1>관리자 페이지</h1>
        </div>
        <div class="topbar-actions">
          <span class="admin-id">${escapeHtml(payload?.sub || "")}</span>
          <button id="refreshButton" type="button">새로고침</button>
          <button id="logoutButton" type="button" class="secondary">로그아웃</button>
        </div>
      </header>

      ${state.error ? `<div class="alert">${escapeHtml(state.error)}</div>` : ""}

      <section class="metrics">
        ${renderMetric("전체 회원", state.summary?.totalUsers ?? state.users.length)}
        ${renderMetric("일반 회원", state.summary?.localUsers ?? "-")}
        ${renderMetric("소셜 회원", state.summary?.socialUsers ?? "-")}
        ${renderMetric("전체 게시글", state.boards.length)}
      </section>

      <section class="toolbar">
        <input id="searchInput" type="search" value="${escapeHtml(state.keyword)}" placeholder="회원, 이메일, 게시글, 작성자 검색" />
      </section>

      <section class="grid">
        <article class="panel">
          <div class="panel-head">
            <h2>회원 목록</h2>
            <span>${getFilteredUsers().length}명</span>
          </div>
          ${renderUsersTable()}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>게시글 목록</h2>
            <span>${getFilteredBoards().length}개</span>
          </div>
          ${renderBoardsTable()}
        </article>

        <article class="panel detail-panel">
          <div class="panel-head">
            <h2>게시글 상세</h2>
          </div>
          ${renderBoardDetail()}
        </article>
      </section>
    </main>
  `;

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await logoutAdmin();
    renderLogin();
  });

  document.querySelector("#refreshButton").addEventListener("click", loadDashboard);

  document.querySelector("#searchInput").addEventListener("input", (event) => {
    state.keyword = event.target.value;
    renderDashboard();
  });

  document.querySelectorAll("[data-board-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.boardId);
      state.selectedBoard = state.boards.find((board) => board.id === id) || null;
      renderDashboard();
    });
  });

  document.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleUserAction(button.dataset.userAction, button.dataset.username);
    });
  });

  document.querySelectorAll("[data-board-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleBoardAction(button.dataset.boardAction, button.dataset.boardId);
    });
  });
}

async function handleUserAction(action, username) {
  if (!action || !username) {
    return;
  }

  const actionLabel = {
    lock: "잠금",
    unlock: "잠금 해제",
    delete: "삭제",
  }[action];

  const ok = window.confirm(`${username} 회원을 ${actionLabel}할까요?`);

  if (!ok) {
    return;
  }

  try {
    if (action === "lock") {
      await lockAdminUser(username);
    } else if (action === "unlock") {
      await unlockAdminUser(username);
    } else if (action === "delete") {
      const confirmUsername = window.prompt("삭제하려면 username을 한 번 더 입력하세요.");

      if (confirmUsername !== username) {
        window.alert("username이 일치하지 않아 삭제를 취소합니다.");
        return;
      }

      await deleteAdminUser(username);
    }

    await loadDashboard();
  } catch (error) {
    state.error = `${username} 회원 ${actionLabel}에 실패했습니다.`;
    renderDashboard();
  }
}

async function handleBoardAction(action, id) {
  if (action !== "delete" || !id) {
    return;
  }

  const board = state.boards.find((item) => String(item.id) === String(id));
  const title = board?.title || `#${id}`;

  const ok = window.confirm(`${title} 게시글을 삭제할까요?`);

  if (!ok) {
    return;
  }

  try {
    await deleteBoardByAdmin(id);

    if (state.selectedBoard && String(state.selectedBoard.id) === String(id)) {
      state.selectedBoard = null;
    }

    await loadDashboard();
  } catch (error) {
    state.error = `${title} 게시글 삭제에 실패했습니다.`;
    renderDashboard();
  }
}

async function loadDashboard() {
  state.loading = true;
  state.error = "";

  try {
    const [summary, users, boards] = await Promise.all([
      getAdminSummary(),
      getAdminUsers(),
      getBoards(),
    ]);

    state.summary = summary;
    state.users = users;
    state.boards = boards;
    state.selectedBoard = boards[0] || null;
    renderDashboard();
  } catch (error) {
    state.error = error.message || "관리자 데이터를 불러오지 못했습니다.";
    renderDashboard();
  } finally {
    state.loading = false;
  }
}

export function renderAdminApp() {
  if (!getAccessToken()) {
    renderLogin();
    return;
  }

  if (!isAdminToken()) {
    renderLogin();
    return;
  }

  loadDashboard();
}
