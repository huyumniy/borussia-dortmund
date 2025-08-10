import { getData, sendData } from "../utils/fetchUtil.js";
import { _countAndRun } from "../utils/scheduler.js";
import { waitForElement } from "../utils/observer.js";
import ParseAvailableTickets from "../domain/parsers/parseAvailableTickets.js";
import { categoryFiltration } from "../domain/filters/categoryFiltration.js";
import { filterSeatChain } from "../domain/filters/seatFiltration.js";
import { requestSheetData, waitForSheetData } from "../services/chromeExtensionApi.js";
import { settings } from "../models/settingsModel.js";
// import availableRows from "../test-fixtures/availableRows.js";

async function captcha_check(data) {
  if (data?.url && data.url.includes("geo.captcha-delivery.com/captcha")) {
    await send_slack_message();
    return true;
  } else return false;
}
// https://public-api.eventim.com/seatmap/
  // api/public/seatmap/tixx-1001-619772/block/6289343
  // ?a_affiliateId=6135
  // &timestamp=1754862307
  // &signature=SSM8Kk6VAeYJ1QhxhfqJrUljJ3EGyqIAQMr-VF_nB0o
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

/**
 * Populates the form with hidden inputs using URLSearchParams and submits it.
 */
function generatePayload(params) {
  const body = new URLSearchParams();

  params.forEach((value, key) => {
    body.append(key, value)
  });
  return body.toString()
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
    if (!status || status != 200 || !text) success = false;
    console.log("purchaseTicktes", status, text);
  }
  
  return success;
}

export async function main() {
  if (document.location.href.includes("shoppingcart")) {
    alert('tickets are already in cart')
    return;
  }
  const ticketsLimit = 4;

  console.log(settings);
  const currentMatch = identifyMatch();
  console.log(currentMatch, 'currentMatch')
  const filteredSettings = settings.matchesData.filter((match) => match.name === currentMatch);
  console.log(filteredSettings, "filteredSettings data")

  let categoryToQuantityMapping = filteredSettings
  .reduce((acc, setting) => {
    acc[setting.category] = setting.quantity;
    return acc;
  }, {});

  console.log(categoryToQuantityMapping, 'categoryToQuantityMapping')
  
  document.querySelector('#choose-seat-button').click()
  await waitForElement('#__seat-selection__', true, 30000)
  const script = document.getElementById("__seat-selection__");
  if (!script) {
    console.log('[DEBUG] No script has been found on page')
    return;
  }
  const seatList = JSON.parse(script.textContent);
  console.log("got from <script>:", seatList);
  if (!seatList) {
    console.log('No seat info found on page...')
    return;
  }

  let anyAvailableSeat = seatList.areaList.filter(({ freeSeats }) => freeSeats > 0);
  if (!anyAvailableSeat) {
    console.log('No available Seats found...')
    return;
  }

  let tribunes = filteredSettings?.flatMap(setting =>
    setting.tribune ? setting.tribune.filter(t => t) : []
  );
  console.log('tribunes', tribunes)
  
  let availableAreas = seatList.areaList
  .filter(area => area.freeSeats > 0)
  .filter(area => !tribunes || tribunes.length === 0 ||
  tribunes
    .map(t => t.trim().toUpperCase())
    .includes(decodeHtmlEntities(area.name).trim().toUpperCase()))
  console.log('available areas', availableAreas)
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
  // sms filtration
  let availableBlocks = seatList.smsBlocks
  .filter(block => availableSubAreasId.includes(block.id))
  .map(block => ({
    ...block,
    tribune: subAreaIdToTribune[block.id]
  }))

  console.log(availableBlocks, 'availableBlocks')
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
  
  let filteredRows = categoryFiltration(
    availableRows,
    categoryToQuantityMapping,
    seatList.priceCategories
  )
  console.log(filteredRows, 'filteredRows')

  let sortedRows = filteredRows
  .filter(row => row.availabilityInfo.available > 0)
  .sort((a, b) => b.availabilityInfo.available - a.availabilityInfo.available);
  console.log(sortedRows, 'sortedRows')

  let topTicketRowHolder = sortedRows.shift()

  console.log(topTicketRowHolder, 'TOP ticket row holder')
  let availableSeats = topTicketRowHolder.seatGroups.map(row => row.seats
    .filter(seat => seat.available > 0)
  )

  let selectedTicketHolderPriceId = topTicketRowHolder.availabilityInfo.priceCategories[0].priceCategory

  let selectedTicketHolderCategoryQuantity = categoryToQuantityMapping[
    seatList.priceCategories[
      selectedTicketHolderPriceId
    ].name
  ]
  let randomAvailableSeatArray = availableSeats[Math.floor(Math.random() * availableSeats.length)]

  console.log(randomAvailableSeatArray, 'randomAvailableSeatArray')
  let chainedTickets = filterSeatChain(
    randomAvailableSeatArray,
    selectedTicketHolderCategoryQuantity
  )
  if (!chainedTickets.length) {
    console.log("No chained tickets...")
    return;
  }

  let randomChainedTicketsArray = chainedTickets[Math.floor(Math.random() * chainedTickets.length)];

  console.log(chainedTickets, 'chainedTickets')

  let selectedTicketHolderBlockId = topTicketRowHolder.blockId

  const purchaseLink = 
  document.location.href.split('areaplan/')[0]
  + "areaplan/addseats/event"
  + document.location.href.split('/event')[1]
  + "/area/" + selectedTicketHolderBlockId
  console.log(purchaseLink, "purchaseLink")
  // https://public-api.eventim.com/seatmap/
  // api/public/seatmap/tixx-1001-619772/block/6289343
  // ?a_affiliateId=6135
  // &timestamp=1754862307
  // &signature=SSM8Kk6VAeYJ1QhxhfqJrUljJ3EGyqIAQMr-VF_nB0o
  let paramsList = []
  
  const seatInfos = await requestSeatInfos(selectedTicketHolderBlockId, seatList.requestParams)
  console.log('seatInfos!!!', seatInfos)
  for (let index = 0; index < randomChainedTicketsArray.length && index < ticketsLimit; index++) {
    let params = new URLSearchParams();
    let seatId = randomChainedTicketsArray[index];
    let seatNumber = seatInfos.seatInfos.find(seatInfo => seatInfo.id == seatId).seatNumber
    params.append(`seats[0][priceId]`, selectedTicketHolderPriceId)
    params.append(`seats[0][row]`, topTicketRowHolder.labels[0].text)
    params.append(`seats[0][seat]`, seatNumber)
    params.append(`seats[0][blockId]`, selectedTicketHolderBlockId)
    params.append(`seats[0][block]`, topTicketRowHolder.blockName)
    params.append(`seats[0][tribune]`, topTicketRowHolder.tribune)
    params.append(`seats[0][id]`, "s" + seatId)
    paramsList.push(params)
  }

  const success = await purchaseTickets(paramsList, purchaseLink)

  if (success) {
    console.log('SUCCESSFULL!!!')
    // window.location.href = document.location.href.split('shop/')[0] + "shop/shoppingcart"
    const seatCardForm = document.querySelector('#seatCardForm')
    seatCardForm.submit();
  }

  
}

(async function init() {
  await waitForSheetData();
  await main();

})();

setInterval(() => {
  requestSheetData()
}, 60_000);
