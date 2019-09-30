/**
 * Functional class to group socketIO handlers
 */
function SocketInterface() {
  /**
   * Handler for "connect" socketIO event
   */
  function _onConnect() {
    // Notify current user of succesfull connection to socket channel
    feedbackUser('info', i18n('index.chat.connected_general_text'));
    // Enables chat input
    document.querySelector('input[name="chat-message"]').disabled = false;
  }

  /**
   * Handler for "disconnect" socketIO event
   */
  function _onDisconnect() {
    // Notify current user of disconnection from socket channel
    feedbackUser('alert', i18n('index.chat.disconnected_general_text'));
    // Disables chat input
    document.querySelector('input[name="chat-message"]').disabled = true;
  }

  /**
   * Handler for "user connected" and "user disconnected" socketIO events
   */
  function _onUserConnectionChanged(number) {
    // Updates online users number
    document.getElementById('users-number').innerText = number;
  }

  /**
   * Handler for "general chat message" and "ingame chat message" socketIO events
   * @param {String} username Message's user name
   * @param {String} tag Message's user tag
   * @param {String} message Message's content
   * @param {String} chatId Chat messages list id attribute
   */
  function _onChatMessage(username, tag, message, chatId) {
    // Gets if targetted chat is selected
    let isChatSelected = document.getElementById(chatId + '-chat').classList.contains('active');
    
    // Gets the message template element
    let template = getTemplate('template-other-message');
    // Sets the "data-tag" attribute
    template.setAttribute('data-tag', tag);
    // Sets the message content
    template.querySelector('.message-user').innerText = username + ' ' + tag;
    template.querySelector('.message-content').innerText = message;
    // Sets the message time
    template.querySelector('.message-time').innerText = getNewMessageTime();

    // Appends message to targetted chat messages list
    appendChatMessage(chatId + '-chat-messages', template);
    
    if(!isChatSelected) {
      // Adds "new" class to targetted chat's button
      document.getElementById(chatId + '-chat').classList.add('new');
    }
    else {
      // Scrolls chat to the last message
      scrollToChatBottom();
    }
  }

  /**
   * Handler for "ask for game" socketIO event
   * @param {String} username Request's user name
   * @param {String} tag Request's user tag
   */
  function _onAskForGame(username, tag) {
    // Gets the translated message and sets the user name
    let message = i18nData.index.matchmaking.ask_for_game_confirmation_text.replace('{0}', username)

    // Notify the user of the game invite
    feedbackUser('info-buttons',
      message,
      { callback: Matchmaking.onAskForGameConfirm, args: [tag] },
      { callback: Matchmaking.onAskForGameConfirm, args: [tag] });
  }

  /**
   * Handler for "force reload" socketIO event
   */
  function _onForceReload() {
    window.location.reload();
  }

  this.onConnect = _onConnect;
  this.onDisconnect = _onDisconnect;
  this.onUserConnectionChanged = _onUserConnectionChanged;
  this.onChatMessage = _onChatMessage;
  this.onAskForGame = _onAskForGame;
  this.onForceReload = _onForceReload;
}