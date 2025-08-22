import { waitForElement } from "./utils/observer.js";

(async function injectSeatSelectionData() {
  const MAX_TRIES = 50;
  const INTERVAL = 100;
  let tries = 0;
  await waitForElement('#animation-overlay[style="display: none;"]', 30000)

    // Inject script after inline scripts that declare seatSelection
  document.querySelectorAll('script').forEach((s) => {
    try {
      const text = s.textContent || '';
      if (/seatSelection/.test(text)) {
        const captureScript = document.createElement('script');
        captureScript.textContent = `
          (function() {
            try {
              if (typeof seatSelection !== 'undefined') {
                window.__seatSelection__ = seatSelection;
                console.log('[Injected] seatSelection captured');
              }
            } catch(e){}
          })();
        `;
        s.parentNode.insertBefore(captureScript, s.nextSibling);
      }
    } catch (e) {}
  });

  const timer = setInterval(() => {
    console.log('[DEBUG] Checking for window.__seatSelection__')
    tries++;
    const seatSelection = window.__seatSelection__;

    if (seatSelection?.options?.areaList && seatSelection?.options?.sms?.seatmap?.seatmap?.areas?.[0]) {
      clearInterval(timer);

      const rawAreaList = seatSelection.options.areaList;
      const rawSmsBlocks = seatSelection.options.sms.seatmap.seatmap.areas[0].blocks;
      const priceCategories = seatSelection.options.sms.seatmap.seatmap.priceCategories;
      const requestParams = seatSelection.options.sms.options.params;
      const blockIdToBlock = seatSelection.options.sms.seatmap.seatmap.blockIdToBlock

      const data = {
        areaList: cleanForJSON(rawAreaList),
        smsBlocks: cleanForJSON(rawSmsBlocks),
        priceCategories: cleanForJSON(priceCategories),
        requestParams: cleanForJSON(requestParams),
        blockIdToBlock: cleanForJSON(blockIdToBlock)
      };

      const container = document.createElement("div");
      container.id = "__seat-selection__";
      container.type = "application/json";
      container.style.display = "none";
      container.textContent = JSON.stringify(data);

      document.documentElement.appendChild(container);
      console.log("[Success] seatSelection data injected into DOM element");
    } else if (tries >= MAX_TRIES) {
      clearInterval(timer);
      console.warn("[Error] seatSelection data not found");
    }
  }, INTERVAL);

  function cleanForJSON(value, seen = new WeakSet()) {
    if (value === null) return null;

    if (isPrimitive(value)) return value;

    if (Array.isArray(value)) {
        return value.map(item => cleanForJSON(item, seen))
    }

    if (typeof value === 'object') {
        if (seen.has(value)) return undefined;
        seen.add(value);

        const cleanedObject = {};

        const keys = Object.keys(value);
        for (const key of keys) {
            const property = value[key];

            if (isSkippable(property)) {
                continue;
            }

            const cleanedValue = cleanForJSON(property, seen);
            if (cleanedValue !== undefined) {
                cleanedObject[key] = cleanedValue;
            }
        }

        return cleanedObject;
    }

    return undefined;
  }

  function isPrimitive(val) {
    return (
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean'
    );
  }

  function isSkippable(val) {
    return (
        val instanceof Element ||
        val instanceof Node ||
        typeof val === 'function' ||
        typeof val === 'undefined' ||
        typeof val === 'symbol'
    );
  }
})();
