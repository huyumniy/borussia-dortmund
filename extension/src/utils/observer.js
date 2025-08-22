export function waitForElement(selector, { waitForText = false, timeout = 10000 } = {}) {
  return new Promise((resolve) => {
    let found = false;

    function check() {
      const el = document.querySelector(selector);
      if (el && (!waitForText || el.textContent.trim() !== "")) {
        found = true;
        cleanup();
        resolve(el);
        return true;
      }
      return false;
    }

    function cleanup() {
      clearInterval(pollingId);
      clearTimeout(timeoutId);
      observer.disconnect();
    }

    if (check()) return;

    const pollingId = setInterval(check, 500); // faster checks

    const observer = new MutationObserver(() => check());
    observer.observe(document, { childList: true, subtree: true }); // observe whole document

    const timeoutId = setTimeout(() => {
      if (!found) {
        cleanup();
        resolve(null);
      }
    }, timeout);
  });
}

export function waitForGlobal(prop, timeout = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const value = prop.split(".").reduce((acc, key) => acc?.[key], window);
      if (value) {
        clearInterval(timer);
        resolve(value);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, 200);
  });
}
