// utils/pick.js
export function pick(obj, keys) {
    if (!keys || !Array.isArray(keys) || keys.length === 0) return obj;
    const out = {};
    keys.forEach(k => {
        if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    });
    return out;
}