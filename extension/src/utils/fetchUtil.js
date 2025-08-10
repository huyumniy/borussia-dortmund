// common “fetch + parse” helper
const doFetch = async (url, fetchOpts) => {
  let response,
    text = null,
    json = null,
    error = null;

  try {
    response = await fetch(url, fetchOpts);
    text = await response.text();

    try {
      json = JSON.parse(text);
    } catch {
      // not JSON or empty
    }

    if (!response.ok) {
      error = new Error(`HTTP ${response.status} ${response.statusText}`);
    }
  } catch (fetchErr) {
    error = fetchErr;
  }

  return {
    status: response?.status ?? null,
    text,
    json,
    error,
  };
};

// GET request
export const getData = async (url, options = {}) => {
  const headers = {
    "x-queueit-ajaxpageurl": encodeURIComponent(window.location.href),
    ...options.headers,
  };

  return doFetch(url, {
    method: "GET",
    headers,
    ...options,
  });
};

// POST request
export const sendData = async (url, payload, options = {}) => {
  const headers = {
    ...options.headers,
  };

  return doFetch(url, {
    method: "POST",
    headers,
    body: payload,
    ...options,
  });
};
