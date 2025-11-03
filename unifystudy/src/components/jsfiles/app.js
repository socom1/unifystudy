const pomodoroButton = document.getElementById("start");
const pomodoroStop = document.getElementById("stop");
const pomodoroReset = document.getElementById("reset");
const countdownEl = document.getElementById("time");

const tenMSelect = document.getElementById("10sel");
const twenMSelect = document.getElementById("20sel");
const twenfiveMSelect = document.getElementById("25sel");
const sixtyMSelect = document.getElementById("60sel");

const addB = document.getElementById("addB");
const addAmmount = document.getElementById("addAmount");
let inputEnter = document.getElementById("enam");
const amountForm = document.getElementById("amountForm");

// Declare selTimeF globally so it can be used everywhere
let selTimeF = null;

// let selTimeF = null; // Default selected time in minutes

const fiveMSelect = document.getElementById("5sel");

fiveMSelect.addEventListener("click", () => {
  selTimeF = 5;
  let selTime = selTimeF || 10;

  console.log("5 pressed");

  let intervalId = null;
  let time = selTime * 60; // 10 minutes in seconds

  const durationB = document.getElementById("5sel");

  function updateCountdown() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = formatSeconds(seconds);
    countdownEl.innerHTML = `${minutes}:${seconds}`;
    if (time > 0) {
      time--;
    } else {
      clearInterval(intervalId);
      intervalId = null; // Allow restart after reaching zero
    }
  }

  function formatSeconds(sec) {
    return sec < 10 ? "0" + sec : sec;
  }

  // Initial display
  countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
    time % 60
  )}`;

  pomodoroButton.addEventListener("click", () => {
    if (!intervalId) {
      updateCountdown(); // Update immediately
      intervalId = setInterval(updateCountdown, 1000);
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.add("started");
    }
  });

  if (pomodoroStop) {
    pomodoroStop.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    });
  }

  if (pomodoroReset) {
    pomodoroReset.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      time = selTime * 60;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    });
  }
});

tenMSelect.addEventListener("click", () => {
  selTimeF = 10;
  let selTime = selTimeF || 10;

  let intervalId = null;
  let time = selTime * 60; // 10 minutes in seconds

  const durationB = document.getElementById("10sel");

  function updateCountdown() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = formatSeconds(seconds);
    countdownEl.innerHTML = `${minutes}:${seconds}`;
    if (time > 0) {
      time--;
    } else {
      clearInterval(intervalId);
      intervalId = null; // Allow restart after reaching zero
    }
  }

  function formatSeconds(sec) {
    return sec < selTime ? "0" + sec : sec;
  }

  // Initial display
  countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
    time % 60
  )}`;

  pomodoroButton.addEventListener("click", () => {
    if (!intervalId) {
      updateCountdown(); // Update immediately
      intervalId = setInterval(updateCountdown, 1000);
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.add("started");
    }
  });

  if (pomodoroStop) {
    pomodoroStop.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    });
  }

  if (pomodoroReset) {
    pomodoroReset.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      time = selTime * 60;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    });
  }
});

