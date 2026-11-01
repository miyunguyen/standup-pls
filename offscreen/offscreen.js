const SOUNDS = {
    start: "sounds/start.mp3",
    end: "sounds/end.mp3",
};

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.target !== "offscreen" || msg.type !== "PLAY_SOUND") return;

    const path = SOUNDS[msg.sound];
    if (!path) return;

    const audio = new Audio(chrome.runtime.getURL(path));
    audio.play().catch((err) => console.error("Sound failed:", err));
});
