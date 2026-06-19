/* ============================================================
   Northern Light — single-album music player
   No backend. Drop your audio files in /audio and update
   the `src` paths below (or keep the generated demo tones).
   ============================================================ */

const ARTIST = "Emotionally Insecure Vipers";

/* The album. Edit titles / durations / files / notes here. */
const TRACKS = [
  {
    title: "FUIME",
    src: "audio/01-first-snow.wav",
    notes: "The opener. A song about someone who used to feel unsure or quiet, but slowly finds their confidence. The \"FUME\" represent mystery, fear, doubt, or confusion, but instead of getting lost, the singer rises through it and finds their own magic.",
  },
  {
    title: "2:00 PM thoughts",
    src: "audio/02-2pm-thoughts.mp3",
    notes: "A steadfast song about thoughts that come at 2:00 PM — the time when the world feels both quiet and full of possibilities. The thoughts are a mix of introspection and hope.",
  },
  {
    title: "Fame",
    src: "audio/03-letters-home.wav",
    notes: "About how fame is everything it can seem as, amazingly desired, but also something that can be very isolating.",
  },
  {
    title: "Darkness",
    src: "audio/04-aurora.wav",
    notes: "Traverses the fear of the dark and the unknown, but finding the courage to face it.",
  },
  {
    title: "Candlelight",
    src: "audio/05-the-long-way-back.wav",
    notes: "Feelings of loneliness and longing, but also the warmth of memories and the hope of reunion. The candlelight represents a small but persistent source of comfort and connection in the d[...]",
  }
];

/* ---------- Element refs ---------- */
const audio = document.getElementById("audio");
const trackListEl = document.getElementById("trackList");
const playerEl = document.getElementById("player");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const heroPlay = document.getElementById("heroPlay");
const heroShuffle = document.getElementById("heroShuffle");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerArt = document.getElementById("playerArt");

const scrub = document.getElementById("scrub");
const scrubFill = document.getElementById("scrubFill");
const scrubKnob = document.getElementById("scrubKnob");
const curTimeEl = document.getElementById("curTime");
const durTimeEl = document.getElementById("durTime");

const muteBtn = document.getElementById("muteBtn");
const volumeEl = document.getElementById("volume");
const volFill = document.getElementById("volFill");

const lyricsEl = document.getElementById("lyrics");
const notesTitleEl = document.getElementById("notesTitle");
const totalRuntimeEl = document.getElementById("totalRuntime");

/* ---------- State ---------- */
let current = -1;          // index of loaded track, -1 = none
let isPlaying = false;
let durations = [];        // measured durations per track (seconds)
let demoReady = false;     // whether generated demo audio is wired up

/* ============================================================
   Demo audio fallback
   If real files aren't present, synthesize gentle tones with
   the Web Audio API so the page is immediately playable.
   ============================================================ */
