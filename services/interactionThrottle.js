// Bound concurrent component work and reject rapid repeats without queueing.
const entries = new Map();
const MAX_ENTRIES = 10000;
function acquire(key, now = Date.now()) {
    const current = entries.get(key);
    if (current && (current.busy || now < current.until)) return null;
    if (!current && entries.size >= MAX_ENTRIES) return null;
    const entry = { busy: true, until: now + 2000 };
    entries.set(key, entry);
    let released = false;
    return () => {
        if (released) return;
        released = true;
        entry.busy = false;
        const timer = setTimeout(() => {
            if (entries.get(key) === entry) entries.delete(key);
        }, Math.max(0, entry.until - Date.now()));
        timer.unref();
    };
}
module.exports = { acquire };
