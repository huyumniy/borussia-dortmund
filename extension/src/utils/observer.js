export function waitForElement(selector, waitForText = false, timeout = 10000) {
  return new Promise((resolve) => {
    let found = false;

    function check() {
      const el = document.querySelector(selector);
      if (el) {
        if (!waitForText || el.textContent.trim() !== "") {
          found = true;
          cleanup();
          resolve(el);
          return true;
        }
      }
      return false;
    }

    function cleanup() {
      clearInterval(pollingId);
      clearTimeout(timeoutId);
      observer.disconnect();
    }

    if (check()) return;

    const pollingId = setInterval(check, 1000);

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutId = setTimeout(() => {
      if (!found) {
        cleanup();
        resolve(null);
      }
    }, timeout);
  });
}
