const preset = document.getElementById("preset");
const custom = document.getElementById("custom");
const countdown = document.getElementById("countdown");
const caption = document.getElementById("caption");
const badge = document.getElementById("badge");
const progress = document.getElementById("progress");


// Circle's length = 2πr. We read r from the SVG so the two can't drift apart.
const CIRCUMFERENCE = 2 * Math.PI * progress.r.baseVal.value;
progress.style.strokeDasharray = CIRCUMFERENCE;

// Local copy of what's in storage. Storage stays the source of truth.
let state = { status: "idle", endTime: null, durationMin: null, remainingMs: null, muted: false };

const muteBtn = document.getElementById("mute");
const pauseBtn = document.getElementById("pause");

function getMinutes() {
    if (preset.value !== "custom") return Number(preset.value);
    const n = Number(custom.value);
    return Number.isFinite(n) && n >= 1 && n <= 480 ? n : null;
}

function format(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
}

// fraction: 1 = full ring, 0 = empty ring
function setProgress(fraction) {
    progress.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
}

function renderMute() {
    muteBtn.textContent = state.muted ? "Sound: OFF" : "Sound: ON";
}

function render() {
    renderMute();
    const { status, endTime, durationMin, remainingMs } = state;
    document.body.dataset.state = status;

    pauseBtn.textContent = status === "paused" ? "Resume" : "Pause";
    pauseBtn.disabled = status !== "running" && status !== "paused";

    if (status === "running" && endTime && durationMin) {
        const remaining = Math.max(0, endTime - Date.now());
        countdown.textContent = format(remaining);
        caption.textContent = "Focus time";
        badge.textContent = "Running";
        setProgress(remaining / (durationMin * 60_000));
    } else if (status === "ringing") {
        countdown.textContent = "00:00";
        caption.textContent = "Stand up!";
        badge.textContent = "Time's up";
        setProgress(0);
    } else if (status === "paused" && remainingMs && durationMin) {
        countdown.textContent = format(remainingMs);
        caption.textContent = "Paused";
        badge.textContent = "Paused";
        setProgress(remainingMs / (durationMin * 60_000));
    } else {
        countdown.textContent = durationMin ? format(durationMin * 60_000) : "--:--";
        caption.textContent = durationMin ? "Ready to start" : "Pick a time";
        badge.textContent = "Ready";
        setProgress(durationMin ? 1 : 0);
    }
}

// Make the dropdown match the saved duration when the popup opens.
function restoreSelection() {
    const { durationMin } = state;
    if (!durationMin) return;
    const isPreset = [...preset.options].some((o) => o.value === String(durationMin));
    if (isPreset) {
        preset.value = String(durationMin);
    } else {
        preset.value = "custom";
        custom.value = durationMin;
        custom.hidden = false;
    }
}

preset.addEventListener("change", () => {
    custom.hidden = preset.value !== "custom";
});

document.getElementById("start").addEventListener("click", () => {
    const minutes = getMinutes();
    if (minutes === null) return custom.focus();
    chrome.runtime.sendMessage({ type: "START", minutes });
});

document.getElementById("pause").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "PAUSE" });
});

document.getElementById("reset").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET" });
});

// When the background changes storage, update our copy and redraw.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue;
    render();
});

muteBtn.addEventListener("click", () => {
    chrome.storage.local.set({ muted: !state.muted });
});

pauseBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: state.status === "paused" ? "RESUME" : "PAUSE" });
});


chrome.storage.local
  .get(["status", "endTime", "durationMin", "remainingMs", "muted"])
  .then((saved) => {
    state = { ...state, ...saved, status: saved.status ?? "idle" };
    restoreSelection();
    render();
});

setInterval(render, 250); // re-render from the local copy: no storage read per tick
