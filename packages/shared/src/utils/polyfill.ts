// Safely patch Global Response constructor in React Native Hermes/JSC environments
// to prevent whatwg-fetch crash on network status 0: "Failed to construct 'Response': The status provided (0) is outside the range [200, 599]"

const targetGlobal: any =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : null;

// Polyfill TextDecoder / TextEncoder if missing in Hermes / React Native environment
if (targetGlobal) {
  if (typeof targetGlobal.TextDecoder === 'undefined' || typeof targetGlobal.TextEncoder === 'undefined') {
    try {
      require('fast-text-encoding');
    } catch (_) {}
  }
}

if (targetGlobal && targetGlobal.Response) {
  const OriginalResponse = targetGlobal.Response;
  let needsPatch = false;

  try {
    // Test if native Response throws when status is 0 (as in Hermes/V8 standards)
    new OriginalResponse(null, { status: 0 as any });
  } catch (_) {
    needsPatch = true;
  }

  if (needsPatch) {
    const SafeResponse = function (this: any, body?: any, init?: ResponseInit) {
      if (init && typeof init.status === 'number' && (init.status < 200 || init.status > 599)) {
        init = {
          ...init,
          status: init.status === 0 ? 503 : Math.min(Math.max(init.status, 200), 599),
          statusText: init.statusText || (init.status === 0 ? 'Network Error' : 'Unknown'),
        };
      }
      if (!(this instanceof SafeResponse)) {
        return new (OriginalResponse as any)(body, init);
      }
      return new OriginalResponse(body, init);
    };

    SafeResponse.prototype = OriginalResponse.prototype;
    SafeResponse.error = OriginalResponse.error;
    SafeResponse.redirect = OriginalResponse.redirect;
    SafeResponse.json = OriginalResponse.json;

    try {
      targetGlobal.Response = SafeResponse;
    } catch (_) {}
  }
}

export {};
