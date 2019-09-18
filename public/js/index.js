var socket;

async function onLoad() {
  document.querySelectorAll('#menu .box-body .button, #menu-mobile .box-body .button').forEach((el) => el.addEventListener('click', onMenuItemSelected));

  document.getElementById('hide-chat').addEventListener('click', hideChat);

  document.querySelector('#chat .message-composer input').addEventListener('keypress', onMessageComposed);
  document.getElementById('general-chat').addEventListener('click', onChatSelected);
  document.getElementById('ingame-chat').addEventListener('click', onChatSelected);

  document.getElementById('user-language').addEventListener('change', onChangeLanguage);
  
  document.querySelector('#matchmaking .box-body input').addEventListener('change', onKeyUpUserTag);
  document.querySelector('#matchmaking .box-body input').addEventListener('keyup', onKeyUpUserTag);
  document.getElementById('search-game').addEventListener('click', onSearchGame);
  document.getElementById('ask-for-game').addEventListener('click', onAskForGame);

  if(isMobile()) {
    window.addEventListener('orientationchange', onOrientationChange);

    setupMenuBody();
    setupChatBody();
    new SimpleBar(document.getElementById('menu').querySelector('.box-body'));
  }
  else {
    new MeteorEmoji();
  }

  setupSocket();
  pageLoaded();
}

function setupMenuBody() {
  let menu = document.getElementById('menu');
  let body = menu.querySelector('.box-body');

  let usedHeight = menu.querySelector('.box-head').clientHeight + menu.querySelector('.box-footer').clientHeight + 40;
  body.style.height = 'calc(100% - ' + usedHeight + 'px)';
}

function setupChatBody() {
  let chat = document.getElementById('chat');
  let body = chat.querySelector('.box-body');

  let usedHeight = chat.querySelector('.box-head').clientHeight + chat.querySelector('.box-footer').clientHeight + 40;
  body.style.height = 'calc(100% - ' + usedHeight + 'px)';
}

function onOrientationChange() {
  switch(screen.orientation.angle) {
    case -90:
    case 90:
        setTimeout(() => {
          setupMenuBody();
        }, 100);
      break;
    default:
      setTimeout(() => {
        setupChatBody();
      }, 100);
      break;
  }
}

function setupSocket() {
  socket = io();

  socket.on('connect', () => {
    feedbackUser('info', i18n('index.chat.connected_general_text'));
    document.querySelector('input[name="chat-message"]').disabled = false;
  });

  socket.on('disconnect', () => {
    feedbackUser('alert', i18n('index.chat.disconnected_general_text'));
    document.querySelector('input[name="chat-message"]').disabled = true;
  });

  socket.on('user connected', (number) => {
    document.getElementById('users-number').innerText = number;
  });

  socket.on('user disconnected', (number) => {
    document.getElementById('users-number').innerText = number;
  });

  socket.on('general chat message', (username, tag, message) => {
    let isChatSelected = document.getElementById('general-chat').classList.contains('active');
    
    let template = getTemplate('template-other-message');
    template.setAttribute('data-tag', tag);
    template.querySelector('.message-user').innerText = username + ' ' + tag;
    template.querySelector('.message-content').innerText = message;
    template.querySelector('.message-time').innerText = getNewMessageTime();

    appendChatMessage('general-chat-messages', template);

    if(!isChatSelected) {
      document.getElementById('general-chat').classList.add('new');
    }
    else {
      scrollToChatBottom();
    }
  });

  socket.on('ingame chat message', (username, tag, message) => {
    let isChatSelected = document.getElementById('ingame-chat').classList.contains('active');
    
    let template = getTemplate('template-other-message');
    template.setAttribute('data-tag', tag);
    template.querySelector('.message-user').innerText = username + ' ' + tag;
    template.querySelector('.message-content').innerText = message;
    template.querySelector('.message-time').innerText = getNewMessageTime();

    appendChatMessage('ingame-chat-messages', template);

    if(!isChatSelected) {
      document.getElementById('ingame-chat').classList.add('new');
    }
    else {
      scrollToChatBottom();
    }
  })

  socket.on('game found', (game) => {
    onGameFound(game);
  });

  socket.on('ask for game', (username, tag) => {
    let message = i18nData.index.matchmaking.ask_for_game_confirmation_text.replace('{0}', username)
    feedbackUser('info-buttons',
      message,
      { callback: onAskForGameConfirm, args: [tag] },
      { callback: onAskForGameConfirm, args: [tag] });
  });

  socket.on('ask for game error', (error) => {
    onAskForGameError(error);
  });

  socket.on('next turn', (canMove, game) => {
    onNextTurn(canMove, game);
  });

  socket.on('do movement', (move) => {
    onDoMovement(move);
  });

  socket.on('deny movement', () => {
    onDenyMovement();
  });
}