const DemoAudio = (() => {
  let ctx = null;
  let nodes = null;        // { osc, osc2, gain, lfo }
  let startedAt = 0;       // ctx time when current note started
  let elapsedBefore = 0;   // seconds already played before last start
  let raf = null;
  // a soft chord root per track (Hz) — pentatonic-ish, calming
  const ROOTS = [196.0, 220.0, 174.6, 261.6, 207.7, 246.9];
  const LEN = [168, 192, 156, 144, 204, 222]; // pseudo durations (s)

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function buildVoice(freq) {
    const c = ensureCtx();
    const gain = c.createGain();
    gain.gain.value = 0;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const osc2 = c.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 1.5; // a fifth above, soft
    const g2 = c.createGain();
    g2.gain.value = 0.35;
    // slow tremolo for a "breathing" pad feel
    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.18;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(gain.gain);

    osc.connect(gain);
    osc2.connect(g2).connect(gain);
    gain.connect(c.destination);
    return { osc, osc2, lfo, gain };
  }

  function play(index, fromSeconds) {
    const c = ensureCtx();
    if (c.state === "suspended") c.resume();
    stopNodes();
    nodes = buildVoice(ROOTS[index % ROOTS.length]);
    const target = 0.16 * volume * (muted ? 0 : 1);
    nodes.gain.gain.cancelScheduledValues(c.currentTime);
    nodes.gain.gain.setValueAtTime(0.0001, c.currentTime);
    nodes.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), c.currentTime + 0.4);
    nodes.osc.start();
    nodes.osc2.start();
    nodes.lfo.start();
    elapsedBefore = fromSeconds || 0;
    startedAt = c.currentTime;
    tick();
  }

  function pause() {
    if (!nodes || !ctx) return;
    elapsedBefore = currentTime();
    const g = nodes.gain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    stopNodes(0.25);
    cancelAnimationFrame(raf);
  }

  function stopNodes(after = 0) {
    if (!nodes || !ctx) return;
    const n = nodes;
    nodes = null;
    const t = ctx.currentTime + after;
    try { n.osc.stop(t); n.osc2.stop(t); n.lfo.stop(t); } catch (e) {}
  }

  function setVolume() {
    if (nodes && ctx) {
      const target = 0.16 * volume * (muted ? 0 : 1);
      nodes.gain.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.05);
    }
  }

  function currentTime() {
    if (!ctx || startedAt === 0) return elapsedBefore;
    return elapsedBefore + (ctx.currentTime - startedAt);
  }

  function duration(index) { return LEN[index % LEN.length]; }

  function seek(index, seconds) {
    if (isPlaying) play(index, seconds);
    else { elapsedBefore = seconds; startedAt = 0; }
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const t = currentTime();
    const d = duration(current);
    onDemoProgress(t, d);
    if (t >= d) { cancelAnimationFrame(raf); onDemoEnded(); }
  }

  return { play, pause, setVolume, duration, currentTime, seek, get isPlaying() { return !!nodes; } };
})();

/* ============================================================
   Determine source mode: try real files, else demo tones.
   We probe the first track; if it can't load, switch to demo.
   ============================================================ */
let useDemo = false;

function probeSources() {
  // Probe all track sources; use real audio if any valid source loads.
  let settled = false;
  let checked = 0;

  const decide = (demo) => {
    if (settled) return;
    settled = true;
    useDemo = demo;
    finishInit();
  };

  TRACKS.forEach((track) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => decide(false));
    probe.addEventListener("error", () => {
      checked += 1;
      if (checked === TRACKS.length) decide(true);
    });
    probe.src = track.src;
  });

  // safety timeout — if nothing fires, assume demo
  setTimeout(() => decide(useDemo), 1200);
}

/* ---------- Build track rows ---------- */
function render() {
  // gather small cover thumbnails from the static .song list (if present)
  const songEls = document.querySelectorAll('.song');
  const covers = Array.from(songEls).map(s => s.querySelector('img')?.src || 'assets/cover.svg');

  const frag = document.createDocumentFragment();
  TRACKS.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "track";
    li.dataset.index = i;
    const coverSrc = covers[i] || 'assets/cover.svg';
    li.innerHTML = `
      <div class="track__index">
        <span class="track__num">${i + 1}</span>
        <span class="track__playicon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
        <span class="track__eq" aria-hidden="true"><span></span><span></span><span></span></span>
      </div>
      <div class="track__gap" aria-hidden="true"></div>
      <img class="track__art" src="${coverSrc}" alt="${t.title} cover" />
      <div class="track__main">
        <div class="track__title">${t.title}</div>
        <div class="track__sub">${ARTIST}</div>
      </div>
      <div class="track__dur" data-dur="${i}">--:--</div>
      <button class="track__btn" type="button" aria-label="Play ${t.title}">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>`;
    li.addEventListener("click", () => selectTrack(i));
    frag.appendChild(li);
  });
  trackListEl.appendChild(frag);
}

/* ---------- Duration measurement ---------- */
function loadDurations() {
  TRACKS.forEach((t, i) => {
    if (useDemo) {
      durations[i] = DemoAudio.duration(i);
      paintDuration(i);
    } else {
      const a = new Audio();
      a.preload = "metadata";
      a.src = t.src;
      a.addEventListener("loadedmetadata", () => {
        durations[i] = a.duration;
        paintDuration(i);
      });
      a.addEventListener("error", () => {
        durations[i] = DemoAudio.duration(i);
        paintDuration(i);
      });
    }
  });
}

