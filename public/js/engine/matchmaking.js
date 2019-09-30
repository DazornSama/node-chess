const Matchmaking = {
  /**
   * Initializes matchmaking panel
   */
  init: async function () {
    // Adds a "change" event listener to user tag input
    document.querySelector('#matchmaking .box-body input').addEventListener('change', this.onKeyUpUserTag);
    // Adds a "keyup" event listener to user tag input
    document.querySelector('#matchmaking .box-body input').addEventListener('keyup', this.onKeyUpUserTag);

    // Adds a "click" event listener to "search game" button
    document.getElementById('search-game').addEventListener('click', this.onSearchGame);
    // Adds a "click" event listener to "ask for game" button
    document.getElementById('ask-for-game').addEventListener('click', this.onAskForGame);
  },

  /**
   * Handler for "change" and "keyup" user tag input event
   * @param {Event} event DOM "change" or "keyup" event
   */
  onKeyUpUserTag: function (event) {
    let button = document.getElementById('ask-for-game');

    // Condition to check if inserted value is a valid tag
    if(event.target.value.length === 6) {
      // Enables button to ask a game
      button.disabled = false;
    }
    else {
      // Disables button to ask a game
      button.disabled = true;
    }
  },

  /**
   * Handler for "click" search game button event
   * @param {Event} event DOM "click" event
   */
  onSearchGame: function (event) {
    // Gets searching animation element
    let animation = document.getElementById('matchmaking-animation');

    // Condition to check if user is already searching a game
    if(animation.classList.contains('searching')) {
      // Trigger "keyup" event fot user tag input
      document.querySelector('#matchmaking .box-body input').dispatchEvent(new Event('keyup'));
      // Removes "searching" class from animation
      animation.classList.remove('searching');

      // Changes button text
      event.target.innerText = i18n('index.matchmaking.search_game_text');
      // Notify server to abort game search
      socket.emit('abort search game');

      // Enables user tag input
      document.querySelector('#matchmaking .box-body input').disabled = false;
    }
    else {
      // Disables user tag input
      document.querySelector('#matchmaking .box-body input').disabled = true;
      // Disables button to ask a game
      document.getElementById('ask-for-game').disabled = true;
      // Adds "searching" class to animation
      animation.classList.add('searching');

      // Changes button text
      event.target.innerText = i18n('index.matchmaking.abort_search_game_text');
      // Notify server to start game search
      socket.emit('search game', userData.tag);
    }
  },

  /**
   * Handler for "click" ask for game button event
   * @param {Event} event DOM "click" event
   */
  onAskForGame: function (event) {
    let input = document.querySelector('#matchmaking .box-body input');
    let tag = '#' + input.value;

    // Adds "loading" class to target
    event.target.classList.add('loading');
    // Disables user tag input
    input.disabled = true;
    // Disables search game button
    document.getElementById('search-game').disabled = true;
    
    // Notify to invited user socketIO client the game request
    socket.emit('ask for game', userData.tag, tag);
  },

  /**
   * Handler for "game found" socketIO event
   * @param {Object} game 
   */
  onGameFound: async function (game) {
    // Notify to user a game has founded
    feedbackUser('success', i18n('index.matchmaking.game_found_text'));

    // Notify the server to join a specific game room
    socket.emit('join room', game.roomName);
    // Updates new game data
    Game.data = game;
    // Enables the game chat button
    document.getElementById('ingame-chat').disabled = false;
    
    // Notify to user the connection to the game
    feedbackUser('info', i18n('index.chat.connected_ingame_text'));

    // Initializes the new game
    await Game.init();
  },

  /**
   * Resumes a game after reconnection
   * @param {Object} game 
   */
  onGameResumed: async function (game) {
    // Notify to user a game has founded
    feedbackUser('success', i18n('index.matchmaking.game_resumed_text'));

    // Notify the server to join a specific game room
    socket.emit('join room', game.roomName);
    // Updates new game data
    Game.data = game;
    // Enables the game chat button
    document.getElementById('ingame-chat').disabled = false;

    // Notify to user the connection to the game
    feedbackUser('info', i18n('index.chat.connected_ingame_text'));

    // Initializes the new game
    await Game.init(true);
  },

  /**
   * Handler for "ask for game error" socketIO event
   * @param {String} error The error message transliation path
   */
  onAskForGameError: function (error) {
    // Enables user tag input
    document.querySelector('#matchmaking .box-body input').disabled = false;
    // Enables search game button
    document.getElementById('search-game').disabled = false;
    // Removes "loading" class from ask for game button
    document.getElementById('ask-for-game').classList.remove('loading');

    // Notify to user the error
    feedbackUser('error', i18n(error));
  },

  /**
   * Handler for "ask for game" feedback choice result
   * @param {Boolean} result The request result
   * @param {Array} args The args passed by the result
   */
  onAskForGameConfirm: function (result, args) {
    // Gets the request's user tag from args
    let tag = args[0];
    // Notify the request's user with the result
    socket.emit('ask for game result', result, userData.tag, tag);
  }
}