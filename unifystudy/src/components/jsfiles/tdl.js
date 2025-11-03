const navm = document.getElementById("navm");
const taskForm = document.getElementById("taskForm");
const addB = document.getElementById("addB");

function navM() {
  navm.classList.toggle("active");
  // durationBar.classList.toggle("dactive");
}

const ul1 = document.getElementById("taskListTD");
const li1 = document.createElement("li");
const but1 = document.createElement("button");
const xeS = document.createElement("div");
const l1 = document.createElement("span");
const l2 = document.createElement("span");
const inputEnter = document.getElementById("submitIN");

window.addEventListener("DOMContentLoaded", () => {
  const savedTimes = JSON.parse(localStorage.getItem("taskS") || "[]");
  savedTimes.forEach((value) => {
    addTaskButton(value);
  });
});

function addTaskButton(value) {
  // List item basic seciton
  const li = document.createElement("li");
  const div = document.createElement("div");
  const span = document.createElement("span");
  // const spanL = document.createElement("span");
  const divB = document.createElement("span");
  const buT = document.createElement("button");
  const divS = document.createElement("div");
  const spanX = document.createElement("span");
  const spanXT = document.createElement("span");
  span.textContent = value;
  // spanL.classList.add("line");
  li.append(div);
  div.append(divS);
  divS.classList.add("divS");
  // span.append(spanL);
  divS.append(span);
  div.classList.add("listC");
  div.append(divB);
  divB.classList.add("buttonS");
  divB.append(buT);
  buT.append(spanX, spanXT);
  spanX.classList.add("span1");
  spanXT.classList.add("span2");

  //  List Option Section
  const lO = document.createElement("div");
  const lfC = document.createElement("div");
  const lD = document.createElement("button");
  const lF = document.createElement("button");
  // const fHTML = document.create("button");
  lD.classList.add("listDelete");
  lF.classList.add("listFinished");
  lD.innerHTML = "Delete";
  lF.innerHTML = "Edit Name";
  lfC.classList.add("flexcL");
  lO.classList.add("lOption");

  lO.append(lfC);
  lfC.append(lD, lF);
  div.append(lO);

  ul1.appendChild(li);

  lD.addEventListener("click", () => {
    li.remove(); // Remove the list item

    // Also remove from localStorage
    let savedTimes = JSON.parse(localStorage.getItem("taskS") || "[]");
    savedTimes = savedTimes.filter((time) => time !== value);
    localStorage.setItem("taskS", JSON.stringify(savedTimes));
  });

  buT.addEventListener("click", () => {
    divB.classList.toggle("active");
    lO.classList.toggle("active");
  });
  // xeS.addEventListener("click", () => {
  //   li.remove(); // Remove the list item

  //   // Also remove from localStorage
  //   let savedTimes = JSON.parse(localStorage.getItem("customTimes") || "[]");
  //   savedTimes = savedTimes.filter((time) => time !== value);
  //   localStorage.setItem("customTimes", JSON.stringify(savedTimes));
  // });

  // btn.addEventListener("click", () => {
  //   selTimeF = value;
  //   let intervalId = null;
  // });
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = inputEnter.value;

  let savedTimes = JSON.parse(localStorage.getItem("taskS") || "[]");
  savedTimes.push(value);
  savedTimes = Array.from(new Set(savedTimes)).sort((a, b) => a - b);
  localStorage.setItem("taskS", JSON.stringify(savedTimes));

  // addAmmount.classList.remove("active");

  addTaskButton(value);
  taskForm.reset();
});

// Remove active class when clicking outside the input or form

// document.addEventListener("mousedown", (event) => {
//   // If the click is outside addAmmount, addB, and xeS, remove "active"
//   if (!taskForm.contains(event.target)) {
//     taskForm.classList.remove("active");
//     // addB.innerHTML = `edit<font style="color: #afd4ed">()</font>`;
//   }
// });

const butH = document.querySelector(".divS");

butH.addEventListener("click", () => {
  lO.classList.toggle("active");
});
