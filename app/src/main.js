import "./styles.css";
import { calculateMatches, calculateReverseMatches, getDisplayRows, isGregorianDate, lunarToSolar, MAX_YEAR, MIN_YEAR } from "./calendar.js";
import { formatIsoDate, formatLunar, formatSolar, formatYear } from "./format.js";
import { createBirthdayIcs, createReverseIcs, downloadTextFile } from "./ics.js";
import { translations } from "./translations.js";

const storageKeys = {
  lang: "super-saengil-language",
  theme: "super-saengil-theme",
  mode: "super-saengil-mode",
  birthdayTerm: "super-saengil-birthday-term",
  reverseUnlocked: "super-saengil-reverse-unlocked"
};

const state = {
  lang: preferredLanguage(),
  theme: localStorage.getItem(storageKeys.theme) || "system",
  mode: localStorage.getItem(storageKeys.mode) || "solar",
  birthdayTerm: localStorage.getItem(storageKeys.birthdayTerm) || "birthday",
  searchMode: "normal",
  reverseMode: "solar",
  reverseUnlocked: false,
  fields: { year: "", month: "", day: "", isLeapMonth: "false" },
  reverseFields: { ...todayFields(), isLeapMonth: "false" },
  result: null,
  reverseResult: null,
  error: "",
  password: "",
  passwordError: "",
  passwordModalOpen: false,
  passwordAction: "unlock",
  downloadModalOpen: false,
  downloadKind: "normal",
  downloadName: "",
  downloadStartYear: "",
  downloadEndYear: "",
  downloadMaxYear: "",
  downloadHonorificBirthday: false,
  copyMessage: "",
  expanded: false
};

function preferredLanguage() {
  const saved = localStorage.getItem(storageKeys.lang);
  if (saved === "ko" || saved === "en") return saved;

  const browserLanguages = [
    ...(navigator.languages || []),
    navigator.language
  ]
    .filter(Boolean)
    .map((language) => String(language).toLowerCase().split("-")[0]);

  if (browserLanguages.includes("ko")) return "ko";
  if (browserLanguages.includes("en")) return "en";
  return "ko";
}

const app = document.querySelector("#app");
const media = window.matchMedia("(prefers-color-scheme: dark)");
media.addEventListener("change", () => {
  if (state.theme === "system") applyTheme();
});
window.addEventListener("popstate", () => render());

localStorage.removeItem(storageKeys.reverseUnlocked);
restoreFromUrl();
applyTheme();
render();

function t(key) {
  return localizeBirthdayTerm(translations[state.lang][key]);
}

function rawT(key) {
  return translations[state.lang][key];
}

function isHonorificBirthday() {
  return state.lang === "ko" && state.birthdayTerm === "honorific";
}

function localizeBirthdayTerm(value) {
  if (!isHonorificBirthday()) return value;
  if (typeof value === "string") return honorificBirthdayText(value);
  if (Array.isArray(value)) return value.map((item) => localizeBirthdayTerm(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeBirthdayTerm(item)]));
  }
  return value;
}

function honorificBirthdayText(value) {
  return value
    .replaceAll("Super Saengil", "Super Sangshin")
    .replaceAll("Saengil", "Sangshin")
    .replaceAll("슈퍼생일", "슈퍼생신")
    .replaceAll("생일", "생신");
}

function appName() {
  return localizeBirthdayTerm(translations.ko.appName);
}

function appSubtitle() {
  return localizeBirthdayTerm(translations.ko.subtitle);
}

function officialAppName() {
  return translations.ko.appName;
}

function officialAppSubtitle() {
  return translations.ko.subtitle;
}

function render() {
  document.documentElement.lang = state.lang;
  const isReverse = state.reverseUnlocked && state.searchMode === "reverse";
  const legalPage = currentLegalPage();
  const legalTitle = legalPage === "privacy" ? rawT("privacyTitle") : legalPage === "terms" ? rawT("termsTitle") : legalPage === "history" ? rawT("historyTitle") : rawT("updatesTitle");
  const headerAppName = legalPage === "privacy" || legalPage === "terms" ? officialAppName() : appName();
  const headerAppSubtitle = legalPage === "privacy" || legalPage === "terms" ? officialAppSubtitle() : appSubtitle();
  document.title = legalPage ? `${legalTitle} · ${officialAppName()}` : `${appName()} · ${appSubtitle()}`;
  app.innerHTML = `
    <div class="app-background" aria-hidden="true"></div>
    <div class="page">
      <div class="decor" aria-hidden="true">
        <span class="sparkle sparkle-a"></span>
        <span class="sparkle sparkle-b"></span>
        <span class="sparkle sparkle-c"></span>
        <span class="sparkle sparkle-d"></span>
      </div>
      <header class="topbar">
        <div class="brand">
          <span class="brand-icon" aria-label="${t("iconLogo")}">${brandIcon()}</span>
          <span>
            <span class="brand-title">${headerAppName}</span>
            <small>${headerAppSubtitle}</small>
          </span>
        </div>
        <div class="header-controls">
          <button type="button" class="reset-button" data-reset-search aria-label="${escapeAttr(t("reset"))}" title="${escapeAttr(t("reset"))}">
            ${icon("reset")}<span>${t("reset")}</span>
          </button>
          <div class="control-stack appearance-stack">
            <span>${t("languageLabel")}</span>
            <div class="segmented language-toggle" role="group" aria-label="${t("languageLabel")}">
              ${languageButton("ko", "한국어")}
              ${languageButton("en", "English")}
            </div>
            <select class="setting-select mobile-setting-select" data-lang-select aria-label="${t("languageLabel")}">
              <option value="ko" ${state.lang === "ko" ? "selected" : ""}>한국어</option>
              <option value="en" ${state.lang === "en" ? "selected" : ""}>English</option>
            </select>
          </div>
          <div class="control-stack">
            <span>${t("appearanceLabel")}</span>
            <div class="segmented theme-toggle" role="group" aria-label="${t("appearanceLabel")}" style="--active-index: ${themeIndex()}">
              <span class="segment-indicator" aria-hidden="true"></span>
              ${themeButton("system", "monitor", t("system"))}
              ${themeButton("light", "sun", t("light"))}
              ${themeButton("dark", "moon", t("dark"))}
            </div>
            <select class="setting-select mobile-setting-select" data-appearance-select aria-label="${t("appearanceLabel")}">
              <option value="system" ${state.theme === "system" ? "selected" : ""}>${t("system")}</option>
              <option value="light" ${state.theme === "light" ? "selected" : ""}>${t("light")}</option>
              <option value="dark" ${state.theme === "dark" ? "selected" : ""}>${t("dark")}</option>
            </select>
            ${birthdayTermControl()}
          </div>
        </div>
      </header>

      ${legalPage ? legalPageTemplate(legalPage) : homePageTemplate(isReverse)}
      ${state.passwordModalOpen ? passwordModalTemplate() : ""}
      ${state.downloadModalOpen ? downloadModalTemplate() : ""}
    </div>
  `;
  bindEvents();
}