function onMenuItemSelected(event) {
  let button = searchForNodeInParent(event.target, 'button');
  let target = button.getAttribute('data-target');

  if(target === 'chat') {
    document.getElementById('chat').classList.add('visible');
    setupChatBody();

    document.querySelector('.container').classList.add('shifted');

    scrollToChatBottom();
    return;
  }

  if(target === 'matchmaking') {
    if(userData.game) {
      target = 'game';
    }
  }
  
  document.querySelector('.box.game.active').classList.remove('active');
  document.querySelector('#menu .box-body ul li .button.selected').classList.remove('selected');

  document.getElementById(target).classList.add('active');
  button.classList.add('selected');
}

function hideChat() {
  document.getElementById('chat').classList.add('hiding');
  document.querySelector('.container').classList.remove('shifted');

  setTimeout(() => {
    document.getElementById('chat').classList.remove('hiding');
    document.getElementById('chat').classList.remove('visible');
  }, 250);
}

function onChatSelected(event) {
  document.querySelector('#chat .box-footer .button.active').classList.remove('active');
  
  let button = searchForNodeInParent(event.target, 'button');
  button.classList.add('active');
  button.classList.remove('new');
  
  document.querySelector('#chat .box-body .messages.active').classList.remove('active');
  document.getElementById(button.id + '-messages').classList.add('active');


  scrollToChatBottom();
}

function onMessageComposed(event) {
  if(event.charCode === 13 || event.keyCode === 13) {
    let isGeneralChatSelected = document.getElementById('general-chat').classList.contains('active');

    let template = getTemplate('template-mine-message');
    template.querySelector('.message-content').innerText = event.target.value;
    template.querySelector('.message-time').innerText = getNewMessageTime();

    if(isGeneralChatSelected) {
      socket.emit('general chat message', userData.username, userData.tag, event.target.value);
      
      appendChatMessage('general-chat-messages', template);
      scrollToChatBottom();
    }
    else {
      socket.emit('ingame chat message', userData.game.roomName, userData.username, userData.tag, event.target.value);
      
      appendChatMessage('ingame-chat-messages', template);
      scrollToChatBottom();
    }
    
    event.target.value = '';
  }
}

function appendChatMessage(id, message) {
  message.addEventListener('click', onClickChatMessage);
  document.getElementById(id).SimpleBar.getContentElement().append(message);
}

function onClickChatMessage(event) {
  let message = searchForNodeInParent(event.target, 'clearfix');
  
  if(message.classList.contains('mine')) {
    return;
  }

  let tag = message.getAttribute('data-tag').replace('#', '');

  let temp = document.createElement('input');
  document.body.append(temp);

  temp.value = tag;
  temp.select();
  document.execCommand('copy');
  temp.remove();

  feedbackUser('info', i18n('index.chat.tag_copied_to_clipboard_text'));
}

function scrollToChatBottom() {
  let button = document.querySelector('#chat .box-footer .button.active');

  let scroll = document.getElementById(button.id + '-messages').SimpleBar.getScrollElement();
  scroll.scrollTop = scroll.scrollHeight;
}