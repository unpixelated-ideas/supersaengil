import { beforeEach, describe, expect, it, vi } from "vitest";

let dark = false;
const listeners = new Set();

function installDom(url = "http://localhost/", languages = ["ko-KR"]) {
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
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages
  });
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: languages[0] || ""
  });
  window.scrollBy = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  globalThis.Blob = class {
    constructor(parts, options = {}) {
      this.parts = parts;
      this.type = options.type || "";
    }

    async text() {
      return this.parts.join("");
    }
  };
  URL.createObjectURL = vi.fn();
  URL.revokeObjectURL = vi.fn();
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
  it("uses English when the browser language is English and no language preference is saved", async () => {
    installDom("http://localhost/", ["en-US"]);
    await loadApp();

    expect(document.documentElement.lang).toBe("en");
    expect(document.body.textContent).toContain("Check dates");
  });

  it("prioritizes Korean when Korean appears anywhere in the browser language list", async () => {
    installDom("http://localhost/", ["en-US", "ko-KR"]);
    await loadApp();

    expect(document.documentElement.lang).toBe("ko");
    expect(document.body.textContent).toContain("확인하기");
  });

  it("defaults to Korean when browser languages do not include Korean or English", async () => {
    installDom("http://localhost/", ["ja-JP", "fr-FR"]);
    await loadApp();

    expect(document.documentElement.lang).toBe("ko");
    expect(document.body.textContent).toContain("확인하기");
  });

  it("keeps a saved language preference ahead of browser languages", async () => {
    installDom("http://localhost/", ["ko-KR"]);
    localStorage.setItem("super-saengil-language", "en");
    await loadApp();

    expect(document.documentElement.lang).toBe("en");
    expect(document.body.textContent).toContain("Check dates");
  });

  it("switches languages and persists the choice", async () => {
    await loadApp();
    expect(document.body.textContent).toContain("화면 · Appearance");
    document.querySelector('[data-lang="en"]').click();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("super-saengil-language")).toBe("en");
    expect(document.body.textContent).toContain("Check dates");
    expect(document.body.textContent).toContain("Appearance · 화면");
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

  it("shows a localized external feedback link in the homepage footer", async () => {
    await loadApp();
    const link = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("피드백"));

    expect(link).toBeTruthy();
    expect(link.textContent).toBe("피드백");
    expect(link.getAttribute("href")).toBe("https://forms.gle/xzdA9z1RYmiFkb1L9");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    document.querySelector('[data-lang="en"]').click();
    const englishLink = [...document.querySelectorAll(".site-footer a")].find((footerLink) => footerLink.textContent.includes("Feedback"));
    expect(englishLink).toBeTruthy();
    expect(englishLink.textContent).toBe("Feedback");
    expect(englishLink.getAttribute("href")).toBe("https://forms.gle/a3MwRuEbXrjJtroo8");
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
    expect(document.body.textContent).toContain("최종 업데이트: 2026년 8월 31일");
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
    expect(document.body.textContent).toContain("Last updated: August 31, 2026");
    expect(document.body.textContent).toContain("v0.9.1");
    expect(document.body.textContent).toContain("August 26, 2026");
    expect(document.body.textContent).toContain("Optimized the experience for mobile and tablet users.");
    expect(document.body.textContent).not.toContain("업데이트 로그");
    expect(document.title).toBe("Update Log · 슈퍼생일");
  });

  it("renders the History page directly with inline citation links but no homepage link", async () => {
    installDom("http://localhost/history/");
    await loadApp();

    expect(document.querySelector("#legalTitle").textContent).toBe("역사");
    expect(document.body.textContent).toContain("중국에서는 적어도 기원전 1300년경부터");
    expect(document.body.textContent).toContain("“슈퍼생일,” 또는 “Super Birthday”");
    expect(document.title).toBe("역사 · 슈퍼생일");
    expect(document.querySelector(".back-link").getAttribute("href")).toBe("../index.html");
    expect(document.querySelector('.legal-body a[href="https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_027_0020_0020_0050_0010"]').textContent).toBe("한양, 오늘날의 서울");
    expect(document.querySelector('.legal-body a[href="https://aa.usno.navy.mil/faq/leap_years"]').textContent).toBe("400으로 나누어떨어질 때만");
    expect(document.body.textContent).not.toContain("[1]");
    const historyFooterLink = document.querySelector(".site-footer a:first-child");
    expect(historyFooterLink).toBeTruthy();
    expect(historyFooterLink.textContent).toBe("음력 알아보기");
    expect(historyFooterLink.getAttribute("href")).toBe("../history/index.html");

    document.querySelector('[data-lang="en"]').click();
    expect(document.querySelector("#legalTitle").textContent).toBe("History");
    expect(document.body.textContent).toContain("People in China have used lunisolar calendars");
    expect(document.body.textContent).toContain("A “super saengil”");
    expect(document.querySelector('.legal-body a[href="https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_027_0020_0020_0050_0010"]').textContent).toBe("Hanyang, modern-day Seoul");
    expect(document.querySelector('.legal-body a[href="https://aa.usno.navy.mil/faq/leap_years"]').textContent).toBe("divisible by 400");
    expect(document.querySelector(".site-footer a:first-child").textContent).toBe("Lunar Calendar Explained");

    installDom("http://localhost/");
    await loadApp();
    const homeHistoryFooterLink = document.querySelector(".site-footer a:first-child");
    expect(homeHistoryFooterLink).toBeTruthy();
    expect(homeHistoryFooterLink.textContent).toBe("음력 알아보기");
    expect(homeHistoryFooterLink.getAttribute("href")).toBe("history/index.html");
    document.querySelector('[data-lang="en"]').click();
    expect(document.querySelector(".site-footer a:first-child").textContent).toBe("Lunar Calendar Explained");
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

  it("lets the Korean version switch birthday wording to honorific copy", async () => {
    await loadApp();

    const birthday = document.querySelector('input[name="birthdayTerm"][value="birthday"]');
    const honorific = document.querySelector('input[name="birthdayTerm"][value="honorific"]');
    expect(birthday).toBeTruthy();
    expect(honorific).toBeTruthy();
    expect(birthday.checked).toBe(true);

    honorific.click();

    expect(localStorage.getItem("super-saengil-birthday-term")).toBe("honorific");
    expect(document.title).toBe("슈퍼생신 · Super Sangshin");
    expect(document.querySelector(".brand-title").textContent).toBe("슈퍼생신");
    expect(document.querySelector(".brand small").textContent).toBe("Super Sangshin");
    expect(document.querySelector("#birthdayFormTitle").textContent).toContain("양력 생신");
    expect(document.querySelector(".info-section").textContent).toContain("생신이 두 배로 특별해지는 날.");
    expect(document.querySelector(".info-section").textContent).toContain("슈퍼생신이란?");
    expect(document.querySelector(".info-section").textContent).not.toContain("슈퍼생일");

    document.querySelector('[data-lang="en"]').click();

    expect(document.querySelector('input[name="birthdayTerm"]')).toBeNull();
    expect(document.title).toBe("슈퍼생일 · Super Saengil");
    expect(document.body.textContent).toContain("Solar Birthday");
    expect(document.body.textContent).toContain("Super Saengil");
  });

  it("keeps Privacy and Terms under the official Korean app name when the honorific skin is selected", async () => {
    installDom("http://localhost/privacy/");
    localStorage.setItem("super-saengil-birthday-term", "honorific");
    await loadApp();

    expect(document.title).toBe("개인정보 처리방침 · 슈퍼생일");
    expect(document.querySelector(".brand-title").textContent).toBe("슈퍼생일");
    expect(document.querySelector(".brand small").textContent).toBe("Super Saengil");
    expect(document.querySelector(".back-link").textContent).toContain("슈퍼생일로 돌아가기");
    expect(document.querySelector(".legal-note").textContent).toContain("슈퍼생일은 앱의 공식 명칭입니다");
    expect(document.querySelector(".legal-note").textContent).toContain("슈퍼생신은 한국어 화면에서 선택할 수 있는 표시 방식");
    expect(document.querySelector(".legal-body").textContent).toContain("슈퍼생일 (Super Saengil)");
    expect(document.querySelector(".legal-body").textContent).not.toContain("Super Sangshin");

    installDom("http://localhost/terms/");
    localStorage.setItem("super-saengil-birthday-term", "honorific");
    await loadApp();

    expect(document.title).toBe("이용약관 · 슈퍼생일");
    expect(document.querySelector(".brand-title").textContent).toBe("슈퍼생일");
    expect(document.querySelector(".legal-note").textContent).toContain("별도의 서비스나 법적 명칭이 아닙니다");
    expect(document.querySelector(".legal-body").textContent).toContain("Super Saengil 웹사이트");
    expect(document.querySelector(".legal-body").textContent).not.toContain("Super Sangshin");
  });

  it("reacts to system theme changes", async () => {
    await loadApp();
    expect(document.documentElement.dataset.theme).toBe("light");
    dark = true;
    listeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("resets date input and returns to solar search without changing language or appearance", async () => {
    await loadApp();

    document.querySelector('[data-lang="en"]').click();
    document.querySelector('[data-appearance="dark"]').click();
    document.querySelector('[data-mode="lunar"]').click();
    document.querySelector("#year").value = "1993";
    document.querySelector("#month").value = "3";
    document.querySelector("#day").value = "5";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(document.body.textContent).toContain("Calculation complete.");
    expect(location.search).not.toBe("");

    document.querySelector("[data-reset-search]").click();

    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("super-saengil-language")).toBe("en");
    expect(localStorage.getItem("super-saengil-theme")).toBe("dark");
    expect(localStorage.getItem("super-saengil-mode")).toBe("solar");
    expect(document.querySelector("#birthdayFormTitle").textContent).toBe("Solar Birthday");
    expect(document.querySelector("#year").value).toBe("");
    expect(document.querySelector("#month").value).toBe("");
    expect(document.querySelector("#day").value).toBe("");
    expect(document.querySelector("#searchResults")).toBeNull();
    expect(location.search).toBe("");
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

  it("shows an icon-only calendar download button after normal results", async () => {
    await loadApp();
    document.querySelector('[data-lang="en"]').click();
    document.querySelector("#year").value = "1993";
    document.querySelector("#month").value = "3";
    document.querySelector("#day").value = "27";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const button = document.querySelector('[data-download-ics="normal"]');
    expect(button).toBeTruthy();
    expect(button.getAttribute("aria-label")).toBe("Download calendar file");
    expect(button.textContent.trim()).toBe("");
    expect(document.querySelector(".section-heading-with-action .download-button")).toBe(button);
  });

  it("downloads localized normal-search ICS text with an optional prompted name", async () => {
    await loadApp();
    const click = vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:calendar");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    document.querySelector('[data-lang="en"]').click();
    document.querySelector("#year").value = "1993";
    document.querySelector("#month").value = "3";
    document.querySelector("#day").value = "27";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    document.querySelector('[data-download-ics="normal"]').click();

    expect(document.querySelector("#downloadTitle").textContent).toBe("Download calendar file");
    expect(document.querySelector('input[name="downloadBirthdayTerm"]')).toBeNull();
    expect(document.querySelector("[data-download-start-text]").textContent).toBe("1993");
    expect(document.querySelector("[data-download-end-text]").textContent).toBe("2127");
    expect(document.querySelector("[data-download-count-text]").textContent).toBe("135 dates");
    expect(document.querySelector("#downloadStartYear").getAttribute("min")).toBe("1993");
    expect(document.querySelector("#downloadStartYear").getAttribute("max")).toBe("2127");
    expect(document.querySelector("#downloadEndYear").getAttribute("min")).toBe("1993");
    expect(document.querySelector("#downloadEndYear").getAttribute("max")).toBe("2127");
    document.querySelector("#downloadStartYear").value = "1994";
    document.querySelector("#downloadStartYear").dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#downloadEndYear").value = "1995";
    document.querySelector("#downloadEndYear").dispatchEvent(new Event("input", { bubbles: true }));
    expect(document.querySelector("[data-download-start-text]").textContent).toBe("1994");
    expect(document.querySelector("[data-download-end-text]").textContent).toBe("1995");
    expect(document.querySelector("[data-download-count-text]").textContent).toBe("2 dates");
    document.querySelector("#downloadNameInput").value = "Mina";
    document.querySelector("#downloadForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const blob = createObjectURL.mock.calls[0][0];
    const content = await blob.text();
    expect(content).toContain("SUMMARY:Mina's Lunar Birthday");
    expect(content).toContain("DESCRIPTION:Original input: March 27\\, 1993");
    expect(content).not.toContain("DTSTART;VALUE=DATE:19930327");
    expect(content).toContain("DTSTART;VALUE=DATE:19940415");
    expect(content).toContain("DTSTART;VALUE=DATE:19950404");
    expect(content).not.toContain("DTSTART;VALUE=DATE:19960422");
    expect(click).toHaveBeenCalled();
    expect(document.querySelector("#downloadForm")).toBeNull();
  });

  it("lets Korean downloads use the honorific birthday term", async () => {
    await loadApp();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:calendar");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    document.querySelector("#year").value = "2017";
    document.querySelector("#month").value = "5";
    document.querySelector("#day").value = "1";
    document.querySelector('[data-mode="lunar"]').click();
    document.querySelector("#year").value = "2017";
    document.querySelector("#month").value = "5";
    document.querySelector("#day").value = "1";
    document.querySelector('input[name="isLeapMonth"][value="true"]').click();
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    document.querySelector('[data-download-ics="normal"]').click();

    const birthday = document.querySelector('input[name="downloadBirthdayTerm"][value="birthday"]');
    const honorific = document.querySelector('input[name="downloadBirthdayTerm"][value="honorific"]');
    expect(birthday).toBeTruthy();
    expect(honorific).toBeTruthy();
    expect(birthday.type).toBe("radio");
    expect(honorific.type).toBe("radio");
    expect(birthday.checked).toBe(true);
    expect(honorific.checked).toBe(false);
    honorific.click();
    expect(birthday.checked).toBe(false);
    expect(honorific.checked).toBe(true);
    document.querySelector("#downloadNameInput").value = "어머니";
    document.querySelector("#downloadForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const content = await createObjectURL.mock.calls[0][0].text();
    expect(content).toContain("SUMMARY:어머니 음력 생신");
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
    expect(document.querySelector('[data-download-ics="reverse"]').getAttribute("aria-label")).toBe("캘린더 파일 다운로드");
  });

  it("downloads Korean reverse-search ICS text when Korean is active", async () => {
    await loadApp();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:calendar");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    document.querySelector(".secret-period").click();
    document.querySelector("#passwordInput").value = "tbvjvkxl";
    document.querySelector("#passwordForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    document.querySelector('input[name="searchMode"][value="reverse"]').click();
    document.querySelector("#year").value = "2017";
    document.querySelector("#month").value = "6";
    document.querySelector("#day").value = "24";
    document.querySelector("#birthdayForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    document.querySelector('[data-download-ics="reverse"]').click();
    expect(document.querySelector("#downloadTitle").textContent).toBe("캘린더 파일 다운로드");
    document.querySelector("#downloadForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const content = await createObjectURL.mock.calls[0][0].text();
    expect(content).toContain("SUMMARY:역방향 생일 일치");
    expect(content).toContain("대상 날짜: 2017년 6월 24일");
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
