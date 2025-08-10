// settings.js
import { openDatabase } from "./db.js";
import { fetchSheetData } from "./googleSheets.js";
import { UI } from "../content-scripts/ui/settings.js";
import { settings } from "../models/settingsModel.js";

let db;

// Load settings from IndexedDB and update the imported `settings` object
export async function loadSettings() {
  db = await openDatabase();
  const tx = db.transaction("settings", "readonly");
  const store = tx.objectStore("settings");

  return new Promise((resolve) => {
    const req = store.get(1);
    req.onsuccess = (e) => {
      const result = e.target.result?.settings;
      if (result) {
        Object.assign(settings, result); // Mutate existing object
        resolve(settings);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

// Save the updated `settings` object to IndexedDB
export async function saveSettings() {
  if (!db) db = await openDatabase(); // Ensure DB is opened

  const transaction = db.transaction("settings", "readwrite");
  const store = transaction.objectStore("settings");
  store.put({ id: 1, settings });

  transaction.oncomplete = function () {
    console.log("Settings updated in IndexedDB.");
    const backToMap = document.querySelector('a[id="backToMap1"]');
    if (backToMap) backToMap.click();
  };

  transaction.onerror = function () {
    console.error("Error updating settings in IndexedDB.");
  };
}

// Update `settings` object based on UI elements and optionally Google Sheets
export async function updateSettings() {
  const amountElement = document.querySelector(
    ".tickets_select > .tickets_selector_selected"
  );
  const amount = amountElement
    ? parseInt(amountElement.getAttribute("data-value"))
    : null;

  const googleSheetsSettings =
    document.querySelector('body .tickets_popup_wrapper input[name="settings"]')
      ?.value || "";

  const parentSelector = "body .tickets.tickets_popup_wrapper";

  const interval = document.querySelector(`${parentSelector} input[name="interval"]`).value;

  const minPriceEl = document.querySelector(`${parentSelector} input[name="minimum_price"]`)
  const maxPriceEl = document.querySelector(`${parentSelector} input[name="maximum_price"]`)
  const minimumPrice = minPriceEl.value ?? ""
  const maximumPrice = maxPriceEl.value ?? "";
  const dateElement = document.querySelector(
    ".date_select > .tickets_selector_selected"
  );
  const date = dateElement ? dateElement.getAttribute("data-value") : "";

  const getSelectedValues = (selector) =>
    Array.from(
      document.querySelectorAll(
        `${parentSelector} ${selector} > div.selector_selected`
      )
    ).map((el) => el.getAttribute("data-value"));

  Object.assign(settings, {
    amount,
    googleSheetsSettings,
    date,
    categories: getSelectedValues(".category_select"),
    sessions: getSelectedValues(".session_select"),
    courts: getSelectedValues(".court_select"),
    stopExecutionFlag: undefined,
    secondsToRestartIfNoTicketsFound: parseInt(interval) || 15,
    minPrice: minimumPrice ? parseInt(minimumPrice) : null,
    maxPrice: maximumPrice ? parseInt(maximumPrice) : null,
  });

  if (googleSheetsSettings) {
    settings.advancedSettings = await fetchSheetData(googleSheetsSettings);
    console.log(
      "Fetched advancedSettings from Google Sheets:",
      settings.advancedSettings
    );
  } else {
    settings.advancedSettings = [];
  }

  console.log("Updated settings:", settings);

  await saveSettings();
  UI.closePopup();
  window.location.reload();
}
