const HOST_ID = "standup-pls-overlay";


function showOverlay(reminders = []) {
    if (document.getElementById(HOST_ID)) return; // already showing

    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "closed" });

    const items = reminders.map((text) => `<li>${text}</li>`).join("");

    shadow.innerHTML = `
        <style>
        .backdrop {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.95);
            font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
            font-size: 16px;
            color: #fff;
        }
        .card {
            width: min(520px, 90vw);
            padding: 28px;
            background: #000;
            border: 2px solid #fff;
            box-shadow: 8px 8px 0 #fff;   /* hard offset shadow, same as the popup buttons */
        }
        h1 {
            margin: 0 0 16px;
            padding-bottom: 10px;
            font-size: 24px;
            text-transform: uppercase;
            border-bottom: 2px solid #fff;
        }
        h1::before { content: "> "; }
        h1::after { content: "_"; animation: blink 1s steps(1) infinite; }
        ul { margin: 0 0 24px; padding: 0; list-style: none; line-height: 1.8; }
        li::before { content: "• "; }
        .actions { display: flex; gap: 16px; }
        button {
            flex: 1;
            padding: 12px;
            font: inherit;
            font-weight: 700;
            text-transform: uppercase;
            color: #000;
            background: #fff;
            border: 2px solid #fff;
            border-radius: 0;
            cursor: pointer;
        }
        button:hover { background: #000; color: #fff; }
        button:focus-visible { outline: 2px dashed #fff; outline-offset: 3px; }
        #stop { background: #000; color: #fff; }
        #stop:hover { background: #fff; color: #000; }
        @keyframes blink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { h1::after { animation: none; } }
        </style>
        <div class="backdrop" role="alertdialog" aria-modal="true" aria-labelledby="title">
        <div class="card">
            <h1 id="title">Stand up, pls</h1>
             <ul>${items}</ul>
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
    if (msg.type === "SHOW_OVERLAY") showOverlay(msg.reminders);
    if (msg.type === "HIDE_OVERLAY") hideOverlay();
});

// A tab opened or reloaded while the timer is "ringing" should also be blocked.
chrome.storage.local.get(["status", "reminders"]).then(({ status, reminders }) => {
    if (status === "ringing") showOverlay(reminders);
});