twenMSelect.addEventListener("click", () => {
  selTimeF = 20;
  let selTime = selTimeF || 10;

  let intervalId = null;
  let time = selTime * 60; // 10 minutes in seconds

  const durationB = document.getElementById("20sel");

  function updateCountdown() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = formatSeconds(seconds);
    countdownEl.innerHTML = `${minutes}:${seconds}`;
    if (time > 0) {
      time--;
    } else {
      clearInterval(intervalId);
      intervalId = null; // Allow restart after reaching zero
    }
  }

  function formatSeconds(sec) {
    return sec < selTime ? "0" + sec : sec;
  }

  // Initial display
  countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
    time % 60
  )}`;

  pomodoroButton.addEventListener("click", () => {
    if (!intervalId) {
      updateCountdown(); // Update immediately
      intervalId = setInterval(updateCountdown, 1000);
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.add("started");
    }
  });

  if (pomodoroStop) {
    pomodoroStop.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    });
  }

  if (pomodoroReset) {
    pomodoroReset.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      time = selTime * 60;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    });
  }
});

twenfiveMSelect.addEventListener("click", () => {
  selTimeF = 25;
  let selTime = selTimeF || 10;

  let intervalId = null;
  let time = selTime * 60; // 10 minutes in seconds

  const durationB = document.getElementById("25sel");

  function updateCountdown() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = formatSeconds(seconds);
    countdownEl.innerHTML = `${minutes}:${seconds}`;
    if (time > 0) {
      time--;
    } else {
      clearInterval(intervalId);
      intervalId = null; // Allow restart after reaching zero
    }
  }

  function formatSeconds(sec) {
    return sec < selTime ? "0" + sec : sec;
  }

  // Initial display
  countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
    time % 60
  )}`;

  pomodoroButton.addEventListener("click", () => {
    if (!intervalId) {
      updateCountdown(); // Update immediately
      intervalId = setInterval(updateCountdown, 1000);
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.add("started");
    }
  });

  if (pomodoroStop) {
    pomodoroStop.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    });
  }

  if (pomodoroReset) {
    pomodoroReset.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      time = selTime * 60;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    });
  }
});

