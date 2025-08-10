export function waitForElement(selector, waitForText=false, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // If already present
    const existing = document.querySelector(selector);
    if (existing) {
      return resolve(existing);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (waitForText && el) {
        if (el.textContent) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(el);
        }
      } else if (el) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout: Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}
