import { waitForElement } from "./utils/observer.js";

(async function injectSeatSelectionData() {
  const MAX_TRIES = 50;
  const INTERVAL = 100;
  let tries = 0;
  await waitForElement('#animation-overlay[style="display: none;"]', 30000)
  const timer = setInterval(() => {
    console.log('ljsfioasjfiosjaofjoasi')
    tries++;
    const seatSelection = window.seatSelection;

    if (seatSelection?.options?.areaList && seatSelection?.options?.sms?.seatmap?.seatmap?.areas?.[0]) {
      clearInterval(timer);

      const rawAreaList = seatSelection.options.areaList;
      const rawSmsBlocks = seatSelection.options.sms.seatmap.seatmap.areas[0].blocks;
      const priceCategories = seatSelection.options.sms.seatmap.seatmap.priceCategories;
      const requestParams = seatSelection.options.sms.options.params

      const data = {
        areaList: cleanForJSON(rawAreaList),
        smsBlocks: cleanForJSON(rawSmsBlocks),
        priceCategories: cleanForJSON(priceCategories),
        requestParams: cleanForJSON(requestParams)
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
