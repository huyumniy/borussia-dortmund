import { getData, sendData } from "../utils/fetchUtil.js";
import { _countAndRun } from "../utils/scheduler.js";
import { waitForElement } from "../utils/observer.js";
import ParseAvailableTickets from "../domain/parsers/parseAvailableTickets.js";
import { categoryFiltration } from "../domain/filters/categoryFiltration.js";
import { filterSeatChain } from "../domain/filters/seatFiltration.js";
import { requestSheetData, waitForSheetData } from "../services/chromeExtensionApi.js";
import { settings } from "../models/settingsModel.js";
import { randomChoice, shuffleArray } from "../utils/helpers.js";


async function requestSeatInfos(blockId, requestParams) {
  let requestLink = requestParams.server +
    "/seatmap/api/public/seatmap/" + 
    requestParams.cType + "-" +
    requestParams.cId + "-" +
    requestParams.evId +
    "/block/" + blockId +
    "?a_affiliateId=" + requestParams.additionalRequestParams.a_affiliateId +
    "&timestamp=" + requestParams.additionalRequestParams.timestamp +
    "&signature=" + requestParams.additionalRequestParams.signature
  
  let { status, text, json , error } = await getData(requestLink)
  if (status !== 200 || text.length < 1 || !!error) {
    console.log('requestSeatInfos error', status, text, error)
    return false;
  }
  return json;
}

function decodeHtmlEntities(str) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
}

function identifyMatch() {
  const parentDiv = document.querySelector('.hero__headings')
  let homeTeamName = parentDiv.querySelector('#home-team-name')
  let guestTeamName = parentDiv.querySelector('#guest-team-name')
  if (!homeTeamName || !guestTeamName) return null;
  return `${homeTeamName.textContent} vs ${guestTeamName.textContent}`
}


async function purchaseTickets(params, purchaseLink) {
  let success = true;
  
  for (let i=0; i<params.length; i++) {
    const { status, text, json , error } = await sendData(
    purchaseLink,
    params[i],
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    }
    );
    if (!status || status != 200 || !text) {
      success = false;
      return success;
    }
  }
  
  return success;
}