function homePageTemplate(isReverse) {
  return `
    <main>
      <section class="input-card" aria-labelledby="birthdayFormTitle">
        ${isReverse ? reverseFormTemplate() : normalFormTemplate()}
      </section>

      ${infoSectionTemplate()}

      <div class="live-region" role="status" aria-live="polite">${state.result || state.reverseResult ? t("completed") : state.error}</div>
      ${isReverse && state.reverseResult ? reverseResultsTemplate() : ""}
      ${!isReverse && state.result ? resultsTemplate() : ""}
    </main>
    ${siteFooterTemplate()}
  `;
}

function normalFormTemplate() {
  return `
    <div class="tabs" role="tablist" aria-label="${t("inputHelp")}">
        ${tabButton("solar", "sun", t("solarTab"))}
        ${tabButton("lunar", "moon", t("lunarTab"))}
    </div>
    <h1 id="birthdayFormTitle">${state.mode === "solar" ? t("solarTab") : t("lunarTab")}</h1>
    <form id="birthdayForm" novalidate>
      <div class="field-grid ${state.mode === "lunar" ? "field-grid-lunar" : "field-grid-solar"}">
        ${numberField("year", t("birthYear"), MIN_YEAR, MAX_YEAR, t("yearPlaceholder"), state.fields.year)}
        ${numberField("month", state.mode === "solar" ? t("birthMonth") : t("lunarMonth"), 1, 12, t("monthPlaceholder"), state.fields.month)}
        ${numberField("day", state.mode === "solar" ? t("birthDay") : t("lunarDay"), 1, 31, t("dayPlaceholder"), state.fields.day)}
        ${state.mode === "lunar" ? monthTypeControl() : ""}
        <button class="primary-button" type="submit">
          ${icon("search")}<span>${t("check")}</span>
        </button>
      </div>
      ${searchModeControl()}
      <p id="formError" class="error" role="alert">${state.error}</p>
    </form>
  `;
}

function reverseFormTemplate() {
  return `
    <div class="tabs reverse-tabs" role="tablist" aria-label="${t("reverseCalendarType")}">
        ${reverseModeButton("solar", "sun", t("solarTab"))}
        ${reverseModeButton("lunar", "moon", t("lunarTab"))}
    </div>
    <div class="reverse-heading">
      <h1 id="birthdayFormTitle">${t("reverseTitle")}</h1>
      <p>${state.reverseMode === "solar" ? t("reverseSolarDescription") : t("reverseLunarDescription")}</p>
    </div>
    <form id="birthdayForm" novalidate>
      <div class="field-grid ${state.reverseMode === "lunar" ? "reverse-field-grid reverse-field-grid-lunar" : "reverse-field-grid"}">
        ${numberField("year", t("targetYear"), 1900, MAX_YEAR, String(new Date().getFullYear()), state.reverseFields.year)}
        ${numberField("month", state.reverseMode === "solar" ? t("targetMonth") : t("lunarMonth"), 1, 12, t("monthPlaceholder"), state.reverseFields.month)}
        ${numberField("day", state.reverseMode === "solar" ? t("targetDay") : t("lunarDay"), 1, state.reverseMode === "solar" ? 31 : 30, t("dayPlaceholder"), state.reverseFields.day)}
        ${state.reverseMode === "lunar" ? monthTypeControl("reverseIsLeapMonth", state.reverseFields.isLeapMonth) : ""}
        <button class="primary-button" type="submit">
          ${icon("search")}<span>${t("check")}</span>
        </button>
      </div>
      ${searchModeControl()}
      <p id="formError" class="error" role="alert">${state.error}</p>
    </form>
  `;
}

function themeButton(value, iconName, label) {
  return `
    <button type="button" class="segment" data-appearance="${value}" aria-pressed="${state.theme === value}">
      ${icon(iconName)}<span>${label}</span>
    </button>
  `;
}

function themeIndex() {
  return { system: 0, light: 1, dark: 2 }[state.theme] ?? 0;
}

function languageButton(value, label) {
  return `
    <button type="button" class="segment language-option" data-lang="${value}" aria-pressed="${state.lang === value}">
      <span>${label}</span>
    </button>
  `;
}

function birthdayTermControl() {
  if (state.lang !== "ko") return "";
  return `
    <fieldset class="birthday-term-control" aria-label="생일 또는 생신">
      <label>
        <input type="radio" name="birthdayTerm" value="birthday" ${state.birthdayTerm !== "honorific" ? "checked" : ""} />
        <span>생일</span>
      </label>
      <label>
        <input type="radio" name="birthdayTerm" value="honorific" ${state.birthdayTerm === "honorific" ? "checked" : ""} />
        <span>생신</span>
      </label>
    </fieldset>
  `;
}

function tabButton(value, iconName, label) {
  return `
    <button type="button" role="tab" class="tab" data-mode="${value}" aria-selected="${state.mode === value}" tabindex="${state.mode === value ? "0" : "-1"}">
      ${icon(iconName)}<span>${label}</span>
    </button>
  `;
}

function reverseModeButton(value, iconName, label) {
  return `
    <button type="button" role="tab" class="tab" data-reverse-mode="${value}" aria-selected="${state.reverseMode === value}" tabindex="${state.reverseMode === value ? "0" : "-1"}">
      ${icon(iconName)}<span>${label}</span>
    </button>
  `;
}

function numberField(name, label, min, max, placeholder, value = state.fields[name]) {
  return `
    <label class="field">
      <span>${label}</span>
      <input id="${name}" name="${name}" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="next" data-min="${min}" data-max="${max}" placeholder="${escapeAttr(placeholder)}" value="${escapeAttr(value)}" required />
    </label>
  `;
}

function searchModeControl() {
  if (!state.reverseUnlocked) return "";
  return `
    <fieldset class="search-mode-control">
      <legend>${t("searchMode")}</legend>
      <div class="search-mode-options">
        <label class="month-choice">
          <input type="radio" name="searchMode" value="normal"${state.searchMode !== "reverse" ? " checked" : ""} />
          <span>${t("normalSearch")}</span>
        </label>
        <label class="month-choice">
          <input type="radio" name="searchMode" value="reverse"${state.searchMode === "reverse" ? " checked" : ""} />
          <span>${t("reverseSearch")}</span>
        </label>
      </div>
    </fieldset>
  `;
}