function paintDuration(i) {
  const el = trackListEl.querySelector(`[data-dur="${i}"]`);
  if (el && isFinite(durations[i])) el.textContent = fmt(durations[i]);
  // total
  if (durations.filter(isFinite).length === TRACKS.length) {
    const total = durations.reduce((a, b) => a + b, 0);
    const m = Math.floor(total / 60);
    totalRuntimeEl.textContent = `${m} min`;
  }
}

/* ---------- Playback control ---------- */
function selectTrack(i) {
  if (i === current) { togglePlay(); return; }
  current = i;
  const t = TRACKS[i];
  playerEl.dataset.empty = "false";
  playerTitle.textContent = t.title;
  playerArtist.textContent = ARTIST;
  notesTitleEl.textContent = `Now showing — ${t.title}`;
  lyricsEl.textContent = t.notes;

  if (useDemo) {
    durTimeEl.textContent = fmt(DemoAudio.duration(i));
  } else {
    audio.src = t.src;
    audio.load();
  }
  play();
  highlight();
}

function play() {
  isPlaying = true;
  if (useDemo) {
    DemoAudio.play(current, audio._demoSeek || 0);
    audio._demoSeek = 0;
  } else {
    audio.play().catch(() => {});
  }
  reflectPlayingState();
}

function pause() {
  isPlaying = false;
  if (useDemo) DemoAudio.pause();
  else audio.pause();
  reflectPlayingState();
}

function togglePlay() {
  if (current === -1) { selectTrack(0); return; }
  isPlaying ? pause() : play();
}

function next() {
  selectTrack((current + 1) % TRACKS.length);
}
function prev() {
  // restart if more than 3s in, else go back
  const t = useDemo ? DemoAudio.currentTime() : audio.currentTime;
  if (t > 3) { seekTo(0); return; }
  selectTrack((current - 1 + TRACKS.length) % TRACKS.length);
}

function reflectPlayingState() {
  playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  playerEl.classList.toggle("is-playing", isPlaying);
  heroPlay.classList.toggle("is-playing", isPlaying && current > -1);
  heroPlay.querySelector(".btn__label").textContent =
    isPlaying ? "Pause album" : (current > -1 ? "Resume" : "Play album");
  // active row paused styling
  const row = activeRow();
  if (row) row.classList.toggle("is-paused", !isPlaying);
}

function highlight() {
  [...trackListEl.children].forEach((li, i) => {
    li.classList.toggle("is-active", i === current);
    li.classList.remove("is-paused");
  });
}
function activeRow() {
  return trackListEl.querySelector(".track.is-active");
}

/* ---------- Progress / seek ---------- */
function updateProgress(t, d) {
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  scrubFill.style.width = pct + "%";
  scrubKnob.style.left = pct + "%";
  curTimeEl.textContent = fmt(t);
  if (isFinite(d) && d > 0) durTimeEl.textContent = fmt(d);
  scrub.setAttribute("aria-valuenow", Math.round(pct));
}

function seekTo(seconds) {
  if (current === -1) return;
  if (useDemo) {
    DemoAudio.seek(current, seconds);
    updateProgress(seconds, DemoAudio.duration(current));
  } else {
    audio.currentTime = seconds;
  }
}

function seekFromEvent(e) {
  const rect = scrub.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const ratio = Math.max(0, Math.min(1, x / rect.width));
  const d = useDemo ? DemoAudio.duration(current) : audio.duration;
  if (isFinite(d)) seekTo(ratio * d);
}

/* ---------- Volume ---------- */
let volume = 0.8;
let muted = false;
let lastVolume = 0.8;

function applyVolume() {
  audio.volume = volume;
  audio.muted = muted;
  DemoAudio.setVolume();
  volFill.style.width = (muted ? 0 : volume * 100) + "%";
  volumeEl.setAttribute("aria-valuenow", Math.round((muted ? 0 : volume) * 100));
  playerEl.classList.toggle("is-muted", muted || volume === 0);
}

