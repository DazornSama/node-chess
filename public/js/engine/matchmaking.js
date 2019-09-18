function onKeyUpUserTag(event) {
  let button = document.getElementById('ask-for-game');
  if(event.target.value.length === 6) {
    button.disabled = false;
  }
  else {
    button.disabled = true;
  }
}

function onSearchGame(event) {
  let animation = document.getElementById('matchmaking-animation');

  if(animation.classList.contains('searching')) {
    document.querySelector('#matchmaking .box-body input').dispatchEvent(new Event('keyup'));
    animation.classList.remove('searching');

    event.target.innerText = i18n('index.matchmaking.search_game_text');
    socket.emit('abort search game');

    document.querySelector('#matchmaking .box-body input').disabled = false;
  }
  else {
    document.querySelector('#matchmaking .box-body input').disabled = true;
    document.getElementById('ask-for-game').disabled = true;
    animation.classList.add('searching');

    event.target.innerText = i18n('index.matchmaking.abort_search_game_text');
    socket.emit('search game', userData.tag);
  }
  
}

function onAskForGame(event) {
  let input = document.querySelector('#matchmaking .box-body input');
  let tag = '#' + input.value;

  event.target.classList.add('loading');
  input.disabled = true;
  document.getElementById('search-game').disabled = true;
  
  socket.emit('ask for game', userData.tag, tag);
}

function onGameFound(game) {
  feedbackUser('success', i18n('index.matchmaking.game_found_text'));

  socket.emit('join room', game.roomName);
  userData.game = game;
  document.getElementById('ingame-chat').disabled = false;
  
  feedbackUser('info', i18n('index.chat.connected_ingame_text'));
  initGame();
}

function onAskForGameError(error) {
  document.querySelector('#matchmaking .box-body input').disabled = false;
  document.getElementById('search-game').disabled = false;
  document.getElementById('ask-for-game').classList.remove('loading');

  feedbackUser('error', i18n(error));
}

function onAskForGameConfirm(result, args) {
  let tag = args[0];
  socket.emit('ask for game result', result, userData.tag, tag);
}