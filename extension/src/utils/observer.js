export function waitForElement(selector, waitForText = false, timeout = 10000, root = document) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      try {
        const el = root.querySelector(selector);
        if (el) {
          if (!waitForText) return resolve(el);
          if (el.textContent && el.textContent.trim() !== '') return resolve(el);
        }
      } catch (e) {
      }
      if (Date.now() - start >= timeout) {
        return reject(new Error(`Timeout: Element "${selector}" not found within ${timeout}ms`));
      }
      return false;
    }

    if (check()) return;

    const observer = new MutationObserver(() => {
      if (check()) {
        observer.disconnect();
        clearInterval(intervalId);
      }
    });

    try {
      observer.observe(root === document ? document.body : root, { childList: true, subtree: true });
    } catch (e) {
    }

    const intervalId = setInterval(() => {
      if (check()) {
        observer.disconnect();
        clearInterval(intervalId);
      }
    }, 200);
  });
}