export async function main() {
  if (document.location.href.includes("shoppingcart")) {
    alert('Tickets are already in cart')
    return;
  }
  if (document.querySelector(".notification-sign")) {
    alert("You are already have tickets in cart! Delete them first to start a new search")
    return;
  }
  const ticketsLimit = 4;
  console.log(settings);

  const currentMatch = identifyMatch();
  console.log(currentMatch, 'currentMatch')
  const filteredSettings = settings.matchesData.filter((match) => match.name === currentMatch);
  console.log(filteredSettings, "filteredSettings data")
  if (!filteredSettings || filteredSettings.length === 0) {
    let message = "This match is not included in Google Sheets settings"
    console.log(message)
    _countAndRun(message)
    return;
  }

  let categoryToQuantityMapping = filteredSettings
  .reduce((acc, setting) => {
    acc[setting.category] = setting.quantity;
    return acc;
  }, {});

  console.log(categoryToQuantityMapping, 'categoryToQuantityMapping')
  
  document.querySelector('#choose-seat-button').click()
  let seatSelection = document.querySelector("#__seat-selection__")
  if (!seatSelection) await waitForElement('#__seat-selection__', true, 15000)
  const script = document.getElementById("__seat-selection__");
  if (!script) {
    let message = 'No script has been found on page'
    console.log(message)
    _countAndRun(message)
    return;
  }
  const seatList = JSON.parse(script.textContent);
  console.log("got from <script>:", seatList);
  if (!seatList) {
    let message = 'No seat info found on page...'
    console.log(message)
    _countAndRun(message)
    return;
  }


  let tribunes = filteredSettings?.flatMap(setting =>
    Array.isArray(setting.tribune)
      ? setting.tribune.filter(Boolean)
      : setting.tribune
        ? [setting.tribune]
        : []
  );

  console.log('tribunes', tribunes)
  
  let availableAreas = seatList.areaList
  .filter(area => area.freeSeats > 0 || area.freeSeats === -1)
  .filter(area => !tribunes || tribunes.length === 0 ||
  tribunes
    .map(t => t.trim().toUpperCase())
    .includes(decodeHtmlEntities(area.name).trim().toUpperCase()))
  
  console.log('available areas', availableAreas)

  if (!availableAreas || availableAreas.length === 0) {
    let message = "No available areas found"
    console.log(message)
    _countAndRun(message)
    return;
  }

  let subAreaIdToTribune = {};
  availableAreas.forEach(area => {
    if (Array.isArray(area.subAreas)) {
      area.subAreas.forEach(subArea => {
        if (subArea && subArea.freeSeats > 0 && subArea.id != null) {
          subAreaIdToTribune[subArea.id] = area.name;
        }
      });
    }
  });

  console.log(subAreaIdToTribune, "subAreaIdToTribune")

  let availableSubAreasId = availableAreas.flatMap(area => {
    if (!Array.isArray(area.subAreas)) return [];
    return area.subAreas
      .filter(subArea => subArea && subArea.freeSeats > 0 && subArea.id != null)
      .map(subArea => subArea.id);
  });
  console.log('available sub areas id', availableSubAreasId)

  if (!availableSubAreasId || availableSubAreasId.length === 0) {
    let message = "No available sub areas found"
    console.log(message)
    _countAndRun(message)
    return;
  }

  // sms filtration
  let availableBlocks = seatList.smsBlocks
  .filter(block => availableSubAreasId.includes(block.id))
  .map(block => ({
    ...block,
    tribune: subAreaIdToTribune[block.id]
  }))

  console.log(availableBlocks, 'availableBlocks')

  if (!availableBlocks || availableBlocks.length === 0) {
    let message = "No available blocks found"
    console.log(message)
    _countAndRun(message)
    return;
  }
  let tribune = "",
    blockId = "",
    blockName = "",
    categoryName = "",
    priceId = "",
    row = "",
    ticketsArray = [],
    paramsList = [],
    seatInfos = null;
    
  
  if (randomChoice(availableBlocks)?.generalAdmissions) {
    let categoryFilteredBlocks = availableBlocks.filter(block => {
      block.generalAdmissions[0]?.priceCategory &&
      Object.keys(categoryToQuantityMapping)
      .includes(block.generalAdmissions[0].priceCategory.name)
    })
    console.log(categoryFilteredBlocks, "categoryFilteredBlocks")
    let availableCategoryFilteredBlocks = categoryFilteredBlocks
      .filter(block => {
        let area = block.generalAdmissions[0]
        area.available >= categoryToQuantityMapping[area.priceCategory.name]
      })
    console.log(availableCategoryFilteredBlocks, "availableCategoryFilteredBlocks")
    let availableSeat = randomChoice(availableCategoryFilteredBlocks).generalAdmissions[0]
    console.log(availableSeat, "availableSeat")
    tribune = availableSeat.tribune
    blockId = availableSeat.blockId
    blockName = availableSeat.blockName
    categoryName = availableSeat.priceCategory.name
    priceId = availableSeat.priceCategory.id
    for (let index = 0; index <= availableSeat.available && index < ticketsLimit; index++) {
      ticketsArray.push(availableSeat.id + seatList.requestParams.additionalRequestParams.timestamp)
    }

  } else if (randomChoice(availableBlocks)?.rows) {
    let availableRows = availableBlocks.flatMap(block =>
      Array.isArray(block.rows)
        ? block.rows
          .filter(row => row.availabilityInfo?.available > 0)
          .map(row => ({
            ...row,
            blockName: block.blockName,
            tribune: block.tribune
          }))
        : []
    );

    console.log("availableRows", availableRows)

    if (!availableRows || availableRows.length === 0) {
      let message = "No available rows found"
      console.log(message)
      _countAndRun(message)
      return;
    }
    
    let filteredRows = categoryFiltration(
      availableRows,
      categoryToQuantityMapping,
      seatList.priceCategories
    )
    console.log(filteredRows, 'filteredRows')

    if (!filteredRows || filteredRows.length === 0) {
      let message = "No necessary categories in rows found"
      console.log(message)
      _countAndRun(message)
      return;
    }

    let sortedRows = filteredRows
    .filter(row => row.availabilityInfo.available > 0)
    .sort((a, b) => b.availabilityInfo.available - a.availabilityInfo.available);
    console.log(sortedRows, 'sortedRows')

    let shuffledRows = shuffleArray([...sortedRows]);

    let topTicketRowHolder;
    let chainedTickets = [];
    for (const row of shuffledRows) {
      topTicketRowHolder = row;
      console.log(topTicketRowHolder, 'TOP ticket row holder')
      let availableSeats = topTicketRowHolder.seatGroups
        .map(row => row.seats.filter(seat => seat.available > 0))
      priceId = topTicketRowHolder.availabilityInfo.priceCategories[0].priceCategory
      let selectedTicketHolderCategoryQuantity = categoryToQuantityMapping[
        seatList.priceCategories[
          priceId
        ].name
      ]

      let randomAvailableSeatArray = availableSeats[Math.floor(Math.random() * availableSeats.length)]
      console.log(randomAvailableSeatArray, 'randomAvailableSeatArray')
      
      chainedTickets = filterSeatChain(
        randomAvailableSeatArray,
        selectedTicketHolderCategoryQuantity
      )
      console.log(chainedTickets, 'chainedTickets')

      if (chainedTickets.length) break; // found valid row
    }

    if (!chainedTickets.length) {
      let message = "No chained tickets found"
      console.log(message)
      _countAndRun(message)
      return;
    }

    ticketsArray = chainedTickets[Math.floor(Math.random() * chainedTickets.length)];

    blockId = topTicketRowHolder.blockId
    blockName = topTicketRowHolder.blockName
    tribune = topTicketRowHolder.tribune
    row = topTicketRowHolder.labels[0].text
    seatInfos = await requestSeatInfos(blockId, seatList.requestParams)
    }

      const purchaseLink = 
    document.location.href.split('areaplan/')[0]
    + "areaplan/addseats/event"
    + document.location.href.split('/event')[1]
    + "/area/" + blockId
    console.log(purchaseLink, "purchaseLink")

    
    console.log(ticketsArray)
    for (let index = 0; index < ticketsArray.length && index < ticketsLimit; index++) {
      let params = new URLSearchParams();
      let seatId = ticketsArray[index];
      seatNumber = "";
      if (seatInfos) seatInfos.seatInfos.find(seatInfo => seatInfo.id == seatId).seatNumber
      console.log(seatNumber, "seatnumber!!!")
      params.append(`seats[0][priceId]`, priceId)
      params.append(`seats[0][row]`, row)
      params.append(`seats[0][seat]`, seatNumber)
      params.append(`seats[0][blockId]`, blockId)
      params.append(`seats[0][block]`, blockName)
      params.append(`seats[0][tribune]`, tribune)
      params.append(`seats[0][id]`, "s" + seatId)
      paramsList.push(params)
    }

    const success = await purchaseTickets(paramsList, purchaseLink)

    if (success) {
      const seatCardForm = document.querySelector('#seatCardForm')
      seatCardForm.submit();
      return;
    }

    let message = `Error in purchasing tickets. ${seatInfos}`
    console.log(message)
    _countAndRun(message)
    return;

}




  function formatNumber(num) {
    return num < 10 ? `0${num}` : num;
  }

  function getCurrentTime() {
    const now = new Date();
    const hours = formatNumber(now.getHours());
    const minutes = formatNumber(now.getMinutes());
    const seconds = formatNumber(now.getSeconds());
    return `${hours}:${minutes}:${seconds}`;
  }

(async function init() {
  await waitForSheetData();
  await main();

})();
