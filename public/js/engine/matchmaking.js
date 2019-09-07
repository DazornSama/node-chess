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
  }
  else {
    document.getElementById('ask-for-game').disabled = true;
    animation.classList.add('searching');

    event.target.innerText = i18n('index.matchmaking.abort_search_game_text');
    socket.emit('search game', userData.tag);
  }
  
}

function onAskForGame(event) {

}