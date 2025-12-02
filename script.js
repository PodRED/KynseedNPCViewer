//--------------------------------------------------
// GLOBALS
//--------------------------------------------------

let itemMap = {};
let currentSortColumn = null;
let currentSortDirection = 1;
let fullNPCList = []; // master unfiltered list


//--------------------------------------------------
// LOAD ITEM LIST FROM EAItems.txt
//--------------------------------------------------

async function loadItemList() {
  const res = await fetch("EAItems.txt");
  const text = await res.text();

  text.split("\n").forEach(line => {
    const parts = line.trim().split("|");
    if (!parts[0] || isNaN(parts[0])) return;
    itemMap[parseInt(parts[0])] = parts[1] || parts[0];
  });
}


//--------------------------------------------------
// UPLOAD AND PARSE SAVE FILE
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
// PROCESS XML INTO NPC LIST
//--------------------------------------------------

function processSave(xml) {
  const npcs = [...xml.getElementsByTagName("GenerationsSimData")];
  const curYear = parseInt(xml.getElementsByTagName("CurrentYear")[0].textContent);

  fullNPCList = npcs
    .filter(n => n.getElementsByTagName("IsDead")[0]?.textContent !== "true")
    .map(npc => extractNPC(npc, curYear));

  buildTable(fullNPCList);
  setupFilters();

  // Show table + filters once data is ready
  document.getElementById("npcTable").style.display = "table";
  document.getElementById("filters").style.display = "block";
}


//--------------------------------------------------
// EXTRACT NPC OBJECT FROM XML NODE
//--------------------------------------------------

function extractNPC(npc, curYear) {
  const get = tag => npc.getElementsByTagName(tag)[0]?.textContent || null;

  const bd = npc.getElementsByTagName("Birthdate")[0];
  const byear = bd ? parseInt(bd.getElementsByTagName("year")[0].textContent) : null;
  const bseason = bd ? parseInt(bd.getElementsByTagName("season")[0].textContent) : null;
  const bday = bd ? parseInt(bd.getElementsByTagName("day")[0].textContent) : null;

  const dd = npc.getElementsByTagName("DeathDate")[0];
  const dy = dd ? parseInt(dd.getElementsByTagName("year")[0].textContent) : null;
  const ds = dd ? parseInt(dd.getElementsByTagName("season")[0].textContent) : null;
  const dday = dd ? parseInt(dd.getElementsByTagName("day")[0].textContent) : null;

  const age = byear != null ? curYear - byear : null;
  const deathAge = dy != null ? dy - byear : null;

  const likes = [...npc.getElementsByTagName("Likes")[0]?.getElementsByTagName("int") || []]
    .map(x => itemMap[parseInt(x.textContent)] || x.textContent);

  const hates = [...npc.getElementsByTagName("Hates")[0]?.getElementsByTagName("int") || []]
    .map(x => itemMap[parseInt(x.textContent)] || x.textContent);

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
// BUILD TABLE WITH SORT ICONS
//--------------------------------------------------

function buildTable(data) {
  const headerRow = document.getElementById("headerRow");
  const body = document.getElementById("tableBody");

  headerRow.innerHTML = "";
  body.innerHTML = "";

  if (!data.length) return;

  const columns = Object.keys(data[0]);

  // HEADERS
  columns.forEach(col => {
    const th = document.createElement("th");

    let html = `<span>${col}</span>`;

    if (col === currentSortColumn) {
      th.style.background = "#e6f0ff";

      if (currentSortDirection === 1) {
        html += `<svg width="10" height="10" style="margin-left:4px;"><polygon points="5,1 9,9 1,9" fill="black"/></svg>`;
      } else {
        html += `<svg width="10" height="10" style="margin-left:4px;"><polygon points="1,1 9,1 5,9" fill="black"/></svg>`;
      }
    }

    th.innerHTML = html;
    th.onclick = () => sortBy(data, col);

    headerRow.appendChild(th);
  });

  // ROWS
  data.forEach(npc => {
    const tr = document.createElement("tr");
    columns.forEach(col => {
      const td = document.createElement("td");
      td.textContent = npc[col] ?? "";
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}


//--------------------------------------------------
// SORTING
//--------------------------------------------------

function sortBy(data, key) {
  if (key === currentSortColumn) {
    currentSortDirection *= -1;
  } else {
    currentSortColumn = key;
    currentSortDirection = 1;
  }

  data.sort((a, b) => ((a[key] ?? "") > (b[key] ?? "") ? 1 : -1) * currentSortDirection);

  buildTable(data);
}


//--------------------------------------------------
// FILTERING SYSTEM (UPDATED)
//--------------------------------------------------

function setupFilters() {
  document.getElementById("searchBox").addEventListener("input", applyFilters);
  document.getElementById("genderFilter").addEventListener("change", applyFilters);
  document.getElementById("minAge").addEventListener("input", applyFilters);
  document.getElementById("maxAge").addEventListener("input", applyFilters);
  document.getElementById("likeFilter").addEventListener("input", applyFilters); // ⭐ NEW
}

function applyFilters() {
  const search = document.getElementById("searchBox").value.toLowerCase();
  const gender = document.getElementById("genderFilter").value;
  const minAge = parseInt(document.getElementById("minAge").value);
  const maxAge = parseInt(document.getElementById("maxAge").value);
  const likeFilter = document.getElementById("likeFilter").value.toLowerCase(); // ⭐ NEW

  let filtered = fullNPCList.filter(npc => {

    // Global text search
    if (search && !JSON.stringify(npc).toLowerCase().includes(search)) return false;

    // Gender
    if (gender && npc.Gender !== gender) return false;

    // Age range
    if (!isNaN(minAge) && npc.Age < minAge) return false;
    if (!isNaN(maxAge) && npc.Age > maxAge) return false;

    // ⭐ NEW: liked item contains X
    if (likeFilter && !npc.LikedItems.toLowerCase().includes(likeFilter)) return false;

    return true;
  });

  buildTable(filtered);
}
