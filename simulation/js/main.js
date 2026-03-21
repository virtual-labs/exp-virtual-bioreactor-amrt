let medium = 0;
let inoculum = 0;
let air = 0;
let biomass = 0;

let running = false;
let interval = null;
let bubbleInterval = null;

// Warning Flags
let foamWarningShown = false;
let oxygenWarningShown = false;

// DOM Elements
const liquid = document.getElementById("liquid");
const bubblesContainer = document.getElementById("bubbles");
const impeller = document.getElementById("impeller");
const speciesSelect = document.getElementById("species");

const toolInoculum = document.querySelector('[data-type="inoculum"]');
const toolAir = document.querySelector('[data-type="air"]');

const barMedium = document.getElementById("barMedium");
const barInoculum = document.getElementById("barInoculum");
const barAir = document.getElementById("barAir");

const tempSlider = document.getElementById("temp");
const phSlider = document.getElementById("ph");
const rpmSlider = document.getElementById("rpm");
const substrateSlider = document.getElementById("substrate");
const inocSizeSlider = document.getElementById("inocSize");

const tempVal = document.getElementById("tempVal");
const phVal = document.getElementById("phVal");
const rpmVal = document.getElementById("rpmVal");
const substrateVal = document.getElementById("substrateVal");
const inocSizeVal = document.getElementById("inocSizeVal");

const biomassDisplay = document.getElementById("biomass");
const phaseDisplay = document.getElementById("phase");
const airStatus = document.getElementById("airStatus");
const reactor = document.getElementById("reactor");

const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupOk = document.getElementById("popupOk");

popupOk.onclick = () => popup.style.display = "none";

function showPopup(msg){
  popupText.textContent = msg;
  popup.style.display = "flex";
}

/* Species Limits */
const speciesLimits = {
  subtilis: { tempMax: 45, phMin: 6, phMax: 8, rpmMax: 650 },
  amyloliquefaciens: { tempMax: 44, phMin: 6.2, phMax: 7.8, rpmMax: 700 }
};

/* Sequential Step Unlock Logic */
speciesSelect.addEventListener("change", () => {
  if (speciesSelect.value !== "") {
    toolInoculum.classList.remove("disabled"); // Unlocks Step 3
  } else {
    toolInoculum.classList.add("disabled");
  }
});

/* Drag & Drop */
document.querySelectorAll(".tool").forEach(tool => {
  tool.addEventListener("dragstart", e => {
    e.dataTransfer.setData("type", tool.dataset.type);
  });
});

reactor.addEventListener("dragover", e => e.preventDefault());

reactor.addEventListener("drop", e => {
  if(running){
    showPopup("Cannot modify reactor during fermentation.");
    return;
  }
  const type = e.dataTransfer.getData("type");
  handleToolAction(type);
});

/* Mobile Tap */
document.querySelectorAll(".tool").forEach(tool => {
  tool.addEventListener("click", () => {
    if(running){
      showPopup("Cannot modify reactor during fermentation.");
      return;
    }
    handleToolAction(tool.dataset.type);
  });
});

/* Tool Actions & Progression */
function handleToolAction(type) {
  if (type === "medium") {
    if (medium >= 100) { showPopup("Reactor already full."); return; }
    medium += 20;
    speciesSelect.disabled = false; // Unlocks Step 2
  }
  if (type === "inoculum") {
    if (toolInoculum.classList.contains("disabled")) return;
    if (!speciesSelect.value) { showPopup("Select Bacillus species first."); return; }
    if (inoculum >= 100) { showPopup("Inoculum already sufficient."); return; }
    inoculum += 20;
    animateInoculum();
    toolAir.classList.remove("disabled"); // Unlocks Step 4
  }
  if (type === "air") {
    if (toolAir.classList.contains("disabled")) return;
    if (air >= 100) { showPopup("Maximum aeration reached."); return; }
    air += 20;
  }
  updateBars();
}

/* Update UI Bars */
function updateBars() {
  barMedium.style.width = medium + "%";
  barMedium.innerText = medium + "%";
  barInoculum.style.width = inoculum + "%";
  barInoculum.innerText = inoculum + "%";
  barAir.style.width = air + "%";
  barAir.innerText = air + "%";
  liquid.style.height = medium + "%";

  airStatus.innerText = air < 40 ? "Low" : air < 70 ? "Medium" : "High";
}

/* Inoculum Animation */
function animateInoculum() {
  const drop = document.createElement("div");
  drop.className = "droplet";
  reactor.appendChild(drop);
  setTimeout(() => drop.remove(), 1000);
}

/* Bubble Spawner */
function spawnBubble() {
  if (!running || liquid.style.height === "0%") return;
  
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  
  bubble.style.left = Math.random() * 90 + 5 + "%"; 
  
  const size = Math.random() * 10 + 5;
  bubble.style.width = size + "px";
  bubble.style.height = size + "px";
  
  const rpm = parseFloat(rpmSlider.value);
  const duration = Math.max(1, 4 - (rpm / 300)); 
  bubble.style.animationDuration = duration + "s";
  
  bubblesContainer.appendChild(bubble);
  
  setTimeout(() => bubble.remove(), duration * 1000);
}

/* Slider Limits */
rpmSlider.oninput = () => {
  rpmVal.innerText = rpmSlider.value;
  let sp = speciesSelect.value;
  if(sp && rpmSlider.value > speciesLimits[sp].rpmMax){
    showPopup("Agitation exceeds tolerance.");
    rpmSlider.value = speciesLimits[sp].rpmMax;
    rpmVal.innerText = rpmSlider.value;
  }
};

