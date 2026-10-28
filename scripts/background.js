const ALARM_NAME = "standup-timer";

async function startTimer(minutes) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, { delayInMinutes: minutes });
    await chrome.storage.local.set({
        status: "running",
        durationMin: minutes,
        endTime: Date.now() + minutes * 60_000,
    });
}

async function stopTimer() {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.storage.local.set({ status: "idle", endTime: null });
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

    await chrome.storage.local.set({ status: "ringing", endTime: null });

    chrome.notifications.create(
        "standup-time-up",
        {
            type: "basic",
            iconUrl: chrome.runtime.getURL("images/icon-128.png"),
            title: "Standup, pls",
            message: "Time to stand up and move around!",
            requireInteraction: true,
        },
    );

    await broadcast({ type: "SHOW_OVERLAY" });
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