function setVolumeFromEvent(e) {
  const rect = volumeEl.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  volume = Math.max(0, Math.min(1, x / rect.width));
  muted = volume === 0;
  if (!muted) lastVolume = volume;
  applyVolume();
}

/* ---------- Helpers ---------- */
function fmt(s) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

/* ---------- Demo audio callbacks ---------- */
function onDemoProgress(t, d) { if (useDemo) updateProgress(t, d); }
function onDemoEnded() { if (useDemo) next(); }

/* ============================================================
   Wire events
   ============================================================ */
function bind() {
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  heroPlay.addEventListener("click", togglePlay);
  heroShuffle.addEventListener("click", () => {
    const i = Math.floor(Math.random() * TRACKS.length);
    selectTrack(i);
  });

  // real-audio events
  audio.addEventListener("timeupdate", () => {
    if (!useDemo) updateProgress(audio.currentTime, audio.duration);
  });
  audio.addEventListener("loadedmetadata", () => {
    if (!useDemo) durTimeEl.textContent = fmt(audio.duration);
  });
  audio.addEventListener("ended", next);
  audio.addEventListener("play", () => { isPlaying = true; reflectPlayingState(); });
  audio.addEventListener("pause", () => { if (!useDemo) { isPlaying = false; reflectPlayingState(); } });

  // scrubbing
  let scrubbing = false;
  const startScrub = (e) => { scrubbing = true; seekFromEvent(e); e.preventDefault(); };
  scrub.addEventListener("mousedown", startScrub);
  scrub.addEventListener("touchstart", startScrub, { passive: false });
  window.addEventListener("mousemove", (e) => scrubbing && seekFromEvent(e));
  window.addEventListener("touchmove", (e) => scrubbing && seekFromEvent(e), { passive: false });
  window.addEventListener("mouseup", () => (scrubbing = false));
  window.addEventListener("touchend", () => (scrubbing = false));
  scrub.addEventListener("click", seekFromEvent);
  scrub.addEventListener("keydown", (e) => {
    const d = useDemo ? DemoAudio.duration(current) : audio.duration;
    const cur = useDemo ? DemoAudio.currentTime() : audio.currentTime;
    if (!isFinite(d)) return;
    if (e.key === "ArrowRight") { seekTo(Math.min(d, cur + 5)); e.preventDefault(); }
    if (e.key === "ArrowLeft") { seekTo(Math.max(0, cur - 5)); e.preventDefault(); }
  });

  // volume
  let voling = false;
  const startVol = (e) => { voling = true; setVolumeFromEvent(e); e.preventDefault(); };
  volumeEl.addEventListener("mousedown", startVol);
  volumeEl.addEventListener("touchstart", startVol, { passive: false });
  window.addEventListener("mousemove", (e) => voling && setVolumeFromEvent(e));
  window.addEventListener("mouseup", () => (voling = false));
  volumeEl.addEventListener("click", setVolumeFromEvent);
  volumeEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { volume = Math.min(1, volume + 0.05); muted = false; lastVolume = volume; applyVolume(); e.preventDefault(); }
    if (e.key === "ArrowLeft") { volume = Math.max(0, volume - 0.05); applyVolume(); e.preventDefault(); }
  });
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    if (muted) { lastVolume = volume || lastVolume; }
    else { volume = lastVolume || 0.8; }
    applyVolume();
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.key === "ArrowRight" && e.target === document.body) next();
    if (e.key === "ArrowLeft" && e.target === document.body) prev();
  });

  // copy link
  const copy = document.getElementById("copyLink");
  copy.addEventListener("click", (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(location.href).then(() => {
      const old = copy.textContent;
      copy.textContent = "Copied ✓";
      setTimeout(() => (copy.textContent = old), 1600);
    });
  });
}

/* ---------- Init ---------- */
function finishInit() {
  loadDurations();
  // preload first track's notes into the side panel
  lyricsEl.textContent = TRACKS[0].notes;
  notesTitleEl.textContent = `Now showing — ${TRACKS[0].title}`;
  applyVolume();
}

render();
bind();
probeSources();
