/* ============================================================
   Stable Match — app logic (vanilla, file://-safe, no modules).
   Relies on the global HORSES from data/horses.js (loaded first).
   ============================================================ */

// ---------- State (STATE_SHAPE) ----------
let deck = shuffle([...HORSES]); // Fisher–Yates copy; never mutate HORSES
let currentIndex = 0;
let matches = 0;
let busy = false; // gates decide() during an in-flight fling
let overlayOpen = false; // blocks input while the match overlay is up

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THRESHOLD = 110; // px drag distance to commit a decision
const HINT_REVEAL = 40; // px before the LIKE/NOPE stamp fades in

// ---------- DOM refs ----------
const stackEl = document.getElementById("stack");
const actionsEl = document.getElementById("actions");
const emptyEl = document.getElementById("empty-state");
const countEl = document.getElementById("match-count");
const overlayEl = document.getElementById("match-overlay");
const overlayText = document.getElementById("match-text");
const likeBtn = document.getElementById("like-btn");
const passBtn = document.getElementById("pass-btn");
const restartBtn = document.getElementById("restart-btn");
const dismissBtn = document.getElementById("match-dismiss");

// ---------- Rendering (RENDER_FROM_TEMPLATE) ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function cardMarkup(horse) {
  return `
    <div class="card__photo" style="background:${horse.gradient}">
      <span class="card__emoji" aria-hidden="true">${horse.emoji}</span>
      <span class="card__stamp card__stamp--like" aria-hidden="true">Neigh!</span>
      <span class="card__stamp card__stamp--nope" aria-hidden="true">Nope</span>
    </div>
    <div class="card__body">
      <h2 class="card__name">${esc(horse.name)}<span class="card__age">${esc(horse.age)}</span></h2>
      <p class="card__breed">${esc(horse.breed)}</p>
      <p class="card__bio">${esc(horse.bio)}</p>
      <p class="card__looking"><strong>Looking for:</strong> ${esc(horse.lookingFor)}</p>
    </div>`;
}

// Build one card <article> at a given stack depth (0 = top). The top card is the
// interactive one, so it gets the drag handlers.
function makeCard(horse, depth) {
  const card = document.createElement("article");
  card.className = "card" + (depth === 0 ? " card--top" : "");
  card.style.setProperty("--depth", String(depth));
  card.innerHTML = cardMarkup(horse);
  if (depth === 0) attachDrag(card);
  return card;
}