function monthTypeControl(name = "isLeapMonth", value = state.fields.isLeapMonth) {
  return `
    <fieldset class="month-type">
      <legend>${t("monthType")}</legend>
      <div class="month-type-options">
        <label class="month-choice">
          <input type="radio" name="${name}" value="false"${value !== "true" ? " checked" : ""} />
          <span>${t("regularMonth")}</span>
        </label>
        <label class="month-choice">
          <input type="radio" name="${name}" value="true"${value === "true" ? " checked" : ""} />
          <span>${t("leapMonth")}</span>
        </label>
      </div>
      <p>${t("leapMonthHelp")}</p>
    </fieldset>
  `;
}

function infoSectionTemplate() {
  const cards = [
    { iconName: "cake", tone: "lavender", title: t("infoCard1Title"), body: t("infoCard1Body") },
    { iconName: "calendarStar", tone: "green", title: t("infoCard2Title"), body: t("infoCard2Body") },
    { iconName: "gift", tone: "coral", title: t("infoCard3Title"), body: t("infoCard3Body") }
  ];
  return `
    <section class="info-section" aria-labelledby="infoTitle">
      <div class="info-copy">
        <h2 id="infoTitle">${infoHeadlineTemplate()}</h2>
        <p>${t("infoSubheadline")}</p>
      </div>
      <div class="info-cards">
        ${cards.map((card) => `
          <article class="info-card">
            <span class="info-icon ${card.tone}">${icon(card.iconName)}</span>
            <h3>${card.title}</h3>
            <p>${card.body}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function infoHeadlineTemplate() {
  if (state.lang === "ko") {
    return `${isHonorificBirthday() ? "생신" : "생일"}이 <span>두 배로</span> 특별해지는 날${secretPeriodTemplate()}`;
  }
  return `When two birthdays become <span>one</span>${secretPeriodTemplate()}`;
}

function secretPeriodTemplate() {
  return `<button type="button" class="secret-period" aria-label="${escapeAttr(t("passwordTitle"))}">.</button>`;
}

function passwordModalTemplate() {
  return `
    <div class="modal-backdrop" role="presentation">
      <dialog class="password-dialog" open aria-labelledby="passwordTitle">
        <button type="button" class="dialog-close" data-close-password aria-label="${escapeAttr(t("close"))}">
          ${icon("x")}
        </button>
        <form id="passwordForm" novalidate>
          <h2 id="passwordTitle">${t("passwordTitle")}</h2>
          <label class="field password-field">
            <span class="visually-hidden">${t("passwordTitle")}</span>
            <input id="passwordInput" name="password" type="password" autocomplete="off" placeholder="${escapeAttr(t("passwordPlaceholder"))}" value="${escapeAttr(state.password)}" />
          </label>
          <p class="error password-error" role="alert">${state.passwordError}</p>
          <button class="primary-button password-unlock" type="submit">${t("unlock")}</button>
        </form>
      </dialog>
    </div>
  `;
}

function downloadModalTemplate() {
  const bounds = getDownloadBounds();
  const startYear = Number(state.downloadStartYear);
  const endYear = Number(state.downloadEndYear);
  const eventCount = getDownloadEventCount(state.downloadKind, startYear, endYear);
  const rangeStyle = downloadRangeStyle(bounds.startYear, bounds.maxYear, startYear, endYear);
  return `
    <div class="modal-backdrop" role="presentation">
      <dialog class="password-dialog download-dialog" open aria-labelledby="downloadTitle">
        <button type="button" class="dialog-close" data-close-download aria-label="${escapeAttr(t("close"))}">
          ${icon("x")}
        </button>
        <form id="downloadForm" novalidate>
          <h2 id="downloadTitle">${t("downloadTitle")}</h2>
          <p class="dialog-help">${t("downloadNameHelp")}</p>
          <label class="field password-field">
            <span class="visually-hidden">${t("downloadNameLabel")}</span>
            <input id="downloadNameInput" name="downloadName" type="text" autocomplete="name" placeholder="${escapeAttr(t("downloadNamePlaceholder"))}" value="${escapeAttr(state.downloadName)}" />
          </label>
          ${state.lang === "ko" ? `
            <fieldset class="birthday-term-choice" aria-label="${escapeAttr(rawT("downloadBirthdayTermLabel"))}">
              <label>
                <input type="radio" name="downloadBirthdayTerm" value="birthday" ${state.downloadHonorificBirthday ? "" : "checked"} />
                <span>생일</span>
              </label>
              <label>
                <input type="radio" name="downloadBirthdayTerm" value="honorific" ${state.downloadHonorificBirthday ? "checked" : ""} />
                <span>생신</span>
              </label>
            </fieldset>
          ` : ""}
          <div class="download-range">
            <div class="download-range-copy">
              <div>
                <span>${t("downloadStartYearLabel")}</span>
                <strong data-download-start-text>${formatYear(startYear, state.lang)}</strong>
              </div>
              <div>
                <span>${t("downloadEndYearLabelShort")}</span>
                <strong data-download-end-text>${formatYear(endYear, state.lang)}</strong>
              </div>
              <strong class="download-count" data-download-count-text>${t("downloadCountValue").replace("{count}", String(eventCount))}</strong>
            </div>
            <div class="dual-range" style="${rangeStyle}">
              <div class="dual-range-track" aria-hidden="true"></div>
              <input
                id="downloadStartYear"
                name="downloadStartYear"
                type="range"
                min="${bounds.startYear}"
                max="${bounds.maxYear}"
                value="${state.downloadStartYear}"
                step="1"
                aria-label="${escapeAttr(t("downloadStartYearAria"))}"
                data-download-start-year
              />
              <input
                id="downloadEndYear"
                name="downloadEndYear"
                type="range"
                min="${bounds.startYear}"
                max="${bounds.maxYear}"
                value="${state.downloadEndYear}"
                step="1"
                aria-label="${escapeAttr(t("downloadEndYearLabel"))}"
                data-download-end-year
              />
            </div>
          </div>
          <button class="primary-button password-unlock" type="submit">${t("downloadCalendar")}</button>
        </form>
      </dialog>
    </div>
  `;
}

function legalPageTemplate(page) {
  if (page === "updates") return updateLogTemplate();
  if (page === "history") return historyPageTemplate();

  const pageTitle = page === "privacy" ? rawT("privacyTitle") : rawT("termsTitle");
  const pageUpdated = page === "privacy" ? rawT("privacyUpdated") : rawT("termsUpdated");
  const pageIntro = page === "privacy" ? rawT("privacyIntro") : rawT("termsIntro");
  const pageSections = page === "privacy" ? rawT("privacySections") : rawT("termsSections");
  return `
    <main>
      <article class="legal-card" aria-labelledby="legalTitle">
        <a class="back-link" href="${homeHref()}">${icon("calendar")}<span>${rawT("backToHome")}</span></a>
        <header class="legal-header">
          <h1 id="legalTitle">${pageTitle}</h1>
          <p>${pageUpdated}</p>
        </header>
        <div class="legal-body">
          ${honorificLegalNoticeTemplate()}
          ${pageIntro.map((paragraph) => `<p>${paragraph}</p>`).join("")}
          ${pageSections.map((section, index) => `
            <section class="legal-section" aria-labelledby="legalSection${index + 1}">
              <h2 id="legalSection${index + 1}">${section.title}</h2>
              ${section.body.map((paragraph) => legalParagraphTemplate(page, paragraph)).join("")}
            </section>
          `).join("")}
        </div>
      </article>
    </main>
    ${siteFooterTemplate()}
  `;
}

function historyPageTemplate() {
  return `
    <main>
      <article class="legal-card history-card" aria-labelledby="legalTitle">
        <a class="back-link" href="${homeHref()}">${icon("calendar")}<span>${t("backToHome")}</span></a>
        <header class="legal-header">
          <h1 id="legalTitle">${rawT("historyTitle")}</h1>
        </header>
        <div class="legal-body history-body">
          ${rawT("historyBody").map((paragraph) => `<p>${paragraph}</p>`).join("")}
        </div>
      </article>
    </main>
    ${siteFooterTemplate()}
  `;
}

function honorificLegalNoticeTemplate() {
  if (!isHonorificBirthday()) return "";
  return `
    <p class="legal-note">
      슈퍼생일은 앱의 공식 명칭입니다. 슈퍼생신은 한국어 화면에서 선택할 수 있는 표시 방식이며, 별도의 서비스나 법적 명칭이 아닙니다.
    </p>
  `;
}

function updateLogTemplate() {
  return `
    <main>
      <article class="legal-card update-log-card" aria-labelledby="legalTitle">
        <a class="back-link" href="${homeHref()}">${icon("calendar")}<span>${t("backToHome")}</span></a>
        <header class="legal-header">
          <h1 id="legalTitle">${t("updatesTitle")}</h1>
          <p>${t("updatesUpdated")}</p>
        </header>
        <div class="legal-body update-log-body">
          <p>${t("updatesIntro")}</p>
          <div class="updates-list">
            ${t("updatesEntries").map((entry, index) => `
              <section class="update-entry" aria-labelledby="updateEntry${index + 1}">
                <header>
                  <h2 id="updateEntry${index + 1}">${entry.version}</h2>
                  ${entry.dateIso ? `<time datetime="${entry.dateIso}">${entry.date}</time>` : `<span class="update-status">${entry.date}</span>`}
                </header>
                <ul>
                  ${entry.items.map((item) => `<li>${item}</li>`).join("")}
                </ul>
              </section>
            `).join("")}
          </div>
        </div>
      </article>
    </main>
    ${siteFooterTemplate()}
  `;
}

function legalParagraphTemplate(page, paragraph) {
  if (page === "terms" && paragraph.includes("Privacy Policy")) {
    return `<p>${paragraph.replace("Privacy Policy", `<a href="${privacyHref()}">Privacy Policy</a>`)}</p>`;
  }
  if (page === "terms" && paragraph.includes("개인정보 처리방침")) {
    return `<p>${paragraph.replace("개인정보 처리방침", `<a href="${privacyHref()}">개인정보 처리방침</a>`)}</p>`;
  }
  return `<p>${paragraph}</p>`;
}

function siteFooterTemplate() {
  return `
    <footer class="site-footer">
      <a href="${historyHref()}">${t("historyLink")}</a>
      <a href="${privacyHref()}">${t("privacyLink")}</a>
      <a href="${termsHref()}">${t("termsLink")}</a>
      <a href="${updatesHref()}">${t("updatesLink")}</a>
    </footer>
  `;
}

function resultsTemplate() {
  const { result } = state;
  const sourceNote = result.lunarBirthday.isLeapMonth ? t("recurrenceNoteLeap") : t("recurrenceNoteRegular");
  return `
    <section id="searchResults" class="summary-card" aria-labelledby="matchingTitle" tabindex="-1">
      <div class="section-heading section-heading-with-action">
        <div class="heading-copy">
          <span class="mini-icon">${icon("calendar")}</span>
          <div>
            <h2 id="matchingTitle">${t("matchingYears")}</h2>
            <p>${t("showThrough")}</p>
          </div>
        </div>
        ${downloadButtonTemplate("normal")}
      </div>
      <div class="converted">
        <strong>${t("converted")}</strong>
        <span>${formatSolar(result.solarBirthday, state.lang)}</span>
        <span>${formatLunar(result.lunarBirthday, state.lang)}</span>
      </div>
      <p class="result-copy">${t("matchingDescription")}</p>
      <p class="recurrence">${sourceNote}</p>
      ${result.matches.length ? `
        <div class="year-chips">
          ${result.matches.map((year) => `<span class="year-chip">${formatYear(year, state.lang)}</span>`).join("")}
        </div>` : `
        <div class="empty-state">
          <strong>${t("noMatchesTitle")}</strong>
          <span>${t("noMatchesBody")}</span>
        </div>`}
    </section>
    <section class="table-section" aria-labelledby="allYearsTitle">
      <div class="section-heading">
        <span class="mini-icon">${icon("celebration")}</span>
        <div>
          <h2 id="allYearsTitle">${t("allYears")}</h2>
          <p>${t("addThrough")}</p>
        </div>
      </div>
      ${tableTemplate(result.rows)}
      <p class="footer-note">${t("footerNote")}</p>
    </section>
  `;
}

function reverseResultsTemplate() {
  const { reverseResult } = state;
  const missingCount = reverseResult.rows.filter((row) => row.missingReason).length;
  return `
    <section id="searchResults" class="summary-card reverse-results" aria-labelledby="reverseMatchingTitle" tabindex="-1">
      <div class="section-heading section-heading-with-action">
        <div class="heading-copy">
          <span class="mini-icon">${icon("calendar")}</span>
          <div>
            <h2 id="reverseMatchingTitle">${t("matchingYears")}</h2>
            <p>${t("reverseYearRange")}</p>
          </div>
        </div>
        ${downloadButtonTemplate("reverse")}
      </div>
      <div class="converted">
        <strong>${t("targetDate")}</strong>
        <span>${formatSolar(reverseResult.targetDate, state.lang, false)}</span>
        <span>${formatLunar(reverseResult.targetLunarBirthday, state.lang, false)}</span>
      </div>
      <p class="result-copy">${t("reverseMatchingDescription")}</p>
      ${missingCount ? `<p class="recurrence">${t("missingReverseDates")}: ${missingCount}</p>` : ""}
      ${reverseSummaryYearsTemplate(reverseResult.matches)}
      <button type="button" id="copyResults" class="copy-button">
        ${icon("copy")}<span>${state.copyMessage || t("copyResults")}</span>
      </button>
    </section>
    <section class="table-section" aria-labelledby="reverseAllYearsTitle">
      <div class="section-heading">
        <span class="mini-icon">${icon("celebration")}</span>
        <div>
          <h2 id="reverseAllYearsTitle">${t("allYears")}</h2>
          <p>${t("reverseYearRange")}</p>
        </div>
      </div>
      ${reverseTableTemplate(reverseResult.rows)}
      <p class="footer-note">${t("footerNote")}</p>
    </section>
  `;
}

function downloadButtonTemplate(kind) {
  return `
    <button type="button" class="download-button" data-download-ics="${kind}" aria-label="${escapeAttr(t("downloadCalendar"))}" title="${escapeAttr(t("downloadCalendar"))}">
      ${icon("download")}
    </button>
  `;
}

function reverseSummaryYearsTemplate(matches) {
  if (!matches.length) {
    return `
      <div class="empty-state">
        <strong>${t("noMatchesTitle")}</strong>
        <span>${t("noMatchesBody")}</span>
      </div>
    `;
  }
  const preview = matches.length > 6 ? [...matches.slice(0, 3), ...matches.slice(-3)] : matches;
  return `
    <div class="year-chips reverse-year-chips">
      ${preview.map((row) => `<span class="year-chip">${formatYear(row.year, state.lang)}</span>`).join("")}
      ${matches.length > preview.length ? `<span class="year-chip muted-year-chip">${t("moreYears").replace("{count}", String(matches.length - preview.length))}</span>` : ""}
    </div>
  `;
}

function tableTemplate(rows) {
  const display = getDisplayRows(rows, state.expanded);
  const allRows = display.hasControl ? [...display.before, "control", ...display.middle, ...display.after] : display.before;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${t("year")}</th>
            <th>${t("solarBirthday")}</th>
            <th>${t("gregorianLunarBirthday")}</th>
            <th>${t("lunarBirthday")}</th>
            <th>${t("match")}</th>
          </tr>
        </thead>
        <tbody>
          ${allRows.map((row) => row === "control" ? expandRow(display.omitted) : tableRow(row)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function expandRow(omitted) {
  return `
    <tr class="expand-row">
      <td colspan="5">
        <button type="button" id="expandButton" class="expand-button" aria-expanded="${state.expanded}">
          ${state.expanded ? t("collapse") : t("expand")}
          <small>${state.expanded ? t("hide") : `${t("showAll")} · ${omitted}`}</small>
        </button>
      </td>
    </tr>
  `;
}

function reverseTableTemplate(rows) {
  const display = getDisplayRows(rows, state.expanded);
  const allRows = display.hasControl ? [...display.before, "control", ...display.middle, ...display.after] : display.before;
  return `
    <div class="table-wrap">
      <table class="reverse-table">
        <thead>
          <tr>
            <th>${t("year")}</th>
            <th>${t("solarBirthDate")}</th>
            <th>${t("gregorianLunarBirthday")}</th>
            <th>${t("lunarBirthDate")}</th>
            <th>${t("match")}</th>
          </tr>
        </thead>
        <tbody>
          ${allRows.map((row) => row === "control" ? reverseExpandRow(display.omitted) : reverseTableRow(row)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function reverseExpandRow(omitted) {
  return `
    <tr class="expand-row">
      <td colspan="5">
        <button type="button" id="expandButton" class="expand-button" aria-expanded="${state.expanded}">
          ${state.expanded ? t("collapse") : t("expand")}
          <small>${state.expanded ? t("hide") : `${t("showAll")} · ${omitted}`}</small>
        </button>
      </td>
    </tr>
  `;
}

function reverseTableRow(row) {
  return `
    <tr class="${row.isMatch ? "matched" : ""}">
      <td>${formatYear(row.year, state.lang)}</td>
      <td>${row.solarBirthday ? formatIsoDate(row.solarBirthday) : `<span class="muted">${t("missing")}</span>`}</td>
      <td>${row.recurrentSolar ? formatSolar(row.recurrentSolar, state.lang, false) : `<span class="muted">${t("missing")}</span>`}</td>
      <td>${row.lunarBirthday ? formatLunar(row.lunarBirthday, state.lang, false) : `<span class="muted">${t("missing")}</span>`}</td>
      <td>${statusCell(row)}</td>
    </tr>
  `;
}

function tableRow(row) {
  return `
    <tr class="${row.isMatch ? "matched" : ""}">
      <td>${formatYear(row.year, state.lang)}</td>
      <td>${formatSolar(row.solarBirthday, state.lang, false)}</td>
      <td>${row.recurrentSolar ? formatSolar(row.recurrentSolar, state.lang, false) : `<span class="muted">${t("missing")}</span>`}</td>
      <td>${formatLunar(row.lunarBirthday, state.lang, false)}</td>
      <td>${statusCell(row)}</td>
    </tr>
  `;
}

function statusCell(row) {
  if (row.isMatch) {
    return `<span class="status yes">${icon("check")}<span>${t("matchLabel")}</span></span>`;
  }
  return `<span class="status no">${icon("x")}<span>${row.missingReason ? t("missing") : t("noMatch")}</span></span>`;
}

function bindEvents() {
  document.querySelector("[data-reset-search]")?.addEventListener("click", () => {
    resetSearch();
    render();
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      state.lang = button.dataset.lang;
      localStorage.setItem(storageKeys.lang, state.lang);
      render();
    });
  });

  document.querySelectorAll("[data-appearance]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.appearance;
      localStorage.setItem(storageKeys.theme, state.theme);
      applyTheme();
      render();
    });
  });

  document.querySelectorAll('input[name="birthdayTerm"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.birthdayTerm = input.value === "honorific" ? "honorific" : "birthday";
      localStorage.setItem(storageKeys.birthdayTerm, state.birthdayTerm);
      state.downloadHonorificBirthday = isHonorificBirthday();
      render();
    });
  });

  document.querySelector("[data-lang-select]")?.addEventListener("change", (event) => {
    state.lang = event.currentTarget.value;
    localStorage.setItem(storageKeys.lang, state.lang);
    render();
  });

  document.querySelector("[data-appearance-select]")?.addEventListener("change", (event) => {
    state.theme = event.currentTarget.value;
    localStorage.setItem(storageKeys.theme, state.theme);
    applyTheme();
    render();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      localStorage.setItem(storageKeys.mode, state.mode);
      state.error = "";
      state.result = null;
      render();
    });
  });

  document.querySelectorAll("[data-reverse-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reverseMode = button.dataset.reverseMode;
      state.error = "";
      state.reverseResult = null;
      state.copyMessage = "";
      state.expanded = false;
      render();
    });
  });

  document.querySelectorAll('input[name="searchMode"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.searchMode = input.value;
      state.error = "";
      state.result = null;
      state.reverseResult = null;
      state.expanded = false;
      render();
    });
  });

  const secretPeriod = document.querySelector(".secret-period");
  if (secretPeriod) {
    secretPeriod.addEventListener("click", () => {
      state.passwordAction = state.reverseUnlocked && state.searchMode === "reverse" ? "lock" : "unlock";
      state.passwordModalOpen = true;
      state.password = "";
      state.passwordError = "";
      render();
      document.querySelector("#passwordInput")?.focus();
    });
  }

  const passwordForm = document.querySelector("#passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault();
      unlockReverseSearch(new FormData(passwordForm).get("password") || "");
    });
  }

  const closePasswordButton = document.querySelector("[data-close-password]");
  if (closePasswordButton) {
    closePasswordButton.addEventListener("click", () => {
      state.passwordModalOpen = false;
      state.password = "";
      state.passwordError = "";
      state.passwordAction = "unlock";
      render();
    });
  }

  const downloadForm = document.querySelector("#downloadForm");
  if (downloadForm) {
    downloadForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(downloadForm);
      state.downloadName = String(form.get("downloadName") || "").trim();
      state.downloadHonorificBirthday = form.get("downloadBirthdayTerm") === "honorific";
      setDownloadYears(form.get("downloadStartYear") || state.downloadStartYear, form.get("downloadEndYear") || state.downloadEndYear);
      downloadCalendar();
    });
  }

  bindDownloadRangeInput("[data-download-start-year]");
  bindDownloadRangeInput("[data-download-end-year]");

  const closeDownloadButton = document.querySelector("[data-close-download]");
  if (closeDownloadButton) {
    closeDownloadButton.addEventListener("click", () => {
      closeDownloadModal();
      render();
    });
  }

  const formElement = document.querySelector("#birthdayForm");
  if (formElement) {
    formElement.addEventListener("submit", (event) => {
      event.preventDefault();
      syncFieldsFromForm(event.currentTarget);
      submit();
    });
  }

  const primaryButton = document.querySelector(".primary-button");
  if (primaryButton && formElement) {
    primaryButton.addEventListener("click", (event) => {
      event.preventDefault();
      syncFieldsFromForm(formElement);
      submit();
    });
  }

  const expandButton = document.querySelector("#expandButton");
  if (expandButton) {
    expandButton.addEventListener("click", () => {
      const top = expandButton.getBoundingClientRect().top;
      state.expanded = !state.expanded;
      render();
      const next = document.querySelector("#expandButton");
      if (next) window.scrollBy({ top: next.getBoundingClientRect().top - top });
    });
  }

  const copyButton = document.querySelector("#copyResults");
  if (copyButton) {
    copyButton.addEventListener("click", () => copyReverseResults());
  }

  document.querySelectorAll("[data-download-ics]").forEach((button) => {
    button.addEventListener("click", () => openDownloadModal(button.dataset.downloadIcs));
  });
}

function syncFieldsFromForm(formElement) {
  const form = new FormData(formElement);
  if (state.reverseUnlocked && state.searchMode === "reverse") {
    state.reverseFields = {
      year: String(form.get("year") || "").trim(),
      month: String(form.get("month") || "").trim(),
      day: String(form.get("day") || "").trim(),
      isLeapMonth: form.get("reverseIsLeapMonth") || state.reverseFields.isLeapMonth || "false"
    };
    return;
  }
  state.fields = {
    year: String(form.get("year") || "").trim(),
    month: String(form.get("month") || "").trim(),
    day: String(form.get("day") || "").trim(),
    isLeapMonth: form.get("isLeapMonth") || state.fields.isLeapMonth || "false"
  };
}

function submit() {
  if (state.reverseUnlocked && state.searchMode === "reverse") {
    submitReverse();
    return;
  }
  const year = Number(state.fields.year);
  const month = Number(state.fields.month);
  const day = Number(state.fields.day);
  const isLeapMonth = state.fields.isLeapMonth === "true";
  const validation = validateInput(year, month, day, isLeapMonth);
  if (validation) {
    state.error = t(validation);
    state.result = null;
    render();
    return;
  }
  try {
    state.result = calculateMatches({ mode: state.mode, year, month, day, isLeapMonth });
    state.error = "";
    state.expanded = false;
    updateUrl(year, month, day, isLeapMonth);
  } catch (error) {
    state.error = t(error.message in translations[state.lang] ? error.message : "conversionFailure");
    state.result = null;
  }
  render();
  focusSearchResults();
}

function submitReverse() {
  const year = Number(state.reverseFields.year);
  const month = Number(state.reverseFields.month);
  const day = Number(state.reverseFields.day);
  const isLeapMonth = state.reverseFields.isLeapMonth === "true";
  const validation = validateReverseInput(year, month, day, isLeapMonth);
  if (validation) {
    state.error = t(validation);
    state.reverseResult = null;
    render();
    return;
  }
  try {
    state.reverseResult = calculateReverseMatches({ mode: state.reverseMode, year, month, day, isLeapMonth });
    state.error = "";
    state.copyMessage = "";
    state.expanded = false;
  } catch (error) {
    state.error = t(error.message in translations[state.lang] ? error.message : "conversionFailure");
    state.reverseResult = null;
  }
  render();
  focusSearchResults();
}

function focusSearchResults() {
  const focusAndScroll = () => {
    const results = document.querySelector("#searchResults");
    if (!results) return;
    try {
      results.focus({ preventScroll: true });
    } catch (_error) {
      results.focus();
    }
    results.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  focusAndScroll();
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(focusAndScroll);
  } else {
    window.setTimeout(focusAndScroll, 0);
  }
}

function validateInput(year, month, day, isLeapMonth) {
  if (!state.fields.year || !state.fields.month || !state.fields.day) return "missingFields";
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "missingFields";
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return "unsupportedYear";
  if (!Number.isInteger(month) || month < 1 || month > 12) return state.mode === "solar" ? "invalidGregorian" : "invalidLunar";
  if (!Number.isInteger(day) || day < 1 || day > 30 + (state.mode === "solar" ? 1 : 0)) return "invalidDay";
  if (state.mode === "solar" && !isGregorianDate(year, month, day)) return "invalidGregorian";
  if (state.mode === "lunar") {
    const convertedSolar = lunarToSolar(year, month, day, isLeapMonth);
    if (!convertedSolar) return isLeapMonth ? "invalidLeap" : "invalidDay";
  }
  return "";
}

function validateReverseInput(year, month, day, isLeapMonth) {
  if (!state.reverseFields.year || !state.reverseFields.month || !state.reverseFields.day) return "missingFields";
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "missingFields";
  if (!Number.isInteger(year) || year < 1900 || year > MAX_YEAR) return "reverseUnsupportedYear";
  if (!Number.isInteger(month) || month < 1 || month > 12) return state.reverseMode === "solar" ? "invalidGregorian" : "invalidLunar";
  if (!Number.isInteger(day) || day < 1 || day > 30 + (state.reverseMode === "solar" ? 1 : 0)) return "invalidDay";
  if (state.reverseMode === "solar" && !isGregorianDate(year, month, day)) return "invalidGregorian";
  if (state.reverseMode === "lunar") {
    const convertedSolar = lunarToSolar(year, month, day, isLeapMonth);
    if (!convertedSolar) return isLeapMonth ? "invalidLeap" : "invalidDay";
  }
  return "";
}

function unlockReverseSearch(value) {
  state.password = String(value);
  if (!isAcceptedPassword(state.password)) {
    state.passwordError = t("passwordError");
    render();
    document.querySelector("#passwordInput")?.focus();
    return;
  }
  if (state.passwordAction === "lock") {
    resetInternalSearch();
    render();
    return;
  }
  state.reverseUnlocked = true;
  state.searchMode = "normal";
  state.passwordModalOpen = false;
  state.passwordAction = "unlock";
  state.password = "";
  state.passwordError = "";
  render();
}

function resetInternalSearch() {
  state.reverseUnlocked = false;
  state.passwordModalOpen = false;
  state.password = "";
  state.passwordError = "";
  state.passwordAction = "unlock";
  state.searchMode = "normal";
  state.reverseMode = "solar";
  state.mode = "solar";
  state.fields = { year: "", month: "", day: "", isLeapMonth: "false" };
  state.reverseFields = { ...todayFields(), isLeapMonth: "false" };
  state.result = null;
  state.reverseResult = null;
  state.error = "";
  state.downloadModalOpen = false;
  state.downloadKind = "normal";
  state.downloadName = "";
  state.downloadStartYear = "";
  state.downloadEndYear = "";
  state.downloadMaxYear = "";
  state.downloadHonorificBirthday = false;
  state.copyMessage = "";
  state.expanded = false;
  localStorage.removeItem(storageKeys.reverseUnlocked);
  localStorage.setItem(storageKeys.mode, state.mode);
  history.replaceState(null, "", location.pathname);
}

function resetSearch() {
  state.mode = "solar";
  state.searchMode = "normal";
  state.reverseMode = "solar";
  state.fields = { year: "", month: "", day: "", isLeapMonth: "false" };
  state.reverseFields = { ...todayFields(), isLeapMonth: "false" };
  state.result = null;
  state.reverseResult = null;
  state.error = "";
  state.password = "";
  state.passwordError = "";
  state.passwordModalOpen = false;
  state.passwordAction = "unlock";
  state.downloadModalOpen = false;
  state.downloadKind = "normal";
  state.downloadName = "";
  state.downloadStartYear = "";
  state.downloadEndYear = "";
  state.downloadMaxYear = "";
  state.downloadHonorificBirthday = false;
  state.copyMessage = "";
  state.expanded = false;
  localStorage.setItem(storageKeys.mode, state.mode);
  history.replaceState(null, "", location.pathname);
}

function currentLegalPage() {
  if (/\/privacy\/?(index\.html)?$/.test(location.pathname)) return "privacy";
  if (/\/terms\/?(index\.html)?$/.test(location.pathname)) return "terms";
  if (/\/updates\/?(index\.html)?$/.test(location.pathname)) return "updates";
  if (/\/history\/?(index\.html)?$/.test(location.pathname)) return "history";
  return "";
}

function assetUrl(filename) {
  return currentLegalPage() ? `../${filename}` : filename;
}

function privacyHref() {
  return currentLegalPage() ? "../privacy/index.html" : "privacy/index.html";
}

function termsHref() {
  return currentLegalPage() ? "../terms/index.html" : "terms/index.html";
}

function updatesHref() {
  return currentLegalPage() ? "../updates/index.html" : "updates/index.html";
}

function historyHref() {
  return currentLegalPage() ? "../history/index.html" : "history/index.html";
}

function homeHref() {
  return currentLegalPage() ? "../index.html" : "index.html";
}

function isAcceptedPassword(value) {
  const trimmed = String(value).trim();
  const latin = trimmed.replace(/\s+/g, " ").toLowerCase();
  return latin === "tbvjvkxl" || latin === "super party" || trimmed === "슈퍼파티" || trimmed === "녀ㅔㄷ겜ㄱ쇼";
}

async function copyReverseResults() {
  if (!state.reverseResult) return;
  const text = reverseCopyText(state.reverseResult);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  state.copyMessage = t("copied");
  render();
}

function openDownloadModal(kind) {
  state.downloadKind = kind === "reverse" ? "reverse" : "normal";
  const bounds = getDownloadBounds();
  state.downloadName = "";
  state.downloadStartYear = String(bounds.startYear);
  state.downloadEndYear = String(bounds.maxYear);
  state.downloadMaxYear = String(bounds.maxYear);
  state.downloadHonorificBirthday = isHonorificBirthday();
  state.downloadModalOpen = true;
  render();
  document.querySelector("#downloadNameInput")?.focus();
}

function closeDownloadModal() {
  state.downloadModalOpen = false;
  state.downloadKind = "normal";
  state.downloadName = "";
  state.downloadStartYear = "";
  state.downloadEndYear = "";
  state.downloadMaxYear = "";
  state.downloadHonorificBirthday = false;
}

function downloadCalendar() {
  const result = state.downloadKind === "reverse" ? state.reverseResult : state.result;
  if (!result) return;
  const startYear = Number(state.downloadStartYear) || getDownloadBounds().startYear;
  const endYear = Number(state.downloadEndYear) || getDownloadBounds().maxYear;
  const calendar = state.downloadKind === "reverse"
    ? createReverseIcs({ result, lang: state.lang, name: state.downloadName, startYear, endYear })
    : createBirthdayIcs({
        result,
        lang: state.lang,
        name: state.downloadName,
        birthdayTerm: state.downloadHonorificBirthday ? "honorific" : "birthday",
        startYear,
        endYear
      });
  closeDownloadModal();
  downloadTextFile(calendar.content, calendar.filename);
  render();
}

function bindDownloadRangeInput(selector) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.addEventListener("input", () => {
    const startInput = document.querySelector("[data-download-start-year]");
    const endInput = document.querySelector("[data-download-end-year]");
    setDownloadYears(startInput?.value || state.downloadStartYear, endInput?.value || state.downloadEndYear);
    if (startInput) startInput.value = state.downloadStartYear;
    if (endInput) endInput.value = state.downloadEndYear;
    updateDownloadRangeDisplay();
  });
}

function setDownloadYears(startValue, endValue) {
  const bounds = getDownloadBounds();
  let startYear = clampYear(Number(startValue), bounds.startYear, bounds.maxYear);
  let endYear = clampYear(Number(endValue), bounds.startYear, bounds.maxYear);
  if (startYear > endYear) {
    if (String(startValue) === state.downloadStartYear) startYear = endYear;
    else endYear = startYear;
  }
  state.downloadStartYear = String(startYear);
  state.downloadEndYear = String(endYear);
}

function updateDownloadRangeDisplay() {
  const bounds = getDownloadBounds();
  const startYear = Number(state.downloadStartYear);
  const endYear = Number(state.downloadEndYear);
  const count = getDownloadEventCount(state.downloadKind, startYear, endYear);
  document.querySelector("[data-download-start-text]")?.replaceChildren(formatYear(startYear, state.lang));
  document.querySelector("[data-download-end-text]")?.replaceChildren(formatYear(endYear, state.lang));
  document.querySelector("[data-download-count-text]")?.replaceChildren(t("downloadCountValue").replace("{count}", String(count)));
  document.querySelector(".dual-range")?.setAttribute("style", downloadRangeStyle(bounds.startYear, bounds.maxYear, startYear, endYear));
}

function getDownloadBounds(kind = state.downloadKind) {
  const years = getDownloadEventYears(kind);
  if (!years.length) return { startYear: MAX_YEAR, maxYear: MAX_YEAR };
  return { startYear: years[0], maxYear: years.at(-1) };
}

function getDownloadEventYears(kind = state.downloadKind) {
  if (kind === "reverse") {
    return (state.reverseResult?.matches || [])
      .filter((row) => row.solarBirthday)
      .map((row) => row.solarBirthday.year);
  }
  return (state.result?.rows || [])
    .filter((row) => row.recurrentSolar)
    .map((row) => row.recurrentSolar.year);
}

function getDownloadEventCount(kind, startYear, endYear) {
  return getDownloadEventYears(kind).filter((year) => year >= startYear && year <= endYear).length;
}

function downloadRangeStyle(minYear, maxYear, startYear, endYear) {
  const span = Math.max(maxYear - minYear, 1);
  const startPercent = ((startYear - minYear) / span) * 100;
  const endPercent = ((endYear - minYear) / span) * 100;
  return `--range-start: ${startPercent}%; --range-end: ${endPercent}%;`;
}

function clampYear(year, minYear, maxYear) {
  if (!Number.isFinite(year)) return minYear;
  return Math.min(maxYear, Math.max(minYear, Math.round(year)));
}

function reverseCopyText(result) {
  const exactDates = result.matches.map((row) => formatIsoDate(row.solarBirthday));
  const missingYears = result.rows.filter((row) => !row.solarBirthday).map((row) => String(row.year));
  return [
    t("reverseCopyHeading"),
    `${t("targetDate")}: ${formatSolar(result.targetDate, state.lang, false)}`,
    `${t("lunarBirthday")}: ${formatLunar(result.targetLunarBirthday, state.lang, false)}`,
    "",
    t("reverseCopyPrompt"),
    "",
    ...exactDates,
    ...(missingYears.length ? ["", `${t("missingReverseDates")}: ${missingYears.join(", ")}`] : [])
  ].join("\n");
}

function updateUrl(year, month, day, isLeapMonth) {
  const params = new URLSearchParams({ calendar: state.mode, year: String(year), month: String(month), day: String(day) });
  if (state.mode === "lunar") params.set("leap", String(isLeapMonth));
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  const calendar = params.get("calendar");
  if (calendar === "solar" || calendar === "lunar") state.mode = calendar;
  const year = params.get("year");
  const month = params.get("month");
  const day = params.get("day");
  if (year && month && day) {
    state.fields = { year, month, day, isLeapMonth: params.get("leap") === "true" ? "true" : "false" };
    try {
      state.result = calculateMatches({
        mode: state.mode,
        year: Number(year),
        month: Number(month),
        day: Number(day),
        isLeapMonth: state.fields.isLeapMonth === "true"
      });
    } catch {
      state.result = null;
    }
  }
}

function applyTheme() {
  const resolved = state.theme === "system" ? (media.matches ? "dark" : "light") : state.theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = state.theme;
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--theme-color").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor || (resolved === "dark" ? "#071020" : "#ffffff"));
}

function brandIcon() {
  return `
    <img class="brand-image" src="${assetUrl("logo.png")}" alt="" aria-hidden="true" />
  `;
}

function icon(name) {
  const paths = {
    sparkle: '<path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    calendarStar: '<rect x="3" y="5" width="16" height="16" rx="2"/><path d="M15 3v4M7 3v4M3 10h16"/><path d="M18.4 13.4l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.8z"/>',
    cake: '<path d="M7 21h10"/><path d="M6 17h12v4H6z"/><path d="M8 13h8a3 3 0 0 1 3 3v1H5v-1a3 3 0 0 1 3-3z"/><path d="M12 3v5"/><path d="M10.5 6.5L12 8l1.5-1.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/><path d="M4 4l2.2 2.2M20 4l-2.2 2.2"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11"/><path d="M12 9H8.5a2.5 2.5 0 1 1 2.1-3.8L12 9z"/><path d="M12 9h3.5a2.5 2.5 0 1 0-2.1-3.8L12 9z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M19.7 14.9A7.6 7.6 0 0 1 9.1 4.3a8 8 0 1 0 10.6 10.6z"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    celebration: '<path d="M4 20l5-16 11 11L4 20z"/><path d="M13 5l2-2M17 9l3-3M14 13l4 4"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

function todayFields() {
  const today = new Date();
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    day: String(today.getDate())
  };
}
