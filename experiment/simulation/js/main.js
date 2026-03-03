let medium = 0;
let inoculum = 0;
let air = 0;
let biomass = 0;

let running = false;
let interval = null;

const liquid = document.getElementById("liquid");
const bubbles = document.getElementById("bubbles");
const impeller = document.getElementById("impeller");
const warning = document.getElementById("warning");
const speciesSelect = document.getElementById("species");

const barMedium = document.getElementById("barMedium");
const barInoculum = document.getElementById("barInoculum");
const barAir = document.getElementById("barAir");

const tempSlider = document.getElementById("temp");
const phSlider = document.getElementById("ph");

const tempVal = document.getElementById("tempVal");
const phVal = document.getElementById("phVal");

const biomassDisplay = document.getElementById("biomass");
const airStatus = document.getElementById("airStatus");

const reactor = document.getElementById("reactor");

/* ================= POPUP SYSTEM (FIXED PROPERLY) ================= */

const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const popupOk = document.getElementById("popupOk");

function showPopup(message) {
    popupText.textContent = message;
    popup.style.display = "flex";
}

function hidePopup() {
    popup.style.display = "none";
}

popupOk.addEventListener("click", hidePopup);

// Click outside closes popup
popup.addEventListener("click", function(e){
    if(e.target === popup){
        hidePopup();
    }
});

// ESC key closes popup
document.addEventListener("keydown", function(e){
    if(e.key === "Escape"){
        hidePopup();
    }
});

/* ================= DRAG & DROP ================= */

document.querySelectorAll(".tool").forEach(tool=>{
    tool.addEventListener("dragstart",e=>{
        e.dataTransfer.setData("type",tool.dataset.type);
    });
});

reactor.addEventListener("dragover",e=>e.preventDefault());

reactor.addEventListener("drop",e=>{

    if(running){
        showPopup("⚠ Cannot add components during fermentation.");
        return;
    }

    const type = e.dataTransfer.getData("type");

    if(type==="medium"){
        if(medium>=100) return showPopup("Reactor already full.");
        medium+=20;
        speciesSelect.disabled = false;
    }

    if(type==="inoculum"){
        if(!speciesSelect.value) return showPopup("Select Bacillus species first.");
        if(inoculum>=100) return showPopup("Inoculum already sufficient.");
        inoculum+=20;
        animateInoculum();
    }

    if(type==="air"){
        air+=20;
        if(air>100) air=100;
    }

    updateBars();
});

/* ================= UPDATE BARS ================= */

function updateBars(){

    barMedium.style.width = medium + "%";
    barMedium.innerText = medium + "%";

    barInoculum.style.width = inoculum + "%";
    barInoculum.innerText = inoculum + "%";

    barAir.style.width = air + "%";
    barAir.innerText = air + "%";

    liquid.style.height = medium + "%";

    airStatus.innerText =
        air < 40 ? "Low" :
        air < 70 ? "Medium" : "High";
}

/* ================= INOCULUM ANIMATION ================= */

function animateInoculum(){
    const drop = document.createElement("div");
    drop.style.position = "absolute";
    drop.style.width = "15px";
    drop.style.height = "15px";
    drop.style.background = "purple";
    drop.style.borderRadius = "50%";
    drop.style.top = "150px";
    drop.style.left = "50%";
    drop.style.transform = "translateX(-50%)";
    drop.style.zIndex = "5";

    reactor.appendChild(drop);

    drop.animate([{top:"150px"},{top:"480px"}],{duration:800});

    setTimeout(()=>drop.remove(),800);
}

/* ================= TEMPERATURE & pH ================= */

tempSlider.oninput = ()=>{
    tempVal.innerText = tempSlider.value;
    checkWarnings();
};

phSlider.oninput = ()=>{
    phVal.innerText = phSlider.value;
};

/* ================= WARNINGS ================= */

function checkWarnings(){

    const temp = parseFloat(tempSlider.value);
    const species = speciesSelect.value;

    if(species==="amyloliquefaciens" && temp>44){
        warning.innerText="⚠ Temperature exceeds tolerance for B. amyloliquefaciens.";
        liquid.style.background="rgba(255,120,120,0.85)";
    }
    else if(species==="subtilis" && temp>45){
        warning.innerText="⚠ Temperature exceeds tolerance for B. subtilis.";
        liquid.style.background="rgba(255,120,120,0.85)";
    }
    else{
        warning.innerText="";
        liquid.style.background="rgba(150,255,120,0.85)";
    }
}

/* ================= START FERMENTATION ================= */

document.getElementById("start").onclick = ()=>{

    if(medium===0 || inoculum===0)
        return showPopup("Add medium and inoculum first.");

    if(running) return;

    running = true;
    impeller.classList.add("spin");

    biomass = 0.2;

    let Xmax = (medium * 0.2) + (inoculum * 0.1) + (air * 0.05);
    let mu = 0.4;

    interval = setInterval(()=>{

        if(!running) return;

        let temp = parseFloat(tempSlider.value);
        let ph = parseFloat(phSlider.value);

        let tempFactor = Math.exp(-Math.pow((temp-37)/8,2));
        let phFactor = Math.exp(-Math.pow((ph-7)/1.2,2));

        let growthRate = mu * biomass * (1 - biomass/Xmax) * tempFactor * phFactor;

        biomass += growthRate;

        if(biomass >= Xmax*0.98){
            biomass = Xmax;
            running = false;
            clearInterval(interval);
            impeller.classList.remove("spin");
            showPopup("Stationary phase reached.");
        }

        biomassDisplay.innerText = biomass.toFixed(2);

        if(air>0) spawnBubble();

    },1000);
};

/* ================= STOP ================= */

document.getElementById("stop").onclick = ()=>{
    running=false;
    clearInterval(interval);
    impeller.classList.remove("spin");
};

/* ================= RESET ================= */

document.getElementById("reset").onclick = ()=>{

    running=false;
    clearInterval(interval);

    medium=0;
    inoculum=0;
    air=0;
    biomass=0;

    updateBars();

    liquid.style.height="0%";
    liquid.style.background="rgba(150,255,120,0.85)";

    biomassDisplay.innerText="0.00";
    warning.innerText="";
    speciesSelect.value="";
    speciesSelect.disabled=true;

    impeller.classList.remove("spin");
};

/* ================= BUBBLES ================= */

function spawnBubble(){
    const b=document.createElement("div");
    b.className="bubble";
    b.style.left=Math.random()*100+"%";
    b.style.bottom="0px";
    bubbles.appendChild(b);
    setTimeout(()=>b.remove(),3000);
}

/* ================= DOWNLOAD REPORT ================= */

document.getElementById("download").onclick = ()=>{

    const text = `
Fermentation Report

Species: ${speciesSelect.value}
Medium: ${medium}%
Inoculum: ${inoculum}%
Aeration: ${air}%
Temperature: ${tempVal.innerText} °C
pH: ${phVal.innerText}
Final Biomass: ${biomass.toFixed(2)} g/L
`;

    const blob = new Blob([text],{type:"text/plain"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "fermentation_report.txt";
    link.click();
};