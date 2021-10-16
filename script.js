const isMobile = navigator.userAgent.match(
  /(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/
)
  ? true
  : false;

console.log(`Mobile: ${isMobile}`);
document.getElementById("mobile").innerText = isMobile;
const isIos = iOS();
const LEADERBOARD = "leaderboard";
const color = ["red", "blue", "yellow", "green"];
const buttons = document.getElementsByClassName("simon-btn");
const startButton = document.getElementById("start");
const topInitials = document.getElementById("top-initials");
const topScore = document.getElementById("top-score");
const startAudio = new Audio("./audio/Shall-we-play-a-game.mp3");
const gameButtons = document.getElementsByClassName("simon-btn");
const gameOverAudio = new Audio("./audio/Pacman-death-sound.mp3");
const victoryAudio = new Audio("./audio/victory.mp3");
const scoreOutput = document.getElementById("score");
const modalClose = document.getElementsByClassName("close")[0];
const settingsModal = document.getElementById("settingsModal");
const hiScoreModal = document.getElementById("hiScoreModal");
const playerInitials = document.getElementById("initials");
const rankModal = document.getElementById("yourRank");
const fullLeaderboard = document.getElementById("full-Leader-Modal");
const offOpacity = 0.5;
const onOpacity = 1;
const maxAudioChannels = 6;
const baseSpeed = 500;

// TO-DO add these to a settings menu
const difficulty = 3; // 1 to 3 : 3 being the hardest
const countdownSecondsToStart = 0;
const startingLevel = 1;
const tooSlowToPress = 5;
const victory = 10;
//

const simonSpeed = (4 - difficulty) * baseSpeed;
const pressDuration = baseSpeed / 4;
const releaseDuration = pressDuration / 2;
var tooSlow;
var colorEnum;
var gameActive = false;
var replay = false;
var wait = false;
var currentLevel = 0;
var playerScore = 0;
var leaderboardPosition = 6;
var currentPress = -1;
var simonSays = new Array();
var leaderboardArray = new Array();
var audio = [];
var touchAudio = [];
// var audioChannels = [];
var currentAudioChannel = 0;
var timeouts = [];
audio[0] = "./audio/simonSound1.mp3";
audio[1] = "./audio/simonSound2.mp3";
audio[2] = "./audio/simonSound3.mp3";
audio[3] = "./audio/simonSound4.mp3";

startAudio.volume = 0.2;
gameOverAudio.volume = 0.2;

//this populates the leadboard with no values
//TO-DO Persistent leaderboard
//localStorage.clear();
const loadLocal = localStorage.getItem(LEADERBOARD);
if (loadLocal === null || loadLocal === undefined) {
  for (let a = 0; a < 5; a++) {
    let obj = {
      initials: "---",
      score: 0,
    };
    leaderboardArray[a] = obj;
  }
} else {
  var obj = JSON.parse(loadLocal);
  for (var i in obj) {
    leaderboardArray.push(obj[i]);
  }
  // console.log(leaderboardArray);
}
updateLeaderboard();

// add listeners to the 4 game buttons
for (var i = 0; i < gameButtons.length; i++) {
  gameButtons[i].addEventListener("click", (clickEvent) => {
    colorEnum = color.indexOf(clickEvent.target.id);
    //console.log("Down: ", clickEvent.target.id);
    if (gameActive && !wait) {
      currentPress++;
      //console.log(`Pressed: ${colorEnum} turn: ${currentPress}`);
      clearTimeout(tooSlow);
      tooSlowTimer();
      checkforMatch(colorEnum);
      buttonAction(colorEnum);
    }
  });
}

startButton.addEventListener("click", (clickEvent) => {
  clearTimeout(tooSlow);
  startSimon();
});

document.onclick = (clickEvent) => {
  console.log(clickEvent.target.id);
  if (clickEvent.target.id == "settings") {
    settingsModal.style.display =
      settingsModal.style.display == "block" ? "none" : "flex";
  }
  if (clickEvent.target.className == "close") {
    settingsModal.style.display = "none";
  }
  if (clickEvent.target == settingsModal) {
    settingsModal.style.display = "none";
  }
  if (clickEvent.target.id == "submit") {
    closeLeaderModal();
  }
  if (clickEvent.target.id == "reset") clearLeaderboard();
  if (clickEvent.target.id.includes("top-")) showFullLeaderboard();
  if (clickEvent.target == fullLeaderboard) {
    fullLeaderboard.style.display = "none";
  }
};

document.onkeydown = function () {
  if (window.event.keyCode == "13" && hiScoreModal.style.display == "flex") {
    closeLeaderModal();
  }
};
// end of input events

function buttonAction(num) {
  buttonSound(num);
  buttonEffect(num);
}

function startSimon() {
  if (victoryAudio.currentTime > 0) {
    victoryAudio.pause();
    victoryAudio.currentTime = 0;
  }
  if (gameActive) {
    gameActive = false;
    if (startAudio.currentTime > 0) {
      startAudio.pause();
      startAudio.currentTime = 0;
    }
    scoreOutput.innerText = "RDY";
    startButton.setAttribute("class", "hub-btn start-click");
    startButton.innerText = "Start";
  } else {
    updateDisplay(0);
    playerScore = 0;
    gameActive = true;
    wait = true;
    currentPress = -1;
    currentLevel = 0;
    currentLevel++;
    simonSays = new Array();

    // typically the player will start at level one, but this is configurable
    for (let a = 0; a < startingLevel; a++) {
      simonSays[a] = randomColor();
    }
    currentLevel = simonSays.length;

    // plays the intro audio and will wait till it's complete to start the clock
    touchAudio.push(startAudio);
    startAudio.play();
    startAudio.onended = function () {
      if (!gameActive) return;
      const index = touchAudio.indexOf(this);
      if (index > -1) {
        touchAudio.splice(index, 1);
      }
      startCountdown();
    };
    startButton.setAttribute("class", "hub-btn stop-click");
    startButton.innerText = "Stop";
  }
}

// this is simon's brain. Simon shows the player the sequence
function playback() {
  clearTimeout(tooSlow);
  if (!replay) updateDisplay(currentLevel);
  for (let i = 0; i < simonSays.length; i++) {
    setTimeout(() => {
      //console.log(simonSays[i]);
      buttonAction(simonSays[i]);
      if (i == currentLevel - 1) {
        //console.log("Playback Complete");
        wait = false;
        if (!replay) {
          tooSlowTimer();
        }
      }
    }, i * simonSpeed);
  }
}

// checks to see if the player pressed the correct button at the right time
function checkforMatch(buttonIndex) {
  // console.log(
  //   `Pressed: ${buttonIndex} | Expected: ${[
  //     simonSays[currentPress],
  //   ]} @ ${currentPress}`
  // );
  if (simonSays[currentPress] == buttonIndex) {
    // console.log("Correct");
    if (currentPress == currentLevel - 1) {
      // console.log("Success");
      if (currentLevel >= victory) {
        victoryMarch();
      } else {
        levelComplete();
      }
    }
  } else {
    // console.log("Wrong");
    gameOver();
  }
}

// victory march
function victoryMarch() {
  playerScore = victory;
  updateLeaderboard();
  clearTimeout(tooSlow);
  scoreOutput.innerText = "WIN";
  replay = true;
  wait = true;
  victoryAudio.play();
  setTimeout(() => {
    playback();
    setTimeout(() => {
      openLeaderModal();
    }, currentLevel * simonSpeed + 1000);
  }, 1000);
}

// when the player clicks the wrong sequence start the gameover playback
function gameOver() {
  updateLeaderboard();
  scoreOutput.innerText = "LOSE";
  replay = true;
  wait = true;
  gameOverAudio.onended = function () {
    playback();
    setTimeout(() => {
      openLeaderModal();
    }, currentLevel * simonSpeed + 1000);
  };
  gameOverAudio.play();
}

function openLeaderModal() {
  replay = false;
  if (leaderboardPosition <= 5) {
    console.log("Position: ", leaderboardPosition);
    yourRank.innerText = leaderboardPosition + 1;
    initials.value = "";
    hiScoreModal.style.display = "flex";
  }
  startSimon();
}

// after player matches simon add one more level and playback
function levelComplete() {
  wait = true;
  simonSays.push(randomColor());
  currentPress = -1;
  playerScore = currentLevel;
  currentLevel++;
  // console.log(`current press ${currentPress} | Current level ${currentLevel}`);
  setTimeout(() => {
    playback();
  }, 1000);
}

// update the digital display to show the number of points
function updateDisplay(num) {
  scoreOutput.innerText = padNum(num);
}
// random color picker for Simon
function randomColor() {
  return Math.floor(Math.random() * 4);
}

// Initial countdown after clicking start
function startCountdown() {
  for (let i = countdownSecondsToStart; i >= 0; i--) {
    setTimeout(() => {
      //console.log("Countdown", i);
      updateDisplay(i);
    }, (countdownSecondsToStart - i) * 1000);
  }
  setTimeout(() => {
    //console.log("Countdown complete");
    playback();
  }, (1 + countdownSecondsToStart) * 1000);
}

// button sound effects
function buttonSound(buttonIndex) {
  let audioElement = new Audio(audio[buttonIndex]);
  touchAudio.push(audioElement);
  audioElement.play();

  audioElement.onended = function () {
    const index = touchAudio.indexOf(this);
    if (index > -1) {
      touchAudio.splice(index, 1);
    }
  };
}

// button press effect
function buttonEffect(buttonIndex) {
  let opacity = offOpacity;
  let pressTimer = setInterval(function () {
    if (opacity >= onOpacity) {
      clearInterval(pressTimer);
      buttons[buttonIndex].style.opacity = onOpacity;
      let releaseTimer = setInterval(function () {
        if (opacity <= offOpacity) {
          clearInterval(releaseTimer);
          buttons[buttonIndex].style.opacity = offOpacity;
        }
        buttons[buttonIndex].style.opacity = opacity;
        opacity -= releaseDuration;
      }, releaseDuration);
    }
    buttons[buttonIndex].style.opacity = opacity;
    opacity += pressDuration;
  }, pressDuration);
}

function touchButtonPress(buttonIndex) {
  buttons[buttonIndex].style.opacity = onOpacity;
}
function touchButtonRelease(buttonIndex) {
  buttons[buttonIndex].style.opacity = offOpacity;
}

function updateLeaderboard() {
  leaderboardPosition = 6;
  //console.log(`Score: ${playerScore}`);
  for (let r = 4; r >= 0; r--) {
    if (playerScore > leaderboardArray[r].score) {
      leaderboardPosition = r;
    }
  }
  //console.log("New Rank: ", leaderboardPosition);
  if (leaderboardPosition != 6) {
    leaderboardArray.insert(
      leaderboardPosition,
      leader(leaderboardPosition, playerInitials.value, playerScore)
    );
    leaderboardArray.pop();
  }
  saveLeaderboard();
  updateTopScore();
}

function clearLeaderboard() {
  for (let a = 0; a < 5; a++) {
    let obj = {
      initials: "---",
      score: 0,
    };
    leaderboardArray[a] = obj;
  }
  saveLeaderboard();
  updateTopScore();
}

function closeLeaderModal() {
  leaderboardArray[leaderboardPosition].initials = playerInitials.value;
  saveLeaderboard();
  updateTopScore();
  hiScoreModal.style.display = "none";
}

function updateTopScore() {
  topInitials.innerText = leaderboardArray[0].initials;
  topScore.innerText = padNum(leaderboardArray[0].score);
}

function leader(rank, initials, score) {
  let newLeader = {
    initials: initials,
    score: score,
  };
  return newLeader;
}

function showFullLeaderboard() {
  fullLeaderboard.style.display = "flex";
  let leaderTable = document.getElementById("leader-table");
  leaderTable.innerHTML = "";
  for (let a = 0; a < 5; a++) {
    let leftCol = document.createElement("td");
    let middleCol = document.createElement("td");
    let rightCol = document.createElement("td");
    leftCol.innerText = a + 1;
    middleCol.innerText = leaderboardArray[a].initials;
    rightCol.innerText = padNum(leaderboardArray[a].score);
    let row = document.createElement("tr");
    row.appendChild(leftCol);
    row.appendChild(middleCol);
    row.appendChild(rightCol);
    leaderTable.appendChild(row);
  }
}

// helpers

function saveLeaderboard() {
  localStorage.setItem(LEADERBOARD, JSON.stringify(leaderboardArray));
}

function tooSlowTimer() {
  clearTimeout(tooSlow);
  tooSlow = setTimeout(() => {
    gameOver();
  }, tooSlowToPress * 1000);
}

function padNum(num) {
  let numString = num.toString();
  while (numString.length < 3) numString = "0" + numString;
  return numString;
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

window.addEventListener("DOMContentLoaded", () => {
  computeSizing();
});
window.addEventListener("resize", () => {
  computeSizing();
});

function computeSizing() {
  let html = document.getElementsByTagName("html")[0];
  let upper = document.getElementById("top-scoreboard");
  let lower = document.getElementById("lower-section");
  let housing = document.getElementById("housing-content");
  let maxSize =
    Math.min(lower.clientHeight, lower.clientWidth) * (isMobile ? 0.96 : 0.98);
  let strSize = Math.max(isMobile ? 200 : 350, maxSize) + "px";
  let fontSize = Math.min(lower.clientHeight, lower.clientWidth) * 0.05;
  let strFont = fontSize + "px";
  //console.log(`Set Simon Size to : ${strSize}`);
  //console.log(`Set Base Font ${fontSize}`);
  housing.style.minHeight = strSize;
  housing.style.minWidth = strSize;
  housing.style.height = strSize;
  housing.style.width = strSize;
  html.style.setProperty("--font-size", strFont);
}

function iOS() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}
