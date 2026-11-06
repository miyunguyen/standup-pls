const ALARM_NAME = "standup-timer";

const REMINDERS = [
    "Stand up and stretch your arms overhead",
    "Walk around for a minute",
    "Look at something far away for 20 seconds",
    "Drink some water",
    "Roll your shoulders and neck gently",
    "Take 5 slow, deep breaths",
    "Shake out your wrists and hands",
    "Check your posture: feet flat, back straight",
    "Blink slowly a few times to rest your eyes",
    "Step to a window and look outside",
];

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickReminders(count) {
    return shuffle(REMINDERS).slice(0, count);
}

async function ensureOffscreen() {
    // Only one offscreen document can exist, so check before creating.
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    if (contexts.length > 0) return;

    await chrome.offscreen.createDocument({
        url: "offscreen/offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play a sound when the timer starts and ends",
    });
}

async function playSound(sound) {
    const { muted } = await chrome.storage.local.get("muted");
    if (muted) return;

    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: "offscreen", type: "PLAY_SOUND", sound });
}

async function startTimer(minutes) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, { delayInMinutes: minutes });
    await chrome.storage.local.set({
        status: "running",
        durationMin: minutes,
        endTime: Date.now() + minutes * 60_000,
        remainingMs: null,
    });
    await playSound("start");
}

async function pauseTimer() {
  const { status, endTime } = await chrome.storage.local.get(["status", "endTime"]);
  if (status !== "running" || !endTime) return; // only valid while running

  const remainingMs = Math.max(0, endTime - Date.now());
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.storage.local.set({ status: "paused", remainingMs, endTime: null });
}

async function resumeTimer() {
  const { status, remainingMs } = await chrome.storage.local.get(["status", "remainingMs"]);
  if (status !== "paused" || !remainingMs) return;

  const endTime = Date.now() + remainingMs;
  await chrome.alarms.create(ALARM_NAME, { when: endTime });
  await chrome.storage.local.set({ status: "running", endTime, remainingMs: null });

  await playSound("start");
}

async function stopTimer() {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.storage.local.set({ status: "idle", endTime: null, remainingMs: null });
    await broadcast({ type: "HIDE_OVERLAY" });
}

// Send a message to the content script in every open tab.
async function broadcast(message) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        // Tabs without our content script (chrome://, Web Store) reject; ignore them.
        chrome.tabs.sendMessage(tab.id, message).catch(() => { });
    }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    const reminders = pickReminders(3);
    await chrome.storage.local.set({ status: "ringing", endTime: null, reminders });

    chrome.notifications.create(
        "standup-time-up",
        {
            type: "basic",
            iconUrl: chrome.runtime.getURL("images/icon-128.png"),
            title: "Standup, pls",
            message: "Time to stand up and move around!",
            requireInteraction: false,
        },
    );

    await playSound("end");
    await broadcast({ type: "SHOW_OVERLAY", reminders });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        const { durationMin } = await chrome.storage.local.get("durationMin");

        switch (msg.type) {
            case "START":
                await startTimer(msg.minutes);
                break;
            case "RESET":
                await stopTimer();
                break;
            case "PAUSE":
                await pauseTimer();
                break;
            case "RESUME":
                await resumeTimer();
                break;
            case "KEEP_GOING":
                await broadcast({ type: "HIDE_OVERLAY" });
                if (durationMin) await startTimer(durationMin);
                break;
            case "STOP":
                await stopTimer();
                break;
        }
        sendResponse({ ok: true });
    })();

    return true; // keeps the message channel open for the async response
});
