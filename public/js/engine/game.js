const GameUtils = {
  BOARD_BOUNDS: [0, 9],
  BOARD_CONTAINER: document.getElementById('board'),
  X_LETTERS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  GAME_CONTAINER: document.getElementById('game'),
  SIDES: {
    LOCAL: 'l',
    REMOTE: 'r'
  }
};

var Game = (function() {
  let self = {};
  self.isMyTurn = false;
  self.underChess = false;
  self.secondsToTurnTimeout = 60;
  self.data = undefined;
  self.turnCountdown = undefined;

  /**
   * Initializes game panel
   */
  self.init = async function(resumed) {
    // Removes "active" class from all central boxes
    document.querySelector('.box.game.active').classList.remove('active');
    // Adds "active" class to game box
    GameUtils.GAME_CONTAINER.classList.add('active');

    // Renders the chess'board
    self.renderBoard();
    // Renders the players
    await self.loadPlayers();

    self.setupGameMoves();

    // Condition to check if game has been resumed
    if(!resumed) {
      // Notify the game is loaded and player is ready to play
      self.gameIsReady();
    }
  },

  /**
   * Renders chess' board
   */
  self.renderBoard = function() {
    // Sets the board with equal as its height
    GameUtils.BOARD_CONTAINER.style.width = GameUtils.BOARD_CONTAINER.clientHeight + 'px';

    // Loop cycle to build the board
    // [0][A][B][C][D][E][F][G][H][0]
    // [1][X][X][X][X][X][X][X][X][1]
    // [2][X][X][X][X][X][X][X][X][2]
    // [3][X][X][X][X][X][X][X][X][3]
    // [4][X][X][X][X][X][X][X][X][4]
    // [5][X][X][X][X][X][X][X][X][5]
    // [6][X][X][X][X][X][X][X][X][6]
    // [7][X][X][X][X][X][X][X][X][7]
    // [8][X][X][X][X][X][X][X][X][8]
    // [0][A][B][C][D][E][F][G][H][0]

    // Cycle 10 times for Y axis
    for(let y = GameUtils.BOARD_BOUNDS[0]; y <= GameUtils.BOARD_BOUNDS[1]; y++) {
      // Cycle 10 times for X axis
      for(let x = GameUtils.BOARD_BOUNDS[0]; x <= GameUtils.BOARD_BOUNDS[1]; x++) {
        let template;

        // Condition to check if current x and y are board's borders
        if(GameUtils.BOARD_BOUNDS.includes(y) || GameUtils.BOARD_BOUNDS.includes(x)) {
          // Gets the board's border tile template
          template = getTemplate('template-board-tile-limit');

          // Formats tile
          self.formatLimitNodeByBounds(template, y, x);
        }
        else {
          // Gets the board's tile template
          template = getTemplate('template-board-tile');
  
          // Condition to check if current tile position is even
          if((y + x) % 2 === 0) {
            // Adds "even" class to tile
            template.classList.add('even');
          }
  
          // Sets cartesian coordinates attributes to tile
          template.setAttribute('data-x', self.cartesianXToChar(x));
          template.setAttribute('data-y', self.cartesianYToCoordinate(y));
        }

        // Appends tile to board
        GameUtils.BOARD_CONTAINER.append(template);
      }
    }
  
    // Condition to check if player is on "remote" side
    if(self.getPlayerSide() === GameUtils.SIDES.REMOTE) {
      // Adds "remote" class to chess' board
      GameUtils.BOARD_CONTAINER.classList.add('remote');
    }
  },

  /**
   * Loads chess' board players
   */
  self.loadPlayers = async function() {
    let players = self.data.players;

    // Cycle throught the players array
    for(let i = 0; i < players.length; i++) {
      // Renders current player
      await self.renderPlayer(players[i]);
    }
  },

  /**
   * Renders player information on right side
   * @param {Object} player Player object
   */
  self.renderPlayer = async function(player) {
    // Gets player's board position
    let position = self.isSamePlayer(player.username) ? 'down' : 'up';
    // Gets player's position container
    let container = GameUtils.GAME_CONTAINER.querySelector('.board-player.' + position + ' .name');

    // Sets container content
    container.innerText = player.username;

    // Renders player's units
    await self.renderPlayerUnits(player);
  },

  /**
   * Renders player chess' board units
   * @param {Object} player Player object
   */
  self.renderPlayerUnits = async function(player) {
    // Cycle throught player's units array
    for(let i = 0; i < player.units.length; i++) {
      // Gets current unit
      let unit = player.units[i];

      // Sets unit's x axis value as character
      unit.x = self.cartesianXToChar(unit.x);
  
      // Gets the unit's board tile
      let tile = self.getBoardTileByCoordinates(unit.y, unit.x);
      
      // Get unit's sprite and sets the content of the tile with it
      tile.innerHTML = await self.unitNumberToSprite(unit.u);
      // Sets unit's data attributes to tle
      tile.setAttribute('data-u', unit.u);
      tile.setAttribute('data-s', unit.s);
      
      // Adds player's side class to tile
      tile.classList.add(player.class);
      
      // Condition to check if unit is of the current player
      if(self.isSamePlayer(player.username)) {
        // Adds "movable" class to tile
        tile.classList.add('movable');
        // Adds a "click" event listener to tile
        tile.addEventListener('click', self.showAuthorizedMoves);
      }
    }
  },

  /**
   * Notify server the game is ready and can start to play
   */
  self.gameIsReady = function() {
    // Condition to check if player is on "local" side
    if(self.getPlayerSide() === GameUtils.SIDES.LOCAL) {
      // Notify server the game is loaded and player is ready to play
      socket.emit('game ready', self.data.roomName, self.boardHtmlToArray());
    }
  },

  /**
   * Handler for "game resumed" socketIO event
   * @param {Object} game 
   */
  self.onGameResumed = async function(canMove, data) {
    await Matchmaking.onGameResumed(data);
    await self.onNextTurn(canMove, data);
  },

  /**
   * Handler for "next turn" socketIO event
   * @param {Boolean} canMove Is the player turn?
   * @param {Object} newData Updated game data
   */
  self.onNextTurn = async function(canMove, newData) {
    // Updates game data values
    self.data = newData;
    self.isMyTurn = canMove;

    // Removes "current" class from both board's player containers
    GameUtils.GAME_CONTAINER.querySelector('.board-player.down').classList.remove('current');
    GameUtils.GAME_CONTAINER.querySelector('.board-player.up').classList.remove('current');

    self.underChess = false;
    self.clearAllBoardTiles();

    // Renders game's done moves
    self.renderGameMoves(self.data.rounds);

    // Cycle throught the players
    for(let i = 0; i < self.data.players.length; i++) {
      // Renders current player graveyard units
      await self.renderPlayerGraveyardUnits(self.data.players[i].graveyard);
      self.renderKingUnderChess(self.data.players[i].underChess, self.data.players[i].units.find(x => x.u === 6));
    }
    
    // Condition to check if is player's turn
    if(self.isMyTurn) {
      // Adds "can-move" class to board
      GameUtils.BOARD_CONTAINER.classList.add('can-move');
  
      // Shows new turn message
      self.showNewTurnMessage();
      // Adds "current" class to new turn player's container
      GameUtils.GAME_CONTAINER.querySelector('.board-player.down').classList.add('current');
    }
    else {
      // Removes "can-move" class from board
      GameUtils.BOARD_CONTAINER.classList.remove('can-move');
      // Adds "current" class to new turn player's container
      GameUtils.GAME_CONTAINER.querySelector('.board-player.up').classList.add('current');
    }
  
    setTimeout(() => {
      // Stops and restart the turn countdown timer after 0,3 seconds
      self.stopCurrentTurnCountdown();
      self.startCurrentTurnCountdown();
    }, 300);
  },

  /**
   * Handler for "game end" socketIO event
   * @param {Object} status 
   */
  self.onGameEnd = async function(data) {
    switch(data.status) {
      case 0:
      case 2: 
      case 3:
        if(data.by === userData.tag) {
          alert('HAI VINTO');
        }
        else {
          alert('HAI PERSO');
        }
        break;
      case 1:
        alert('PAREGGIO');
        break;
    }

    window.location.reload();
  },

  /**
   * Shows new game turn message
   */
  self.showNewTurnMessage = function() {
    let container = GameUtils.GAME_CONTAINER.querySelector('.on-message');
    let banner = container.querySelector('.banner');
    let bannerText = banner.querySelector('h2');

    // Adds "active" class to message container
    container.classList.add('active');
    // Adds "animating" class to message banner
    banner.classList.add('animating');

    setTimeout(() => {
      // Adds "animating" class to banner text after 0,3 seconds
      bannerText.classList.add('animating');

      setTimeout(() => {
        // Removes all animations classes after 1,6 seconds
        banner.classList.remove('animating');
        bannerText.classList.remove('animating');
        container.classList.remove('active');
      }, 1300);
    }, 300);
  },

  /**
   * Renders player's units graveyard
   * @param {Array} units Player's unit in the graveyard
   */
  self.renderPlayerGraveyardUnits = async function(units) {
    // Condition to check if graveyard has at least one unit
    if(!units || units.length === 0) {
      return;
    }
  
    let deadUnits = {};
  
    // Cycle throught graveyard's units array
    for(let i = 0; i < units.length; i++) {
      let unit = units[i];
      
      // Gets same dead units count and calulates new value
      if(!deadUnits[unit.u]) {
        deadUnits[unit.u] = 1;
      }
      else {
        deadUnits[unit.u]++;
      }
  
      // Gets player container position
      let position = unit.s === self.getPlayerSide() ? 'up' : 'down';
  
      // Search same unit's tile
      let tile = GameUtils.GAME_CONTAINER.querySelector('.board-player.' + position + ' .graveyard span[data-u="' + unit.u + '"]');
      // Condition to check if tile exists
      if(tile) {
        // Condition to check if current unit's value is greater than 1
        if(deadUnits[unit.u] > 1) {
          // Updates tile value
          tile.querySelector('.count').innerText = 'x ' + deadUnits[unit.u];
        }
      }
      else {
        // Creates new tile
        tile = document.createElement('span');
        // Gets unit's sprite
        let sprite = await self.unitNumberToSprite(unit.u);
  
        // Sets unit data attribute to tile
        tile.setAttribute('data-u', unit.u);
        // Sets tile content
        tile.innerHTML = sprite + '<span class="count"></span>';
  
        // Appends tile to graveyard container
        GameUtils.GAME_CONTAINER.querySelector('.board-player.' + position +' .graveyard').append(tile);
      }
  
      // Condition to check if unit is on "remote" side
      if(unit.s === GameUtils.SIDES.REMOTE) {
        // Adds "remote" class to tile
        tile.classList.add('remote');
      }
    }
  },

  /**
   * Renders game's done moves
   * @param {Array} rounds Game's moves rounds
   */
  self.renderGameMoves = async function(rounds) {
    // Gets game moves history container
    let container = GameUtils.GAME_CONTAINER.querySelector('.moves');
    
    // Condition to check if container has SimpleBar object inside
    if(!container.SimpleBar) {
      // Instantiates a new SimpleBar object for container
      new SimpleBar(container);
    }
    
    let doneRounds = container.querySelectorAll('.move').length;
    // Cycle from already rendered game rounds count to total game rounds count
    for(let i = doneRounds; i < rounds.length; i++) {
      // Gets current round
      let round = rounds[i];

      let username = self.data.players.find(x => x.userTag === round.by).username;
      let from = self.cartesianXToChar(round.move.originX) + round.move.originY;
      let to = self.cartesianXToChar(round.move.x) + round.move.y;

      let sprite = await self.unitNumberToSprite(round.move.u);

      // Gets move history template
      let move = getTemplate('template-round-move');
      move.querySelector('.move-number').innerText = round.number;
      move.querySelector('.move-username').innerText = username;
      move.querySelector('.move-sprite').innerHTML = sprite;
      move.querySelector('.move-from').innerText = from;
      move.querySelector('.move-to').innerText = to;

      move.querySelector('.move-attack').style.display =  round.move.empty ? 'none' : 'inline';

      // Appends move to game moves history list
      container.SimpleBar.getContentElement().append(move);
    }


    // Gets the rounds moves list scroll element
    let scroll = container.SimpleBar.getScrollElement();
    // Scrolls bottom at max possible value
    scroll.scrollTop = scroll.scrollHeight;
  },


  /**
   * Adapt game moves history list on orientation change
   */
  self.setupGameMoves = function() {
    let body = GameUtils.GAME_CONTAINER.querySelector('.moves');
    body.style.height = (GameUtils.GAME_CONTAINER.clientHeight - 40) + 'px';
  },

  /**
   * Render's under chess king
   * @param {Object} king King's unit object
   */
  self.renderKingUnderChess = async function (underChess, king) {
    let tile = self.getBoardTileByCoordinates(king.y, king.x);
    
    // Condition to check if king is under chess status
    if(underChess) {
      self.underChess = true;
      tile.classList.add('under-chess');  
    }
    else {
      tile.classList.remove('under-chess');
    }
  },

  /**
   * Handler for "click" unit's tile event
   * @param {Event} event DOM "cick" event
   */
  self.showAuthorizedMoves = function(event) {
    // Search element with "board-tile" class in event's target parents
    let tile = searchForNodeInParent(event.target, 'board-tile');
    let x = tile.getAttribute('data-x');
    let y = parseInt(tile.getAttribute('data-y'));
  
    // Clears all board tiles from upper layers
    self.clearAllBoardTiles();
    // Adds "selected" class to tile
    tile.classList.add('selected');
  
    // Gets authorized moves array for current tile
    let movements = self.getPlayer().authorizedMoves.find(a => a.x === self.charToCartesianX(x) && a.y === y);
  
    // Condition to check if tile has moves to do
    if(!movements) {
      return;
    }
  
    // Cycle throught moves array
    for(let i = 0; i < movements.moves.length; i++) {
      let move = movements.moves[i];
      
      // Gets move final position tile
      let moveTile = self.getBoardTileByCoordinates(move.y, move.x);

      // Adds "authorized-move" class to final position tile
      moveTile.classList.add('authorized-move');
      // Fills final position tile with move data
      moveTile.setAttribute('data-origin-x', x);
      moveTile.setAttribute('data-origin-y', y);
  
      // Adds a "click" event listener on final position tile
      moveTile.addEventListener('click', self.onMovement);
    }
  },

  /**
   * Handler for "click" move tile event
   * @param {Event} event DOM "click" event
   */
  self.onMovement = function(event) {
    // Search element with "board-tile" class in event's target parents
    let tile = searchForNodeInParent(event.target, 'board-tile');
    
    //Gets move start coordinates
    let startX = self.charToCartesianX(tile.getAttribute('data-origin-x'));
    let startY = parseInt(tile.getAttribute('data-origin-y'));

    // Gets move end coordinates
    let endX = self.charToCartesianX(tile.getAttribute('data-x'));
    let endY = parseInt(tile.getAttribute('data-y'));

    // Notify server to check the chosen move
    socket.emit('request authorize movement', self.data.roomName, userData.tag, self.boardHtmlToArray(), startX, startY, endX, endY);
  },

  /**
   * Handler for "do movement" socketIO event
   * @param {Object} move Movement object
   */
  self.onDoMovement = function(move, sideEffect) {
    // Gets the move start tile
    let originTile = self.getBoardTileByCoordinates(move.originY, move.originX);
    // Gets the move end tile
    let tile = self.getBoardTileByCoordinates(move.y, move.x);
  
    // Clones tile's sprite
    let sprite = originTile.querySelector('svg').cloneNode(true);
  
    // Clears all board tiles from upper layers
    self.clearAllBoardTiles();
  
    let originSvg = originTile.querySelector('svg');
    
    // Adds "moving-from" to svg move start
    originSvg.classList.add('moving-from');
    // Sets move end tile content
    tile.innerHTML = '';
  
    // Condition to check if pawn need to be promoted
    if(self.isMyTurn && move.promote)
    {
      let promoteContainer = document.getElementById('pawn-promote');

      let units = promoteContainer.querySelectorAll('svg');
      for(let i = 0; i < units.length; i++) {
        units[i].setAttribute('data-x', move.x);
        units[i].setAttribute('data-y', move.y);
        units[i].addEventListener('click', self.onRequestPawnPromote);
      }

      promoteContainer.classList.add('visible');
    }
    // Condition to check if is player turn
    else if(self.isMyTurn && !sideEffect) {
      setTimeout(() => {
        // Notify server the turn has been ended after 1 seconds
        socket.emit('end turn', self.data.roomName, self.boardHtmlToArray(), self.data.round.count);
      }, 1000);
    }
  
    setTimeout(() => {
      // All that scope is executed after 0,25 seconds
      // Removes sprite from move start tile
      originSvg.remove();
      
      // Removes "remote" and "local" classes from move end tile
      tile.classList.remove('remote');
      tile.classList.remove('local');

      // Condition to check if move start tile is on "remote" side
      if(originTile.classList.contains('remote')) {
        // Adds "remote" class to move end tile
        tile.classList.add('remote');
        // Removes "remote" class from move start tile
        originTile.classList.remove('remote');
      }
      else {
        // Adds "local" class to move end tile
        tile.classList.add('local');
        // Removes "local" class to move start tile
        originTile.classList.remove('local');
      }
  
      // Removes "movable" class from move start tile
      originTile.classList.remove('movable');
  
      // Sets unit's data attributes to move end tle
      tile.setAttribute('data-u', originTile.getAttribute('data-u'));
      tile.setAttribute('data-s', originTile.getAttribute('data-s'));
      // Removes unit's data attributes from move start tile
      originTile.removeAttribute('data-u');
      originTile.removeAttribute('data-s');
  
      // Condition to check if unit's side is same of player
      if(self.getPlayerSide() === tile.getAttribute('data-s')) {
        // Adds "movable" class to move end tile
        tile.classList.add('movable');
        // Adds a "click" event listener to move end tile
        tile.addEventListener('click', self.showAuthorizedMoves);
      }
      else {
        // Removes "movable" class from move end tile
        tile.classList.remove('movable');
        // Removes a "click" event listener from move end tile
        tile.removeEventListener('click', self.showAuthorizedMoves);
      }
      
      // Removes a "click" event listener from move start tile
      originTile.removeEventListener('click', self.showAuthorizedMoves);
      // Removes a "click" event listener from move end tile
      tile.removeEventListener('click', self.onMovement);
  
      // Appends sprite to move end tile
      tile.append(sprite);

      let tileSvg = tile.querySelector('svg');
      // Adds "moving-to" class to move end tile's sprite
      tileSvg.classList.add('moving-to');
  
      setTimeout(() => {
        // Removes "moving-to" class from move end tile's sprite after 0,25 seconds
        tileSvg.classList.remove('moving-to');

        if(move.side) {
          self.onDoMovement(move.side, true);
          //socket.emit('request authorize movement', self.data.roomName, userData.tag, self.boardHtmlToArray(), move.side.originX, move.side.originY, move.side.x, move.side.y);
        }
      }, 250);
    }, 250);
  },

  /**
   * Handler for "deny-movement" socketIO event
   */
  self.onDenyMovement = function() {
    // Notify player with an error message
    feedbackUser('error', i18n('index.game.deny_movement_text'));
  },

  /**
   * Handler for "click" event listener on request pawn promote
   * @param {Event} event DOM event object
   */
  self.onRequestPawnPromote = function (event) {
    let unit = searchForNodeInParent(event.target, 'svg');

    let x = unit.getAttribute('data-x');
    let y = unit.getAttribute('data-y');
    let u = unit.getAttribute('data-u');

    socket.emit('request pawn promote', self.data.roomName, userData.tag, x, y, u);    
  },

  /**
   * Handler for "do pawm promote" socketIO event
   */
  self.onPawnPromote = async function(pawn) {
    let container = document.getElementById('pawn-promote');
    let tile = self.getBoardTileByCoordinates(pawn.y, pawn.x);
    let sprite = await self.unitNumberToSprite(pawn.u);
    
    tile.innerHTML = sprite;

    container.classList.remove('visible');
    socket.emit('end turn', self.data.roomName, self.boardHtmlToArray(), self.data.round.count);
  },

  /**
   * Handler for "deny pawn promote" socketIO event
   */
  self.onDenyPawnPromote = function() {
    let container = document.getElementById('pawn-promote');
    container.classList.remove('visible');
    if(self.isMyTurn)
    {
      socket.emit('end turn', self.data.roomName, self.boardHtmlToArray(), self.data.round.count);
    }
  },

  /**
   * Formats a tile analyzing its position in the board
   * @param {Element} node Tile DOM element
   * @param {Number} y Y axis value
   * @param {Number} x X axis value
   */
  self.formatLimitNodeByBounds = function (node, y, x) {
    // Condition to check if tile is out as an angle
    if(GameUtils.BOARD_BOUNDS.includes(x) && GameUtils.BOARD_BOUNDS.includes(y)) {
      // Adds "out-of-bounds" class to tile
      node.classList.add('out-of-bounds');
      return;
    }
  
    // Condition to check if tile is out along X axis
    if(GameUtils.BOARD_BOUNDS.includes(x)) {
      // Sets tile content
      node.innerText = self.cartesianYToCoordinate(y);
      // Sets tile borders
      node.style.borderTop = '1px solid #afafaf';
      node.style.borderBottom = '1px solid #afafaf';
    }
    else {
      // Sets tile content
      node.innerText = self.cartesianXToChar(x);
      // Sets tile borders
      node.style.borderRight = '1px solid #afafaf';
      node.style.borderLeft = '1px solid #afafaf';
    }
  },

  /**
   * Converts a cartesian Y axis value to relative board Y value
   * @param {Number} y Y axis value
   */
  self.cartesianYToCoordinate = function (y) {
    return GameUtils.BOARD_BOUNDS[1] - y;
  },

  /**
   * Converts a cartesian X axis value to relative board X value
   * @param {Number} x X axis value 
   * @return {String}
   */
  self.cartesianXToChar = function (x) {
    return GameUtils.X_LETTERS[x - 1];
  },

  /**
   * Converts a character value to relative cartesian X axis value
   * @param {String} c Character value
   */
  self.charToCartesianX = function (c) {
    switch(c) {
      case 'A': return 1;
      case 'B': return 2;
      case 'C': return 3;
      case 'D': return 4;
      case 'E': return 5;
      case 'F': return 6;
      case 'G': return 7;
      case 'H': return 8;
    }
  },

  /**
   * Gets unit's sprite
   * @param {Number} n Unit's sprite number value
   */
  self.unitNumberToSprite = async function (n) {
    let prefix = '/images/chess-sprites/';
    let image = '';
    let suffix = '.svg';
  
    switch(n) {
      case 1:
        image ='pawn';
        break;
      case 2:
        image = 'turret';
        break;
      case 3:
        image = 'bishop';
        break;
      case 4:
        image = 'knight';
        break;
      case 5:
        image = 'queen';
        break;
      case 6:
        image = 'king';
        break;
    }
  
    return await ajaxRequest(prefix + image + suffix);
  },

  /**
   * Gets a board's tile DOM element
   * @param {Number} y Board's Y value
   * @param {String} x Board's X value
   */
  self.getBoardTileByCoordinates = function (y, x) {
    if(typeof(x) === 'number') {
      x = self.cartesianXToChar(x);
    }

    return GameUtils.BOARD_CONTAINER.querySelector('.board-tile[data-x="' + x + '"][data-y="' + y + '"]');
  },

  /**
   * Clears all board's tiles from upper layers
   */
  self.clearAllBoardTiles = function () {
    // Gets all board's tiles
    let tiles = GameUtils.BOARD_CONTAINER.querySelectorAll('.board-tile.authorized-move, .board-tile.selected');

    // Cycle throught all tiles
    for(let i = 0; i < tiles.length; i++) {
      // Removes "authorized-move" class from current tile
      tiles[i].classList.remove('authorized-move');
      // Removes "selected" class from current tile
      tiles[i].classList.remove('selected');

      if(!self.underChess) {
        // Removes "under-chess" class from current tile
        tiles[i].classList.remove('under-chess');
      }

      // Removes a "click" event listener from current tile
      tiles[i].removeEventListener('click', self.onMovement);
    }
  },

  /**
   * Converts DOM board's tree to objects array
   * @return {Array}
   */
  self.boardHtmlToArray = function () {
    let tiles = GameUtils.BOARD_CONTAINER.querySelectorAll('.board-tile');
    
    let array = [];
  
    // Cycles throught all board's tiles
    for(let i = 0; i < tiles.length; i++) {
      let tile = tiles[i];

      // Pushes current tile data into array
      array.push({
        x: self.charToCartesianX(tile.getAttribute('data-x')),
        y: parseInt(tile.getAttribute('data-y')),
        empty: tile.getAttribute('data-u') ? false : true
      });
    }
  
    return array;
  },

  /**
   * Gets current player object
   */
  self.getPlayer = function () {
    return self.data.players.find(x => x.userTag === userData.tag);
  },

  /**
   * Check if current player has same username
   * @param {String} username Username to check equality
   */
  self.isSamePlayer = function(username) {
    return userData.username === username;
  },

  /**
   * Gets current player side
   */
  self.getPlayerSide = function () {
    return self.getPlayer().class === 'remote' ? GameUtils.SIDES.REMOTE : GameUtils.SIDES.LOCAL;
  },

  /**
   * Starts new turn countdown
   */
  self.startCurrentTurnCountdown = function () {
    let ring = document.getElementById('turn-time-ring');
    let circle = ring.querySelector('circle');
    let radius = circle.r.baseVal.value;
    let circumference = radius * 2 * Math.PI;
  
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = `${circumference}`;
  
    // Adds "running" class to circle element
    circle.classList.add('running');

    let roundStart = new Date(self.data.round.startedAt);
    self.secondsToTurnTimeout = 60 - Math.floor((new Date() - roundStart) / 1000);
  
    // Sets an interval each 1 seconds
    self.turnCountdown = setInterval(() => {
      // Decrease seconds from timeout by 1
      self.secondsToTurnTimeout -= 1;
      let s = self.secondsToTurnTimeout;

      let element = document.getElementById('turn-time');
      // Sets timer element content
      element.innerText = s < 10 ? '0' + s : s;
  
      // Calculates ring percentage
      let percent =  (s * 100) / 60;
      let offset = circumference - percent / 100 * circumference;
      circle.style.strokeDashoffset = offset;
  
      // Conditions to color ring when close to some values
      if(s <= 10) {
        // Adds "danger" class to element
        ring.classList.add('close');
      }
      else if (s <= 30) {
        // Adds "close" class to element
        ring.classList.add('danger');
      }
      else {
        // Removes "danger" adn "close" classes from element
        ring.classList.remove('danger');
        ring.classList.remove('close');
      }
  
      // Condition to check if timer has ended
      if(s <= 0) {
        // Stops turn with timeout error
        self.stopCurrentTurnCountdown(true);
      }
    }, 1000);
  },

  /**
   * Stops turn countdown
   * @param {Boolean} outOfTime Is player ran out of time?
   */
  self.stopCurrentTurnCountdown = function (outOfTime) {
    // Clears turn interval and variables
    clearInterval(self.turnCountdown);
    self.turnCountdown = null;
    self.secondsToTurnTimeout = 60;
  
    // Removes "running" class from ring circle
    document.getElementById('turn-time-ring').querySelector('circle').classList.remove('running');
    
    // Removes "close" and "danger" classes from ring
    document.getElementById('turn-time-ring').classList.remove('close');
    document.getElementById('turn-time-ring').classList.remove('danger');
    
    // Condition to check if user is ran out of time
    if(outOfTime) {
      // Sets ring content with timeout error
      document.getElementById('turn-time').innerText = i18n('index.game.turn_out_of_time_text');
      //socket.emit('turn out of time', gameData.room_name, gameData.round.count);
    }
    else {
      // Clears ring content
      document.getElementById('turn-time').innerText = '';
    }
  }

  return self;
}());