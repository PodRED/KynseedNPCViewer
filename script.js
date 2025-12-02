//--------------------------------------------------
// GLOBALS
//--------------------------------------------------

let itemMap = {};
let currentSortColumn = null;
let currentSortDirection = 1; // 1 = ascending, -1 = descending


//--------------------------------------------------
// LOAD ITEM LIST
//--------------------------------------------------

async function loadItemList() {
  const res = await fetch("EAItems.txt");
  const text = await res.text();

  text.split("\n").forEach(line => {
    const parts = line.trim().split("|");
    if (!parts[0] || isNaN(parts[0])) return;

    const id = parseInt(parts[0]);
    const name = parts[1] || parts[0];
    itemMap[id] = name;
  });
}


//--------------------------------------------------
// HANDLE SAVE FILE UPLOAD
//--------------------------------------------------

document.getElementById("upload").addEventListener("change", async function () {
  await loadItemList();

  const file = this.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const xml = new DOMParser().parseFromString(e.target.result, "text/xml");
    processSave(xml);
  };

  reader.readAsText(file);
});


//--------------------------------------------------
// PROCESS SAVE XML
//--------------------------------------------------

function processSave(xml) {
  const npcs = [...xml.getElementsByTagName("GenerationsSimData")];

  // Current date → needed for Age calculation
  const curYear = parseInt(xml.getElementsByTagName("CurrentYear")[0].textContent);

  let data = npcs
    .filter(n => n.getElementsByTagName("IsDead")[0]?.textContent !== "true")
    .map(npc => extractNPC(npc, curYear));

  buildTable(data);
}


//--------------------------------------------------
// EXTRACT NPC DATA
//--------------------------------------------------

function extractNPC(npc, curYear) {
  const get = tag => npc.getElementsByTagName(tag)[0]?.textContent || null;

  // --- Birth ---
  const bd = npc.getElementsByTagName("Birthdate")[0];
  const byear = bd ? parseInt(bd.getElementsByTagName("year")[0].textContent) : null;
  const bseason = bd ? parseInt(bd.getElementsByTagName("season")[0].textContent) : null;
  const bday = bd ? parseInt(bd.getElementsByTagName("day")[0].textContent) : null;

  // --- Death ---
  const dd = npc.getElementsByTagName("DeathDate")[0];
  const dy = dd ? parseInt(dd.getElementsByTagName("year")[0].textContent) : null;
  const ds = dd ? parseInt(dd.getElementsByTagName("season")[0].textContent) : null;
  const dday = dd ? parseInt(dd.getElementsByTagName("day")[0].textContent) : null;

  // --- Ages ---
  const age = byear != null ? curYear - byear : null;
  const deathAge = dy != null ? dy - byear : null;

  // --- Likes ---
  const likeNodes = npc.getElementsByTagName("Likes")[0]?.getElementsByTagName("int") || [];
  const likes = [...likeNodes].map(x => itemMap[parseInt(x.textContent)] || x.textContent);

  // --- Dislikes ---
  const hateNodes = npc.getElementsByTagName("Hates")[0]?.getElementsByTagName("int") || [];
  const hates = [...hateNodes].map(x => itemMap[parseInt(x.textContent)] || x.textContent);

  return {
    ID: parseInt(get("ID")),
    FirstName: get("FirstName"),
    FamilyName: get("FamilyName"),
    Gender: get("Gender"),
    BirthSeason: bseason,
    BirthDay: bday,
    Age: age,
    DeathAge: deathAge,
    LikedItems: likes.join(", "),
    DislikedItems: hates.join(", "),
    DeathYear: dy,
    DeathSeason: ds,
    DeathDay: dday
  };
}


//--------------------------------------------------
// BUILD TABLE (with sort icons)
//--------------------------------------------------

function buildTable(data) {
  const table = document.getElementById("npcTable");
  const headerRow = document.getElementById("headerRow");
  const body = document.getElementById("tableBody");

  table.style.display = "table";
  headerRow.innerHTML = "";
  body.innerHTML = "";

  const columns = Object.keys(data[0]);

  // Build header with sort arrows
  columns.forEach(col => {
    const th = document.createElement("th");

    // Pick correct icon
    let icon = "";
    if (col === currentSortColumn) {
      icon = currentSortDirection === 1 ? " ▲" : " ▼";
    }

    th.textContent = col + icon;

    th.onclick = () => {
      sortBy(data, col);
    };

    headerRow.appendChild(th);
  });

  // Build rows
  data.forEach(npc => addRow(body, npc, columns));
}


//--------------------------------------------------
// ADD ROW
//--------------------------------------------------

function addRow(body, npc, columns) {
  const tr = document.createElement("tr");

  columns.forEach(col => {
    const td = document.createElement("td");
    td.textContent = npc[col] ?? "";
    tr.appendChild(td);
  });

  body.appendChild(tr);
}


//--------------------------------------------------
// SORTING (with ascending/descending toggle)
//--------------------------------------------------

function sortBy(data, key) {

  if (key === currentSortColumn) {
    // toggle direction
    currentSortDirection *= -1;
  } else {
    // new column defaults to ascending
    currentSortColumn = key;
    currentSortDirection = 1;
  }

  // actual sorting
  data.sort((a, b) => {
    const valA = a[key] ?? "";
    const valB = b[key] ?? "";

    if (valA > valB) return 1 * currentSortDirection;
    if (valA < valB) return -1 * currentSortDirection;
    return 0;
  });

  buildTable(data);
}