sixtyMSelect.addEventListener("click", () => {
  selTimeF = 60;
  let selTime = selTimeF || 10;

  let intervalId = null;
  let time = selTime * 60; // 10 minutes in seconds

  const durationB = document.getElementById("60sel");

  function updateCountdown() {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    seconds = formatSeconds(seconds);
    countdownEl.innerHTML = `${minutes}:${seconds}`;
    if (time > 0) {
      time--;
    } else {
      clearInterval(intervalId);
      intervalId = null; // Allow restart after reaching zero
    }
  }

  function formatSeconds(sec) {
    return sec < 10 ? "0" + sec : sec;
  }

  // Initial display
  countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
    time % 60
  )}`;

  // When you click the Start button, the timer starts counting down.
  // intervalId stores the ID returned by setInterval, so you can stop or reset the timer later.
  // Only one timer runs at a time because we check if (!intervalId).
  pomodoroButton.addEventListener("click", () => {
    if (!intervalId) {
      updateCountdown(); // Update immediately
      intervalId = setInterval(updateCountdown, 1000);
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.add("started");
    }
  });

  /*
    - Click [Start]: Timer begins to count down every second.
    - intervalId holds the timer's reference, so clicking [Stop] or [Reset] can clear it.
    - Only one timer runs at a time because intervalId is checked before starting.
  */

  if (pomodoroStop) {
    pomodoroStop.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    });
  }

  if (pomodoroReset) {
    pomodoroReset.addEventListener("click", () => {
      clearInterval(intervalId);
      intervalId = null;
      time = selTime * 60;
      updateCountdown(); // Update immediately
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    });
  }
});

// Load custom times from localStorage on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedTimes = JSON.parse(localStorage.getItem("customTimes") || "[]");
  savedTimes.forEach((value) => {
    addCustomTimeButton(value);
  });
});

const ul1 = document.getElementById("left1");
const li1 = document.createElement("li");
const but1 = document.createElement("button");
const xeS = document.createElement("div");
const l1 = document.createElement("span");
const l2 = document.createElement("span");

addB.addEventListener("click", () => {
  addAmmount.classList.toggle("active") ||
    addAmmount.classList.toggle("closed");

  addB.classList.toggle("active");
  xeS.classList.toggle("active");

  addB.innerHTML = addB.classList.contains("active")
    ? `close<font style="color: #afd4ed">()</font>`
    : `edit<font style="color: #afd4ed">()</font>`;

  addB.classList.toggle("close");
});

function addCustomTimeButton(value) {
  // Prevent duplicates
  const defaultTimes = [5, 10, 20, 25, 60];
  const existing = Array.from(ul1.querySelectorAll("button")).some(
    (btn) => parseInt(btn.textContent, 10) === value
  );
  if (defaultTimes.includes(value) || existing) return;

  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.classList.add("listItem");
  xeS.classList.add("xS");
  l2.classList.add("l2");
  l1.classList.add("l1");
  btn.textContent = value;
  li.appendChild(btn);
  xeS.appendChild(l1);
  xeS.appendChild(l2);
  li.appendChild(xeS);
  ul1.appendChild(li);

  xeS.addEventListener("click", () => {
    li.remove(); // Remove the list item

    // Also remove from localStorage
    let savedTimes = JSON.parse(localStorage.getItem("customTimes") || "[]");
    savedTimes = savedTimes.filter((time) => time !== value);
    localStorage.setItem("customTimes", JSON.stringify(savedTimes));
  });

  // Sort the list after adding a new item
  const items = Array.from(ul1.children);
  items.sort((a, b) => {
    const aVal = parseInt(a.querySelector("button").textContent, 10);
    const bVal = parseInt(b.querySelector("button").textContent, 10);
    return aVal - bVal;
  });
  items.forEach((item) => ul1.appendChild(item));

  btn.addEventListener("click", () => {
    selTimeF = value;
    let time = selTimeF * 60;
    let intervalId = null;

    function formatSeconds(sec) {
      return sec < 10 ? "0" + sec : sec;
    }

    function updateCountdown() {
      const minutes = Math.floor(time / 60);
      let seconds = time % 60;
      seconds = formatSeconds(seconds);
      countdownEl.innerHTML = `${minutes}:${seconds}`;
      if (time > 0) {
        time--;
      } else {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    // Initial display
    countdownEl.innerHTML = `${Math.floor(time / 60)}:${formatSeconds(
      time % 60
    )}`;

    function startTimer() {
      if (!intervalId) {
        updateCountdown();
        intervalId = setInterval(updateCountdown, 1000);
        pomodoroStop.classList.remove("stopped");
        pomodoroButton.classList.add("started");
      }
    }

    function stopTimer() {
      clearInterval(intervalId);
      intervalId = null;
      updateCountdown();
      pomodoroStop.classList.add("stopped");
      pomodoroButton.classList.remove("started");
    }

    function add() {
      clearInterval(intervalId);
      intervalId = null;
      time = selTimeF * 60;
      updateCountdown();
      pomodoroStop.classList.remove("stopped");
      pomodoroButton.classList.remove("started");
    }

    pomodoroButton.onclick = startTimer;
    pomodoroStop.onclick = stopTimer;
    pomodoroReset.onclick = resetTimer;
  });
}

amountForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const value = parseInt(inputEnter.value, 10);
  if (isNaN(value) || value <= 0) {
    console.log("Too low");
    return;
  }

  // Check for duplicate values including default times
  const defaultTimes = [5, 10, 20, 25, 60];
  const existing = Array.from(ul1.querySelectorAll("button")).some(
    (btn) => parseInt(btn.textContent, 10) === value
  );

  if (defaultTimes.includes(value) || existing) {
    console.log("Value already exists");
    return;
  }

  // saves to local stoarge
  let savedTimes = JSON.parse(localStorage.getItem("customTimes") || "[]");
  savedTimes.push(value);
  savedTimes = Array.from(new Set(savedTimes)).sort((a, b) => a - b);
  localStorage.setItem("customTimes", JSON.stringify(savedTimes));

  // addAmmount.classList.remove("active");

  addCustomTimeButton(value);

  amountForm.reset();
});
// Remove active class when clicking outside the input or form

const duR = document.getElementById("duration");

document.addEventListener("mousedown", (event) => {
  // If the click is outside addAmmount, addB, and xeS, remove "active"
  if (
    !addAmmount.contains(event.target) &&
    !addB.contains(event.target) &&
    !xeS.contains(event.target) &&
    !duR.contains(event.target)
  ) {
    addAmmount.classList.remove("active");
    xeS.classList.remove("active");
    addB.innerHTML = `edit<font style="color: #afd4ed">()</font>`;
  }
});

const navm = document.getElementById("navm");
const durationBar = document.getElementById("duration");

function navM() {
  navm.classList.toggle("active");
  // durationBar.classList.toggle("dactive");
}