substrateSlider.oninput = () => substrateVal.innerText = substrateSlider.value;
inocSizeSlider.oninput = () => inocSizeVal.innerText = inocSizeSlider.value;

tempSlider.oninput = () => {
  let v = parseFloat(tempSlider.value);
  tempVal.innerText = v;
  let sp = speciesSelect.value;
  if(sp){
    let limit = speciesLimits[sp].tempMax;
    if(v > limit){
      showPopup("Temperature exceeds tolerance.");
      tempSlider.value = limit;
      tempVal.innerText = limit;
    }
  }
};

phSlider.oninput = () => {
  let v = parseFloat(phSlider.value);
  phVal.innerText = v;
  let sp = speciesSelect.value;
  if(sp){
    let min = speciesLimits[sp].phMin;
    let max = speciesLimits[sp].phMax;
    if(v < min || v > max){
      showPopup("pH outside physiological range.");
      phSlider.value = (min + max) / 2;
      phVal.innerText = phSlider.value;
    }
  }
};

/* Chart.js Setup */
const biomassChart = new Chart(document.getElementById("biomassChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Biomass (g/L)",
      data: [],
      borderColor: "green",
      fill: false,
      tension: 0.2
    }]
  }
});

/* Fermentation Start */
document.getElementById("start").onclick = () => {
  if(medium === 0 || inoculum === 0){
    showPopup("Add medium and inoculum first.");
    return;
  }
  if (running) return;

  running = true;
  foamWarningShown = false;
  oxygenWarningShown = false;

  impeller.classList.add("spin");
  
  if (air > 0) {
    bubbleInterval = setInterval(spawnBubble, 400 - (air * 3)); 
  }

  biomass = 0.02 * parseFloat(inocSizeSlider.value);
  let substrate = parseFloat(substrateSlider.value);
  let Xmax = (substrate * 0.3) + (inoculum * 0.1) + (air * 0.05);
  let mu = 0.4;

  interval = setInterval(() => {
    let temp = parseFloat(tempSlider.value);
    let ph = parseFloat(phSlider.value);
    let rpm = parseFloat(rpmSlider.value);

    let tempFactor = Math.exp(-Math.pow((temp - 37) / 8, 2));
    let phFactor = Math.exp(-Math.pow((ph - 7) / 1.2, 2));
    let oxygenFactor = 1;

    if (air < 30) {
      oxygenFactor = 0.4;
      if (!oxygenWarningShown) {
        showPopup("Oxygen limitation detected.");
        oxygenWarningShown = true;
      }
    }
    
    if (air > 80 && rpm > 600) {
      if (!foamWarningShown) {
        showPopup("Foam formation detected.");
        foamWarningShown = true;
      }
    }

    let growthRate = mu * biomass * (1 - biomass / Xmax) * tempFactor * phFactor * oxygenFactor;
    biomass += growthRate;

    if (biomass < 0.5) phaseDisplay.innerText = "Lag Phase";
    else if (biomass < 0.8 * Xmax) phaseDisplay.innerText = "Exponential Phase";
    else phaseDisplay.innerText = "Stationary Phase";

    if (biomass >= Xmax * 0.98) {
      biomass = Xmax;
      stopFermentation();
      liquid.style.background = "rgba(200,150,80,0.9)";
      showPopup("Stationary phase reached.");
    }

    biomassDisplay.innerText = biomass.toFixed(2);

    if (running) {
      biomassChart.data.labels.push("");
      biomassChart.data.datasets[0].data.push(biomass);
      biomassChart.update();
    }
  }, 1000);
};

function stopFermentation() {
  running = false;
  clearInterval(interval);
  clearInterval(bubbleInterval);
  impeller.classList.remove("spin");
}

document.getElementById("stop").onclick = stopFermentation;

document.getElementById("reset").onclick = () => {
  stopFermentation();

  medium = 0;
  inoculum = 0;
  air = 0;
  biomass = 0;
  
  foamWarningShown = false;
  oxygenWarningShown = false;
  
  updateBars();
  
  liquid.style.height = "0%";
  liquid.style.background = "rgba(120,220,100,0.85)";
  
  phaseDisplay.innerText = "Idle";
  biomassDisplay.innerText = "0.00";
  
  // Lock everything back up!
  speciesSelect.value = "";
  speciesSelect.disabled = true;
  toolInoculum.classList.add("disabled");
  toolAir.classList.add("disabled");
  
  biomassChart.data.labels = [];
  biomassChart.data.datasets[0].data = [];
  biomassChart.update();
};

/* PDF Export */
document.getElementById("download").onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.text("Batch α-Amylase Production Report", 20, 20);
  doc.text(`Organism: ${speciesSelect.value}`, 20, 40);
  doc.text(`Medium: ${medium}%`, 20, 50);
  doc.text(`Inoculum: ${inoculum}%`, 20, 60);
  doc.text(`Aeration: ${air}%`, 20, 70);
  doc.text(`Temperature: ${tempVal.innerText} °C`, 20, 80);
  doc.text(`pH: ${phVal.innerText}`, 20, 90);
  doc.text(`Final Biomass: ${biomass.toFixed(2)} g/L`, 20, 100);
  
  doc.addPage();
  doc.addImage(biomassChart.toBase64Image(), "PNG", 20, 20, 170, 80);
  doc.save("Fermentation_Report.pdf");
};