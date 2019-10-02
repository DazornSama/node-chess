var socket;

/**
 * Handler for "onload" document event
 */
async function onLoad() {
  // Adds a "click" event listener to each button in "menu"
  document.querySelectorAll('#menu .box-body .button, #menu-mobile .box-body .button').forEach((el) => el.addEventListener('click', onMenuItemSelected));

  // Adds a "click" event listener to "hide-chat"
  document.getElementById('hide-chat').addEventListener('click', hideChat);

  // Adds a "keypress" event listener to chat input
  document.querySelector('#chat .message-composer input').addEventListener('keypress', onMessageComposed);
  // Adds a "click" event listener to "general-chat"
  document.getElementById('general-chat').addEventListener('click', onChatSelected);
  // Adds a "click" event listener to "ingame-chat"
  document.getElementById('ingame-chat').addEventListener('click', onChatSelected);

  // Condition to check if current device is mobile type
  if(isMobile()) {
    // Adds an "orientationchange" event listener to active window
    window.addEventListener('orientationchange', onOrientationChange);

    // Re-render menu and chat content
    setupMenuBody();
    setupChatBody();

    // Instantiate a new simple bar object for menu
    new SimpleBar(document.getElementById('menu').querySelector('.box-body'));
  }
  else {
    // Instantiate a new meteor emoji object for chat
    new MeteorEmoji();
  }

  // Awaits profile DOM initialization
  await Profile.init();
  // Awaits matchmaking DOM initialization
  await Matchmaking.init();
  // Awaits rankings DOM initialization
  await Rankings.init();
  // Awaits settings DOM initialization
  await Settings.init();

  // Setups socket communication
  setupSocket();
  // Page is entirely loaded and usable by user
  pageLoaded();
}

/**
 * Render "menu" content using client's device sizes
 */
function setupMenuBody() {
  // Gets "menu" DOM element
  let menu = document.getElementById('menu');
  // Gets "menu" content DOM element
  let body = menu.querySelector('.box-body');

  // Calculates the height used by "menu" head and footer
  let usedHeight = menu.querySelector('.box-head').clientHeight + menu.querySelector('.box-footer').clientHeight + 40;
  // Sets the "menu" content height
  body.style.height = 'calc(100% - ' + usedHeight + 'px)';
}

/**
 * Render "chat" content using client's device sizes
 */
function setupChatBody() {
  // Gets "chat" DOM element
  let chat = document.getElementById('chat');
  // Gets "chat" content DOM element
  let body = chat.querySelector('.box-body');

  // Calculates the height used by "chat" head and footer
  let usedHeight = chat.querySelector('.box-head').clientHeight + chat.querySelector('.box-footer').clientHeight + 40;
  // Sets the "chat" content height
  body.style.height = 'calc(100% - ' + usedHeight + 'px)';
}

/**
 * Handler for "orientationchange" window event
 */
function onOrientationChange() {
  // Switches current device orientation angle (degrees)
  switch(screen.orientation.angle) {
    // Case when device is in "landscape" mode
    case -90:
    case 90:
        setTimeout(() => {
          // Re-render menu content after 0,1 seconds
          setupMenuBody();
          Game.setupGameMoves();
          Rankings.setupList();
        }, 100);
      break;
    // Case when device is in "portrait" mode
    default:
      setTimeout(() => {
        // Re-render chat content after 0,1 seconds
        setupChatBody();
      }, 100);
      break;
  }
}

/**
 * Initializes socketIO communication handlers
 */
function setupSocket() {
  socket = io();
  let socketInterface = new SocketInterface();

  // Connections socketIO handlers
  socket.on('connect', socketInterface.onConnect);
  socket.on('disconnect', socketInterface.onDisconnect);
  socket.on('user connected', socketInterface.onUserConnectionChanged);
  socket.on('user disconnected', socketInterface.onUserConnectionChanged);
  socket.on('force reload', socketInterface.onForceReload);

  // Chat socketIO handlers
  socket.on('general chat message', (username, tag, message) => socketInterface.onChatMessage(username, tag, message, 'general'));
  socket.on('ingame chat message', (username, tag, message) => socketInterface.onChatMessage(username, tag, message, 'ingame'));

  // Game socketIO handlers
  socket.on('game found', Matchmaking.onGameFound);
  socket.on('ask for game', socketInterface.onAskForGame);
  socket.on('ask for game error', Matchmaking.onAskForGameError);
  socket.on('game resumed', Game.onGameResumed);
  socket.on('next turn', Game.onNextTurn);
  socket.on('do movement', Game.onDoMovement);
  socket.on('deny movement', Game.onDenyMovement);
  socket.on('do pawn promote', Game.onPawnPromote);
  socket.on('deny pawn promote', Game.onDenyPawnPromote);
  socket.on('game end', Game.onGameEnd);
}

/**
 * Handler for "click" menu button event
 * @param {Event} event DOM "click" event
 */
