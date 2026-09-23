// 1. Install bulletproof TextDecoder & TextEncoder polyfills before any imports
class CustomTextDecoder {
  constructor(encoding = 'utf-8', options = {}) {
    this.encoding = encoding;
    this.fatal = false;
    this.ignoreBOM = false;
  }
  decode(input) {
    if (!input) return '';
    const bytes =
      input instanceof Uint8Array
        ? input
        : new Uint8Array(ArrayBuffer.isView(input) ? input.buffer : input);
    let result = '';
    let i = 0;
    while (i < bytes.length) {
      const c = bytes[i++];
      if (c < 128) {
        result += String.fromCharCode(c);
      } else if (c > 191 && c < 224) {
        const c2 = bytes[i++];
        result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c > 223 && c < 240) {
        const c2 = bytes[i++];
        const c3 = bytes[i++];
        result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      } else {
        const c2 = bytes[i++];
        const c3 = bytes[i++];
        const c4 = bytes[i++];
        let u = (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
        result += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff));
      }
    }
    return result;
  }
}

class CustomTextEncoder {
  constructor() {
    this.encoding = 'utf-8';
  }
  encode(input = '') {
    const utf8 = [];
    for (let i = 0; i < input.length; i++) {
      let charcode = input.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }
    return new Uint8Array(utf8);
  }
}

global.TextDecoder = CustomTextDecoder;
global.TextEncoder = CustomTextEncoder;

// 2. Delegate to expo-router entry point
import 'expo-router/entry';
