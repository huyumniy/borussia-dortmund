import GoogleSheetClient from "./services/sheetsApi.js";
import config from '../config.json';

async function fetchAndCacheSheet() {
  try {
    const client = new GoogleSheetClient(config.sheets_link, 'main');
    const data = await client.fetchSheetData();
    await chrome.storage.local.set({ sheetData: data });
    console.log('Sheet data cached', data);
  } catch (err) {
    console.error('Failed to fetch sheet', err);
  }
}
chrome.runtime.onInstalled.addListener(() => {
  fetchAndCacheSheet();
  chrome.alarms.create('refreshSheet', { periodInMinutes: config.sheets_refresh_interval_minutes });
});

chrome.runtime.onStartup.addListener(() => {
  fetchAndCacheSheet();
  chrome.alarms.get('refreshSheet', alarm => {
    if (!alarm) {
      chrome.alarms.create('refreshSheet', { periodInMinutes: config.sheets_refresh_interval_minutes });
    }
  });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'refreshSheet') {
    fetchAndCacheSheet();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSheetData') {
    chrome.storage.local.get('sheetData', result => {
      sendResponse({ data: result.sheetData });
    });
    return true;
  }
});