async function onMenuItemSelected(event) {
  // Search element with "button" class in target's parents
  let button = searchForNodeInParent(event.target, 'button');
  // Gets the button's targetted panel
  let target = button.getAttribute('data-target');

  // Condition to check if target is the chat panel
  if(target === 'chat') {
    // Adds "visible" class to chat
    document.getElementById('chat').classList.add('visible');
    // Re-render chat content
    setupChatBody();

    // Adds "shifted" class to container, to show chat on mobile devices
    document.querySelector('.container').classList.add('shifted');

    // Scrolls the chat to the last message
    scrollToChatBottom();
    return;
  }

  // Condition to check if target is the matchmaking panel
  if(target === 'matchmaking') {
    // Condition to check if the current user is already playing a game
    if(Game.data) {
      // Sets the target equal to game panel
      target = 'game';
    }
  }
  else if(target === 'profile') {
    await Profile.init();
  }
  else if(target === 'rankings') {
    await Rankings.init();
  }
  
  // Removes "active" class from all panels
  document.querySelector('.box.game.active').classList.remove('active');
  // Removes "selected" class from all menu buttons
  document.querySelector('#menu .box-body ul li .button.selected').classList.remove('selected');

  // Adds "active" class to targetted panel
  document.getElementById(target).classList.add('active');
  // Adds "selected" class to clicked button
  button.classList.add('selected');
}

/**
 * Hides the chat.
 * Just for mobile devices purposes
 */
function hideChat() {
  // Adds "hiding" class to chat
  document.getElementById('chat').classList.add('hiding');
  // Adds "shifted" class to container
  document.querySelector('.container').classList.remove('shifted');

  setTimeout(() => {
    // Removes "hiding" class to chat after 0,25 seconds
    document.getElementById('chat').classList.remove('hiding');
    // Removes "visible" class from chat after 0,25 seconds
    document.getElementById('chat').classList.remove('visible');
  }, 250);
}

/**
 * Handler for "click" chat selection button event
 * @param {Event} event DOM "click" event
 */
function onChatSelected(event) {
  // Removes "active" class to currently selected button
  document.querySelector('#chat .box-footer .button.active').classList.remove('active');
  
  // Search element with "button" class in target's parents
  let button = searchForNodeInParent(event.target, 'button');
  // Adds "active" class to button
  button.classList.add('active');
  // Removes "new" class from button
  button.classList.remove('new');
  
  // Removes "active" class from currently selected chat messages list
  document.querySelector('#chat .box-body .messages.active').classList.remove('active');
  // Adds "active" class to button's related chat messages list
  document.getElementById(button.id + '-messages').classList.add('active');

  // Scrolls the chat to the last message
  scrollToChatBottom();
}

/**
 * Handler for "keypress" chat input event
 * @param {Event} event DOM "keypress" event 
 */
function onMessageComposed(event) {
  // Condition to check if "enter" key was pressed
  if(event.charCode === 13 || event.keyCode === 13) {
    // Gets the selected chat button
    let isGeneralChatSelected = document.getElementById('general-chat').classList.contains('active');

    // Gets the user's owned message template
    let template = getTemplate('template-mine-message');
    // Sets the message content
    template.querySelector('.message-content').innerText = event.target.value;
    // Sets the message time
    template.querySelector('.message-time').innerText = getNewMessageTime();

    if(isGeneralChatSelected) {
      // Notify to all socketIO clients the new message
      socket.emit('general chat message', userData.username, userData.tag, event.target.value);
      
      // Appends the message to chat messages list
      appendChatMessage('general-chat-messages', template);
      // Scrolls the chat to the last message
      scrollToChatBottom();
    }
    else {
      // Notify to user's game foe the new message
      socket.emit('ingame chat message', Game.data.roomName, userData.username, userData.tag, event.target.value);
      
      // Appends the message to chat messages list
      appendChatMessage('ingame-chat-messages', template);
      // Scrolls the chat to the last message
      scrollToChatBottom();
    }
    
    // Clears the chat input value
    event.target.value = '';
  }
}

/**
 * Appends a new message to the appropriate chat messages list
 * @param {String} id Chat id attribute
 * @param {Element} message Message template element
 */
function appendChatMessage(id, message) {
  // Adds a "click" event listener on the message element
  message.addEventListener('click', onClickChatMessage);
  // Appends the message to the right chat
  document.getElementById(id).SimpleBar.getContentElement().append(message);
}

/**
 * Handler for "click" chat message event
 * @param {Event} event DOM "click" event
 */
function onClickChatMessage(event) {
  // Search element with "clearfix" class in target's parents
  let message = searchForNodeInParent(event.target, 'clearfix');
  
  // Condition to check if message is from current user
  if(message.classList.contains('mine')) {
    return;
  }

  // Gets the message's user tag
  let tag = message.getAttribute('data-tag').replace('#', '');

  // Copies the user's tag to the clipboard
  let temp = document.createElement('input');
  document.body.append(temp);

  temp.value = tag;
  temp.select();
  document.execCommand('copy');
  temp.remove();

  // Notify user of the copy
  feedbackUser('info', i18n('index.chat.tag_copied_to_clipboard_text'));
}

/**
 * Scrolls the selected chat messages list to the bottom since last message
 */
function scrollToChatBottom() {
  // Gets the selected chat button
  let button = document.querySelector('#chat .box-footer .button.active');

  // Gets the chat messages list scroll element
  let scroll = document.getElementById(button.id + '-messages').SimpleBar.getScrollElement();
  // Scrolls bottom at max possible value
  scroll.scrollTop = scroll.scrollHeight;
}