// Full (re)build of the up-to-3 visible cards. Used for init / restart / empty —
// NOT for advancing after a decision (that's advanceStack, which animates the settle).
function render() {
  stackEl.innerHTML = "";
  const hasTop = currentIndex < deck.length;

  if (!hasTop) {
    // Deck exhausted — reveal the paddock end screen.
    actionsEl.hidden = true;
    stackEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  stackEl.hidden = false;
  actionsEl.hidden = false;

  // Render deepest card first so the top card paints last (on top).
  for (let offset = 2; offset >= 0; offset--) {
    const horse = deck[currentIndex + offset];
    if (!horse) continue;
    stackEl.appendChild(makeCard(horse, offset));
  }
}

// Advance the stack after a decision WITHOUT tearing it down, so the surviving
// cards keep their DOM nodes and their --depth change animates via the .card
// transform transition (the "next card settles up" delight — M1). `flungCard` is
// the outgoing top card, already flung off-screen: drop it, promote everyone one
// step shallower, then reveal the newly exposed back card.
function advanceStack(flungCard) {
  if (flungCard) flungCard.remove();

  stackEl.querySelectorAll(".card").forEach((card) => {
    const depth = Number(card.style.getPropertyValue("--depth")) - 1;
    card.style.setProperty("--depth", String(depth)); // transitions → settle up
    if (depth === 0) {
      card.classList.add("card--top");
      attachDrag(card);
    }
  });

  // Reveal the next card at the back of the 3-deep window, if the deck has one.
  const backHorse = deck[currentIndex + 2];
  if (backHorse) stackEl.appendChild(makeCard(backHorse, 2));

  // Deck just emptied — show the paddock end screen.
  if (currentIndex >= deck.length) {
    actionsEl.hidden = true;
    stackEl.hidden = true;
    emptyEl.hidden = false;
  }
}

function updateCounter() {
  countEl.textContent = String(matches);
}

// ---------- Decision flow (SINGLE_DECISION_FUNCTION) ----------
// direction: "like" | "pass"
function decide(direction) {
  if (busy || overlayOpen) return; // guard against double-decide / blocked input
  const horse = deck[currentIndex];
  if (!horse) return; // nothing to act on

  busy = true;
  const topCard = stackEl.querySelector(".card--top");
  const isMatch = direction === "like" && Math.random() < 0.5;

  if (direction === "like") spawnHeartBurst();
  flingTopCard(topCard, direction);
  currentIndex += 1;

  const finish = () => {
    advanceStack(topCard); // reuse nodes so survivors' --depth transitions (settle up)
    busy = false;
    if (isMatch) registerMatch(horse); // overlay first; empty state (if any) is behind it
  };

  if (REDUCED_MOTION || !topCard) {
    finish();
  } else {
    let done = false;
    const onEnd = () => {
      if (done) return;
      done = true;
      topCard.removeEventListener("transitionend", onEnd);
      finish();
    };
    topCard.addEventListener("transitionend", onEnd);
    setTimeout(onEnd, 450); // fallback if transitionend never fires
  }
}

function flingTopCard(card, direction) {
  if (!card) return;
  card.classList.remove("card--dragging", "card--hint-like", "card--hint-nope");
  card.style.transform = ""; // let the fling class own the transform
  card.classList.add(direction === "like" ? "card--gone-right" : "card--gone-left");
}

function registerMatch(horse) {
  matches += 1;
  updateCounter();
  overlayText.textContent = `You and ${horse.name} are a match! Time to hit the trails. 🌾`;
  overlayOpen = true;
  overlayEl.hidden = false;
  clearTimeout(registerMatch._timer);
  registerMatch._timer = setTimeout(dismissMatch, 2600);
}

function dismissMatch() {
  clearTimeout(registerMatch._timer);
  overlayEl.hidden = true;
  overlayOpen = false;
}

// ---------- Heart-burst delight ----------
function spawnHeartBurst() {
  if (REDUCED_MOTION) return;
  const rect = likeBtn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const emojis = ["💚", "💕", "💖", "🐴", "✨"];
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("span");
    p.className = "heart-burst";
    p.textContent = emojis[i % emojis.length];
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.setProperty("--bx", (Math.random() * 2 - 1) * 130 + "px");
    p.style.setProperty("--by", -90 - Math.random() * 130 + "px");
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

// ---------- Pointer drag (POINTER_DRAG) ----------
let start = null; // { x, y, pointerId, card }

function attachDrag(card) {
  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerCancel);
}

function onPointerDown(e) {
  if (busy || overlayOpen) return;
  const card = e.currentTarget;
  start = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, card };
  card.setPointerCapture(e.pointerId);
  card.classList.add("card--dragging");
}

function onPointerMove(e) {
  if (!start) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  const rot = dx / 18; // subtle tilt
  start.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  setDecisionHint(start.card, dx);
}

function onPointerUp(e) {
  if (!start) return;
  const dx = e.clientX - start.x;
  const card = start.card;
  card.classList.remove("card--dragging");
  start = null;

  if (dx > THRESHOLD) {
    decide("like");
  } else if (dx < -THRESHOLD) {
    decide("pass");
  } else {
    // Snap back to center.
    card.style.transform = "";
    card.classList.remove("card--hint-like", "card--hint-nope");
  }
}

function onPointerCancel() {
  if (!start) return;
  const card = start.card;
  card.classList.remove("card--dragging", "card--hint-like", "card--hint-nope");
  card.style.transform = "";
  start = null;
}

function setDecisionHint(card, dx) {
  card.classList.toggle("card--hint-like", dx > HINT_REVEAL);
  card.classList.toggle("card--hint-nope", dx < -HINT_REVEAL);
}

// ---------- Keyboard ----------
document.addEventListener("keydown", (e) => {
  if (overlayOpen) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dismissMatch();
    }
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    decide("like");
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    decide("pass");
  }
});

// ---------- Buttons ----------
likeBtn.addEventListener("click", () => decide("like"));
passBtn.addEventListener("click", () => decide("pass"));
dismissBtn.addEventListener("click", dismissMatch);
overlayEl.addEventListener("click", (e) => {
  if (e.target === overlayEl) dismissMatch(); // backdrop click closes
});
restartBtn.addEventListener("click", () => {
  deck = shuffle([...HORSES]);
  currentIndex = 0;
  matches = 0;
  updateCounter();
  render();
});

// ---------- Fisher–Yates shuffle (FISHER_YATES_SHUFFLE) ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Init ----------
updateCounter();
render();
