const HOST_ID = "standup-pls-overlay";

function showOverlay() {
    if (document.getElementById(HOST_ID)) return; // already showing

    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "closed" });

    shadow.innerHTML = `
    <style>
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(8px);
        font-family: system-ui, sans-serif;
        color: #fff;
      }
      .card { max-width: 480px; padding: 32px; text-align: center; }
      h1 { font-size: 32px; margin: 0 0 12px; }
      p { font-size: 18px; line-height: 1.5; margin: 0 0 24px; }
      .actions { display: flex; gap: 12px; justify-content: center; }
      button {
        padding: 12px 24px; font-size: 16px; border: 0;
        border-radius: 8px; cursor: pointer;
      }
      #keep { background: #22c55e; color: #052e16; }
      #stop { background: #e5e7eb; color: #111; }
    </style>
    <div class="backdrop" role="alertdialog" aria-modal="true" aria-labelledby="title">
      <div class="card">
        <h1 id="title">Stand up, pls! 🧍</h1>
        <p>Stretch, walk around, look out a window, drink some water.<br />Your code will still be here.</p>
        <div class="actions">
          <button id="keep">Keep going</button>
          <button id="stop">Stop</button>
        </div>
      </div>
    </div>
  `;

    shadow.getElementById("keep").addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "KEEP_GOING" });
    });
    shadow.getElementById("stop").addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "STOP" });
    });

    document.documentElement.appendChild(host);
    document.documentElement.style.overflow = "hidden"; // stop page scrolling
    if (document.body) document.body.inert = true;      // block keyboard + clicks
    shadow.getElementById("keep").focus();
}

function hideOverlay() {
    document.getElementById(HOST_ID)?.remove();
    document.documentElement.style.overflow = "";
    if (document.body) document.body.inert = false;
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_OVERLAY") showOverlay();
    if (msg.type === "HIDE_OVERLAY") hideOverlay();
});

// A tab opened or reloaded while the timer is "ringing" should also be blocked.
chrome.storage.local.get("status").then(({ status }) => {
    if (status === "ringing") showOverlay();
});
