import { beforeEach, describe, expect, it, vi } from "vitest";

let dark = false;
const listeners = new Set();

function installDom(url = "http://localhost/") {
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, "", url);
  localStorage.clear();
  dark = false;
  listeners.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return dark;
      },
      media: "(prefers-color-scheme: dark)",
      addEventListener: (_event, listener) => listeners.add(listener),
      removeEventListener: (_event, listener) => listeners.delete(listener)
    }))
  });
  window.scrollBy = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

async function loadApp() {
  vi.resetModules();
  await import("./main.js");
}

beforeEach(() => {
  vi.resetModules();
  installDom();
});

describe("Super Saengil interface", () => {
  it("switches languages and persists the choice", async () => {
    await loadApp();
    document.querySelector('[data-lang="en"]').click();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("super-saengil-language")).toBe("en");
    expect(document.body.textContent).toContain("Check dates");
  });

  it("localizes the informational section without mixing languages", async () => {
    await loadApp();
    const info = () => document.querySelector(".info-section").textContent;

    expect(info()).toContain("생일이 두 배로 특별해지는 날.");
    expect(info()).toContain("슈퍼생일이란?");
    expect(info()).not.toContain("When two birthdays become one.");
    expect(info()).not.toContain("What's a Super Birthday?");

    document.querySelector('[data-lang="en"]').click();
    expect(info()).toContain("When two birthdays become one.");
    expect(info()).toContain("What's a Super Birthday?");
    expect(info()).not.toContain("생일이 두 배로 특별해지는 날.");
    expect(info()).not.toContain("슈퍼생일이란?");
  });

  it("shows a localized Terms link in the homepage footer", async () => {
    await loadApp();
    const link = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("이용약관"));

    expect(link).toBeTruthy();
    expect(link.textContent).toBe("이용약관");
    expect(link.getAttribute("href")).toBe("terms/index.html");

    document.querySelector('[data-lang="en"]').click();
    const englishLink = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("Terms"));
    expect(englishLink).toBeTruthy();
    expect(englishLink.textContent).toBe("Terms of Use");
  });

  it("shows a localized Update Log link in the homepage footer", async () => {
    await loadApp();
    const link = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("업데이트"));

    expect(link).toBeTruthy();
    expect(link.textContent).toBe("업데이트 로그");
    expect(link.getAttribute("href")).toBe("updates/index.html");

    document.querySelector('[data-lang="en"]').click();
    const englishLink = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("Update"));
    expect(englishLink).toBeTruthy();
    expect(englishLink.textContent).toBe("Update Log");
  });

  it("renders the Terms page directly and switches languages there", async () => {
    installDom("http://localhost/terms/");
    await loadApp();

    expect(document.querySelector("#legalTitle").textContent).toBe("이용약관");
    expect(document.body.textContent).toContain("최종 업데이트: 2026년 8월 18일");
    expect(document.body.textContent).toContain("10. 준거법");
    expect(document.body.textContent).not.toContain("Terms of Use");
    expect(document.querySelector(".back-link").textContent).toContain("슈퍼생일로 돌아가기");
    expect(document.querySelector('.legal-body a[href="../privacy/index.html"]').textContent).toBe("개인정보 처리방침");
    expect(document.title).toBe("이용약관 · 슈퍼생일");

    document.querySelector('[data-lang="en"]').click();
    expect(document.querySelector("#legalTitle").textContent).toBe("Terms of Use");
    expect(document.body.textContent).toContain("Last updated: August 18, 2026");
    expect(document.body.textContent).toContain("10. Governing Law");
    expect(document.body.textContent).not.toContain("10. 준거법");
    expect(document.querySelector(".back-link").textContent).toContain("Back to Super Saengil");
    expect(document.querySelector('.legal-body a[href="../privacy/index.html"]').textContent).toBe("Privacy Policy");
    expect(document.title).toBe("Terms of Use · 슈퍼생일");
  });

  it("renders the Update Log page directly and switches languages there", async () => {
    installDom("http://localhost/updates/");
    await loadApp();

    expect(document.querySelector("#legalTitle").textContent).toBe("업데이트 로그");
    expect(document.body.textContent).toContain("최종 업데이트: 2026년 8월 26일");
    expect(document.body.textContent).toContain("v0.9.1");
    expect(document.body.textContent).toContain("2026년 8월 26일");
    expect(document.body.textContent).toContain("v0.9");
    expect(document.body.textContent).toContain("모바일과 태블릿에서 더 편하게 사용할 수 있도록 화면을 최적화했습니다.");
    expect(document.body.textContent).not.toContain("Update Log");
    expect(document.querySelector(".back-link").getAttribute("href")).toBe("../index.html");
    expect(document.querySelector(".brand-image").getAttribute("src")).toBe("../logo.png");
    expect(document.title).toBe("업데이트 로그 · 슈퍼생일");

    document.querySelector('[data-lang="en"]').click();
    expect(document.querySelector("#legalTitle").textContent).toBe("Update Log");
    expect(document.body.textContent).toContain("Last updated: August 26, 2026");
    expect(document.body.textContent).toContain("v0.9.1");
    expect(document.body.textContent).toContain("August 26, 2026");
    expect(document.body.textContent).toContain("Optimized the experience for mobile and tablet users.");
    expect(document.body.textContent).not.toContain("업데이트 로그");
    expect(document.title).toBe("Update Log · 슈퍼생일");
  });

  it("switches theme and persists the choice", async () => {
    await loadApp();
    document.querySelector('[data-appearance="dark"]').click();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("super-saengil-theme")).toBe("dark");
    expect(document.querySelector(".theme-toggle").style.getPropertyValue("--active-index")).toBe("2");

    document.querySelector('[data-appearance="system"]').click();
    expect(localStorage.getItem("super-saengil-theme")).toBe("system");
    expect(document.querySelector(".theme-toggle").style.getPropertyValue("--active-index")).toBe("0");
  });

  it("reacts to system theme changes", async () => {
    await loadApp();
    expect(document.documentElement.dataset.theme).toBe("light");
    dark = true;
    listeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("links to the localized privacy policy from the footer", async () => {
    await loadApp();
    const privacyLink = [...document.querySelectorAll(".site-footer a")].find((link) => link.textContent.includes("개인정보"));
    expect(privacyLink).toBeTruthy();
    expect(privacyLink.getAttribute("href")).toBe("privacy/index.html");

    document.querySelector('[data-lang="en"]').click();
    const englishPrivacyLink = [...document.querySelectorAll(".site-footer a")].find((link) => link.textContent.includes("Privacy"));
    expect(englishPrivacyLink).toBeTruthy();
    expect(englishPrivacyLink.getAttribute("href")).toBe("privacy/index.html");
  });

  it("renders the privacy policy route in Korean and returns home", async () => {
    installDom("http://localhost/privacy/index.html");
    await loadApp();

    expect(document.title).toContain("개인정보 처리방침");
    expect(document.body.textContent).toContain("개인정보 처리방침");
    expect(document.body.textContent).toContain("사용자의 기기에서 로컬로 처리됩니다");
    expect(document.body.textContent).toContain("localStorage");
    expect(document.body.textContent).not.toContain("Privacy Policy");
    expect(document.querySelector(".back-link").getAttribute("href")).toBe("../index.html");
    expect(document.querySelector(".brand-image").getAttribute("src")).toBe("../logo.png");
  });

  it("switches the privacy policy language without a separate selector", async () => {
    installDom("http://localhost/privacy/index.html");
    await loadApp();

    document.querySelector('[data-lang="en"]').click();
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toContain("Privacy Policy");
    expect(document.body.textContent).toContain("Birthday information you enter");
    expect(document.body.textContent).toContain("processed locally on your device");
    expect(document.body.textContent).not.toContain("개인정보 처리방침");
  });

  it("restores URL state and renders results", async () => {
    installDom("http://localhost/?calendar=solar&year=1993&month=3&day=27");
    await loadApp();
    expect(document.body.textContent).toContain("1993년");
    expect(document.body.textContent).toContain("2031년");
  });

  it("expands and collapses the table from the middle row", async () => {
    await loadApp();
    document.querySelector("#year").value = "1993";
    document.querySelector("#month").value = "3";
    document.querySelector("#day").value = "27";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const before = document.querySelectorAll("tbody tr").length;
    const button = document.querySelector("#expandButton");
    expect(button.textContent).toContain("더보기");
    button.click();
    expect(document.querySelectorAll("tbody tr").length).toBeGreaterThan(before);
    expect(document.querySelector("#expandButton").textContent).toContain("접기");
    document.querySelector("#expandButton").click();
    expect(document.querySelector("#expandButton").textContent).toContain("더보기");
  });

  it("moves focus down to the search results after submit", async () => {
    await loadApp();
    document.querySelector("#year").value = "1993";
    document.querySelector("#month").value = "3";
    document.querySelector("#day").value = "27";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const results = document.querySelector("#searchResults");
    expect(document.activeElement).toBe(results);
    expect(results.getAttribute("tabindex")).toBe("-1");
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("keeps birthday fields focused while typing", async () => {
    await loadApp();
    const year = document.querySelector("#year");
    year.focus();
    year.value = "1993";
    year.dispatchEvent(new Event("input", { bubbles: true }));
    expect(document.activeElement).toBe(year);
    expect(year.value).toBe("1993");
    expect(year.type).toBe("text");
  });

  it("hides reverse search until the secret period password is accepted", async () => {
    await loadApp();
    expect(document.querySelector(".search-mode-control")).toBeNull();

    document.querySelector(".secret-period").click();
    expect(document.body.textContent).toContain("비밀번호");

    document.querySelector("#passwordInput").value = "wrong";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(document.body.textContent).toContain("비밀번호가 올바르지 않습니다.");
    expect(document.querySelector(".search-mode-control")).toBeNull();

    document.querySelector("#passwordInput").value = " Super   Party ";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(localStorage.getItem("super-saengil-reverse-unlocked")).toBeNull();
    expect(document.querySelector(".search-mode-control").textContent).toContain("역방향 검색");
  });

  it("closes the password dialog without unlocking", async () => {
    await loadApp();
    document.querySelector(".secret-period").click();
    document.querySelector("[data-close-password]").click();

    expect(document.querySelector("#passwordForm")).toBeNull();
    expect(document.querySelector(".search-mode-control")).toBeNull();
  });

  it("persists the reverse-search unlock and renders reverse results", async () => {
    await loadApp();
    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    document.querySelector('input[name="searchMode"][value="reverse"]').click();
    expect(document.body.textContent).toContain("역방향 검색");
    expect(document.body.textContent).not.toContain("출생 연도");
    expect(document.querySelector(".primary-button").textContent).toContain("확인하기");
    expect(document.querySelector('[data-reverse-mode="solar"]').getAttribute("aria-selected")).toBe("true");

    document.querySelector("#year").value = "2017";
    document.querySelector("#month").value = "6";
    document.querySelector("#day").value = "24";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(document.body.textContent).toContain("일치하는 해");
    expect(document.body.textContent).toContain("결과 복사");
    expect(document.body.textContent).toContain("2017-06-24");
    expect(document.body.textContent).toContain("음력 생년월일");
    expect(document.body.textContent).toContain("2017년 5월 1일, 윤달");
    expect(document.body.textContent).toContain("해당 음력 구성이 없는 해: 1");
  });

  it("lets reverse search use a lunar target date", async () => {
    await loadApp();
    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    document.querySelector('input[name="searchMode"][value="reverse"]').click();
    document.querySelector('[data-reverse-mode="lunar"]').click();
    expect(document.querySelector('[data-reverse-mode="lunar"]').getAttribute("aria-selected")).toBe("true");
    expect(document.body.textContent).toContain("윤달인가요?");

    document.querySelector("#year").value = "2017";
    document.querySelector("#month").value = "5";
    document.querySelector("#day").value = "1";
    document.querySelector('input[name="reverseIsLeapMonth"][value="true"]').click();
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(document.body.textContent).toContain("2017-06-24");
    expect(document.body.textContent).toContain("2017년 5월 1일, 윤달");
    expect(document.body.textContent).toContain("해당 음력 구성이 없는 해");
  });

  it("accepts the secret password again to hide reverse search and reset the page", async () => {
    await loadApp();
    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    document.querySelector('input[name="searchMode"][value="reverse"]').click();
    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(localStorage.getItem("super-saengil-reverse-unlocked")).toBeNull();
    expect(document.querySelector(".search-mode-control")).toBeNull();
    expect(document.querySelector("#birthdayFormTitle").textContent).toContain("양력 생일");
    expect(location.search).toBe("");
  });

  it("clears stale unlock storage and keeps internal controls hidden by default", async () => {
    localStorage.setItem("super-saengil-reverse-unlocked", "true");
    await loadApp();

    expect(localStorage.getItem("super-saengil-reverse-unlocked")).toBeNull();
    expect(document.querySelector(".search-mode-control")).toBeNull();
  });

  it("unlocks internal controls with one password entry", async () => {
    await loadApp();

    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(localStorage.getItem("super-saengil-reverse-unlocked")).toBeNull();
    expect(document.querySelector(".search-mode-control").textContent).toContain("역방향 검색");
  });
});
