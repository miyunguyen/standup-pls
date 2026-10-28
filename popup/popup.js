const preset = document.getElementById("preset");
const custom = document.getElementById("custom");
const countdown = document.getElementById("countdown");

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

async function render() {
    const { status, endTime, durationMin } = await chrome.storage.local.get([
        "status", "endTime", "durationMin",
    ]);
    if (status === "running" && endTime) {
        countdown.textContent = format(endTime - Date.now());
    } else if (status === "ringing") {
        countdown.textContent = "Stand up!";
    } else {
        countdown.textContent = durationMin ? format(durationMin * 60_000) : "--:--";
    }
}

preset.addEventListener("change", () => {
    custom.hidden = preset.value !== "custom";
});

document.getElementById("start").addEventListener("click", async () => {
    const minutes = getMinutes();
    if (minutes === null) return custom.focus();
    await chrome.runtime.sendMessage({ type: "START", minutes });
    render();
});

document.getElementById("reset").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "RESET" });
    render();
});

async function restoreSelection() {
    const { durationMin } = await chrome.storage.local.get("durationMin");
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

restoreSelection()

render();
setInterval(render, 1000);
