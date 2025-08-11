import config from '../../config.json'

export function _countAndRun(message) {
  console.log(message);
  displayTextInBottomLeftCorner("No Tickets Found")
  // displayResponseInfo(message)
  setTimeout(
    () => {
      _countScriptRunning();
      location.reload()
    },
    config.attempt_retry_seconds * 1000
  );
}

export function _countScriptRunning() {
  let ticketCatcherCounter = sessionStorage.getItem("ticketCatcherCounter");
  if (ticketCatcherCounter === null) ticketCatcherCounter = 1;
  console.log(
    'Script ' +
      ' has been run ' +
      ticketCatcherCounter +
      " times "
  );

  sessionStorage.setItem("ticketCatcherCounter", ++ticketCatcherCounter);
}
 function displayTextInBottomLeftCorner(text) {
    const existingTextElement = document.getElementById('bottomLeftText');
  
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
  
    if (!existingTextElement) {
      const newTextElement = document.createElement('div');
      newTextElement.id = 'bottomLeftText';
      newTextElement.style.display = 'block';
      newTextElement.style.padding = '10px';
      newTextElement.style.backgroundColor = '#000';
      newTextElement.style.color = '#fff';
      newTextElement.style.fontFamily = 'Arial, sans-serif';
      
      let bottomLeftInfo = document.getElementById('bottomLeftContainer');
      if (bottomLeftInfo) {
        bottomLeftInfo.appendChild(newTextElement);
      } else {
        let bottomLeftInfo = document.createElement('div');
        bottomLeftInfo.id = 'bottomLeftContainer';
        bottomLeftInfo.style.display = 'flex';
        bottomLeftInfo.style.gap = '5px';
        bottomLeftInfo.style.flexDirection = 'column';
        bottomLeftInfo.style.position = 'absolute';
        bottomLeftInfo.style.maxWidth = '50%';
        bottomLeftInfo.style.zIndex = '9999';
        bottomLeftInfo.style.top = '0';
        bottomLeftInfo.style.left = '0';
        document.body.appendChild(bottomLeftInfo);
        bottomLeftInfo.appendChild(newTextElement);
      }
  
      newTextElement.textContent = `${text} - ${getCurrentTime()}`;
    } else {
      existingTextElement.textContent = `${text} - ${getCurrentTime()}`;
    }
}

function displayResponseInfo(message, settings) {
  const existingInfoElement = document.getElementById('bottomLeftInfo');

  function createPopup() {
    console.log('in create popup');
    const popupBackground = document.createElement('div');
    popupBackground.style.position = 'fixed';
    popupBackground.style.top = '0';
    popupBackground.style.left = '0';
    popupBackground.style.width = '100%';
    popupBackground.style.height = '100%';
    popupBackground.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    popupBackground.style.zIndex = '999';

    const popup = document.createElement('div');
    popup.id = 'responseHistoryPopup';
    popup.style.borderRadius = '6px';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = 'black';
    popup.style.color = '#fff';
    popup.style.zIndex = '1000';
    popup.style.maxHeight = '80%';
    popup.style.overflowY = 'auto';
    popup.style.height = '100%';
    popup.style.width = '75%';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'space-between';
    popup.style.flexDirection = 'column';

    const historyList = document.createElement('div');
    historyList.style.display = 'flex';
    historyList.style.flexDirection = 'column';
    historyList.style.gap = '10px';
    historyList.style.fontSize = '16px';
    historyList.style.justifyContent = 'center';
    historyList.style.alignItems = 'start';

    settings.responseHistory.forEach((item) => {
      const listItem = document.createElement('div');
      listItem.style.display = 'flex';
      listItem.style.gap = '5px';
      listItem.textContent = item.message;
      const listItemTime = document.createElement('span');
      listItemTime.style.color = '#999';
      listItemTime.style.fontSize = '14px';
      listItemTime.textContent = " - " + item.time;
      listItem.appendChild(listItemTime);
      historyList.appendChild(listItem);
    });
  
    popupBackground.appendChild(popup);
    popup.appendChild(historyList);
    document.body.appendChild(popupBackground);
  

    // functions for closing popup
    function handleClickOutside(event) {
      if (!popup.contains(event.target)) {
        document.body.removeChild(popupBackground);
        document.removeEventListener('click', handleClickOutside);
      }
    }

    function handleEscKey(event) {
      if (event.key === 'Escape') {
        document.body.removeChild(popupBackground);
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      }
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }, 0);
  }

  if (!existingInfoElement) {
    const newInfoElement = document.createElement('div');
    newInfoElement.id = 'bottomLeftInfo';
    newInfoElement.style.display = 'flex';
    newInfoElement.style.gap = '5px';
    newInfoElement.style.padding = '10px';
    newInfoElement.style.backgroundColor = '#000';
    newInfoElement.style.color = '#fff';
    newInfoElement.style.fontFamily = 'Arial, sans-serif';
    
    // Create a separate element for the message
    const messageElement = document.createElement('span');
    messageElement.style.display = 'flex';
    messageElement.style.alignItems = 'center';
    messageElement.textContent = `${message} - ${getCurrentTime()}`;
    
    // Create the button
    const responseHistoryButton = document.createElement('a');
    responseHistoryButton.id = 'responseHistory';
    responseHistoryButton.innerText = 'History';
    responseHistoryButton.onclick = createPopup;

    // Add the specified styles to the button
    responseHistoryButton.style.cursor = 'pointer';
    responseHistoryButton.style.letterSpacing = '1.2px';
    responseHistoryButton.style.fontWeight = '400';
    responseHistoryButton.className = 'button-small button-blue';
    
    // Append both the message and the button
    newInfoElement.appendChild(messageElement);
    newInfoElement.appendChild(responseHistoryButton);
    
    let bottomLeftInfo = document.getElementById('bottomLeftContainer');
    if (!bottomLeftInfo) {
      bottomLeftInfo = document.createElement('div');
      bottomLeftInfo.id = 'bottomLeftContainer';
      bottomLeftInfo.style.display = 'flex';
      bottomLeftInfo.style.flexDirection = 'column';
      bottomLeftInfo.style.position = 'absolute';
      bottomLeftInfo.style.bottom = '0';
      bottomLeftInfo.style.left = '0';
      bottomLeftInfo.style.maxWidth = '50%';
      document.body.appendChild(bottomLeftInfo);
    }
    bottomLeftInfo.appendChild(newInfoElement);
  } else {
    existingInfoElement.querySelector('span').textContent = `${message} - ${getCurrentTime()}`;
  }
}
