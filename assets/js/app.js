/**
 * 編班查詢系統 — 前端邏輯
 * 功能：身分證／密碼登入、顯示姓名／班級／導師、登出與工作階段還原
 */

(function () {
  "use strict";

  /** sessionStorage 鍵名：儲存已登入學生資料 */
  var SESSION_KEY = "classQuerySession";

  /** 快取 DOM 節點，避免重複查詢 */
  var els = {
    viewLogin: document.getElementById("view-login"),
    viewResult: document.getElementById("view-result"),
    form: document.getElementById("login-form"),
    inputId: document.getElementById("input-id"),
    inputPassword: document.getElementById("input-password"),
    btnLogin: document.getElementById("btn-login"),
    btnLogout: document.getElementById("btn-logout"),
    alert: document.getElementById("login-alert"),
    alertText: document.getElementById("login-alert-text"),
    resultName: document.getElementById("result-name"),
    resultGrade: document.getElementById("result-grade"),
    resultClass: document.getElementById("result-class"),
    resultAdvisor: document.getElementById("result-advisor"),
    resultStudentNo: document.getElementById("result-student-no")
  };

  /**
   * 正規化身分證輸入：去空白、轉大寫
   * @param {string} value
   * @returns {string}
   */
  function normalizeId(value) {
    return String(value || "").trim().toUpperCase();
  }

  /**
   * 簡易延遲，模擬真實登入回饋節奏（Apple 介面常見的短暫等待感）
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * 顯示或隱藏登入錯誤訊息
   * @param {string|null} message 傳 null 則隱藏
   */
  function setAlert(message) {
    if (!message) {
      els.alert.classList.remove("is-visible");
      els.alertText.textContent = "";
      return;
    }
    els.alertText.textContent = message;
    els.alert.classList.remove("is-visible");
    // 重新觸發動畫
    void els.alert.offsetWidth;
    els.alert.classList.add("is-visible");
  }

  /**
   * 設定登入按鈕 loading 狀態
   * @param {boolean} loading
   */
  function setLoading(loading) {
    els.btnLogin.disabled = loading;
    els.btnLogin.classList.toggle("is-loading", loading);
    els.btnLogin.setAttribute("aria-busy", loading ? "true" : "false");
  }

  /**
   * 標記輸入框錯誤樣式
   * @param {HTMLElement} input
   * @param {boolean} invalid
   */
  function markInvalid(input, invalid) {
    input.classList.toggle("is-invalid", !!invalid);
  }

  /**
   * 載入學生資料 JSON
   * @returns {Promise<Array>}
   */
  function loadStudents() {
    return fetch("data/students.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("無法載入學生資料");
        }
        return res.json();
      })
      .then(function (data) {
        return (data && data.students) || [];
      });
  }

  /**
   * 驗證帳密並回傳對應學生（不含密碼欄位）
   * @param {string} id
   * @param {string} password
   * @returns {Promise<object>}
   */
  function authenticate(id, password) {
    return loadStudents().then(function (students) {
      var found = students.find(function (s) {
        return normalizeId(s.id) === id && s.password === password;
      });

      if (!found) {
        var err = new Error("身分證字號或密碼不正確");
        err.code = "AUTH_FAILED";
        throw err;
      }

      // 回傳時移除密碼，避免寫入 session
      return {
        id: found.id,
        name: found.name,
        className: found.className,
        advisor: found.advisor,
        grade: found.grade,
        studentNo: found.studentNo
      };
    });
  }

  /**
   * 將學生資料寫入 sessionStorage
   * @param {object} student
   */
  function saveSession(student) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(student));
  }

  /**
   * 讀取既有工作階段
   * @returns {object|null}
   */
  function readSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** 清除工作階段 */
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * 將學生資料填入結果畫面
   * @param {object} student
   */
  function renderResult(student) {
    els.resultName.textContent = student.name || "—";
    els.resultGrade.textContent = (student.grade ? student.grade + "　" : "") + "編班資訊已確認";
    els.resultClass.textContent = student.className || "—";
    els.resultAdvisor.textContent = student.advisor || "—";
    els.resultStudentNo.textContent = student.studentNo || "—";
  }

  /**
   * 切換畫面（登入 ↔ 結果）
   * @param {"login"|"result"} name
   */
  function showView(name) {
    var showLogin = name === "login";
    els.viewLogin.hidden = !showLogin;
    els.viewResult.hidden = showLogin;

    var active = showLogin ? els.viewLogin : els.viewResult;
    active.classList.remove("is-entering");
    void active.offsetWidth;
    active.classList.add("is-entering");
  }

  /**
   * 登入成功後進入結果畫面
   * @param {object} student
   */
  function enterResult(student) {
    saveSession(student);
    renderResult(student);
    showView("result");
  }

  /** 登出並回到登入畫面 */
  function logout() {
    clearSession();
    els.form.reset();
    setAlert(null);
    markInvalid(els.inputId, false);
    markInvalid(els.inputPassword, false);
    showView("login");
    els.inputId.focus();
  }

  /**
   * 處理登入表單送出
   * @param {Event} event
   */
  function onSubmit(event) {
    event.preventDefault();
    setAlert(null);

    var id = normalizeId(els.inputId.value);
    var password = String(els.inputPassword.value || "");

    // 前端基本檢查
    var idOk = id.length >= 8;
    var pwOk = password.length > 0;
    markInvalid(els.inputId, !idOk);
    markInvalid(els.inputPassword, !pwOk);

    if (!idOk || !pwOk) {
      setAlert("請完整輸入身分證字號與密碼");
      return;
    }

    setLoading(true);

    // 短暫延遲提升體感回饋，再進行驗證
    wait(520)
      .then(function () {
        return authenticate(id, password);
      })
      .then(function (student) {
        enterResult(student);
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : "登入失敗，請稍後再試";
        setAlert(msg);
        markInvalid(els.inputId, true);
        markInvalid(els.inputPassword, true);
        els.inputPassword.select();
      })
      .finally(function () {
        setLoading(false);
      });
  }

  /** 綁定事件與還原工作階段 */
  function init() {
    els.form.addEventListener("submit", onSubmit);
    els.btnLogout.addEventListener("click", logout);

    // 輸入時清除錯誤樣式
    [els.inputId, els.inputPassword].forEach(function (input) {
      input.addEventListener("input", function () {
        markInvalid(input, false);
        if (els.alert.classList.contains("is-visible")) {
          setAlert(null);
        }
      });
    });

    // 身分證自動轉大寫
    els.inputId.addEventListener("input", function () {
      var start = els.inputId.selectionStart;
      var end = els.inputId.selectionEnd;
      els.inputId.value = els.inputId.value.toUpperCase();
      if (start != null && end != null) {
        els.inputId.setSelectionRange(start, end);
      }
    });

    // 若已有工作階段，直接進入結果頁
    var session = readSession();
    if (session && session.name) {
      renderResult(session);
      showView("result");
    } else {
      showView("login");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
