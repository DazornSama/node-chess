const BOARD_LENGTH = 10;
const BOARD_BOUNDS = [0, 9];
const X_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
let MY_TURN = false;
let TURN_S = 60;

let gameData;
let turnCountdown;

async function initGame() {
  let gameContainer = document.getElementById('game');
  gameData = userData.game;

  document.querySelector('.box.game.active').classList.remove('active');
  gameContainer.classList.add('active');

  renderBoard();
  await initPlayers();
  gameReady();
}

function renderBoard() {
  let boardHeight = document.getElementById('game').querySelector('#board').clientHeight;
  document.getElementById('game').querySelector('#board').style.width = boardHeight+'px';

  for(let i = 0; i < BOARD_LENGTH; i++) {
    for(let j = 0; j < BOARD_LENGTH; j++) {

      if(BOARD_BOUNDS.includes(i) || BOARD_BOUNDS.includes(j)) {
        let template = getTemplate('template-board-tile-limit');
        formatLimitNodeByBounds(j, i, template);

        document.getElementById('board').append(template);
      }
      else {
        let template = getTemplate('template-board-tile');

        if((j + i) % 2 === 0) {
          template.classList.add('even');
        }

        template.setAttribute('data-x', cartesianXToChar(j));
        template.setAttribute('data-y', cartesianYToCoordinate(i));
    
        document.getElementById('board').append(template);
      }
    }
  }

  if(getPlayerSide() === 'r') {
    document.getElementById('game').querySelector('#board').classList.add('remote');
  }
}

async function initPlayers() {
  let players = gameData.players;
  for(let i = 0; i < players.length; i++) {
    let player = players[i];

    renderPlayer(player.username, player.username === userData.username);
    await renderUnits(player.units, player.class, player.username === userData.username);
  }
}

async function renderUnits(units, color, owner) {
  for(let i = 0; i < units.length; i++) {
    let unit = units[i];
    unit.x = cartesianXToChar(unit.x);

    let tile = getBoardTileByCoordinates(unit.x, unit.y);
    tile.innerHTML = await unitNumberToSprite(unit.u);
    tile.setAttribute('data-u', unit.u);
    tile.setAttribute('data-s', unit.s);
    tile.classList.add(color);
    
    if(owner) {
      tile.classList.add('movable');
      tile.addEventListener('click', showAuthorizedMoves);
    }
  }
}

function renderPlayer(username, isLocale) {
  let position = isLocale ? 'down' : 'up';
  let container = document.getElementById('game').querySelector('.board-player.' + position + ' .name');

  container.innerText = username;
}

function gameReady() {
  if(getPlayerSide() === 'l') {
    socket.emit('game ready', userData.game.roomName, boardHtmlToArray());
  }
}

async function onNextTurn(canMove, game) {
  gameData = game;

  document.getElementById('game').querySelector('.board-player.down').classList.remove('current');
  document.getElementById('game').querySelector('.board-player.up').classList.remove('current');

  for(let i = 0; i < gameData.players.length; i++) {
    await renderGraveyardUnits(gameData.players[i].graveyard);
  }
  
  if(canMove) {
    MY_TURN = true;
    document.getElementById('board').classList.add('can-move');

    let newTurnContainer = document.getElementById('game').querySelector('.on-message');
    newTurnContainer.classList.add('active');

    newTurnContainer.querySelector('.banner').classList.add('animating');

    setTimeout(() => {
      newTurnContainer.querySelector('.banner h2').classList.add('animating');

      setTimeout(() => {
        newTurnContainer.querySelector('.banner').classList.remove('animating');
        newTurnContainer.querySelector('.banner h2').classList.remove('animating');
        newTurnContainer.classList.remove('active');
      }, 1300);
    }, 300);

    document.getElementById('game').querySelector('.board-player.down').classList.add('current');
  }
  else {
    MY_TURN = false;
    document.getElementById('board').classList.remove('can-move');
    document.getElementById('game').querySelector('.board-player.up').classList.add('current');
  }

  setTimeout(() => {
    stopCurrentTurnCountdown();
    startCurrentTurnCountdown();
  }, 300);
}

async function renderGraveyardUnits(units) {
  if(!units || units.length === 0) {
    return;
  }

  let deadUnits = {};

  for(let i = 0; i < units.length; i++) {
    if(!deadUnits[units[i].u]) {
      deadUnits[units[i].u] = 1;
    }
    else {
      deadUnits[units[i].u]++;
    }

    let playerPosition = units[i].s === getPlayerSide() ? 'down' : 'up';

    let tile = document.getElementById('game').querySelector('.board-player.' + playerPosition + ' .graveyard span[data-u="' + units[i].u + '"]');
    if(tile) {
      tile.querySelector('.count').innerText = 'x ' + deadUnits[units[i].u];
    }
    else {
      tile = document.createElement('span');
      let sprite = await unitNumberToSprite(units[i].u);

      tile.setAttribute('data-u', units[i].u);
      tile.innerHTML = sprite + '<span class="count"></span>';

      document.getElementById('game').querySelector('.board-player.' + playerPosition +' .graveyard').append(tile);
    }

    if(units[i].s === 'r') {
      tile.classList.add('remote');
    }
  }
}

function showAuthorizedMoves(event) {
  let tile = searchForNodeInParent(event.target, 'board-tile');
  let x = tile.getAttribute('data-x');
  let y = parseInt(tile.getAttribute('data-y'));

  clearAllBoardTiles();
  tile.classList.add('selected');

  let player = getPlayer();
  let moves = player.authorizedMoves.find(a => a.x === charToCartesianX(x) && a.y === y);

  if(!moves) {
    return;
  }

  for(let i = 0; i < moves.moves.length; i++) {
    let move = moves.moves[i];
    let moveTile = getBoardTileByCoordinates(cartesianXToChar(move.x), move.y);

    moveTile.classList.add('authorized-move');
    fillBoardTileWithData(moveTile, x, y);

    moveTile.addEventListener('click', onMovement);
  }
}

function onMovement(event) {
  let tile = searchForNodeInParent(event.target, 'board-tile');

  let endX = charToCartesianX(tile.getAttribute('data-x'));
  let endY = parseInt(tile.getAttribute('data-y'));

  let startX = charToCartesianX(tile.getAttribute('data-origin-x'));
  let startY = parseInt(tile.getAttribute('data-origin-y'));

  socket.emit('request authorize movement', gameData.roomName, userData.tag, boardHtmlToArray(), startX, startY, endX, endY);
}

function onDoMovement(move) {
  let originTile = getBoardTileByCoordinates(cartesianXToChar(move.originX), move.originY);
  let tile = getBoardTileByCoordinates(cartesianXToChar(move.x), move.y);

  let sprite = originTile.querySelector('svg').cloneNode(true);

  clearAllBoardTiles();

  originTile.querySelector('svg').classList.add('moving-from');
  tile.innerHTML = '';

  if(MY_TURN) {
    setTimeout(() => {
      socket.emit('end turn', gameData.roomName, boardHtmlToArray(), gameData.round.count);
    }, 1000);
  }

  setTimeout(() => {
    originTile.querySelector('svg').remove();
    
    tile.classList.remove('remote');
    tile.classList.remove('local');
    if(originTile.classList.contains('remote')) {
      tile.classList.add('remote');
      originTile.classList.remove('remote');
    }
    else {
      tile.classList.add('local');
      originTile.classList.remove('local');
    }

    originTile.classList.remove('movable');

    tile.setAttribute('data-u', originTile.getAttribute('data-u'));
    tile.setAttribute('data-s', originTile.getAttribute('data-s'));
    originTile.removeAttribute('data-u');
    originTile.removeAttribute('data-s');

    if(getPlayerSide() === tile.getAttribute('data-s')) {
      tile.classList.add('movable');
      tile.addEventListener('click', showAuthorizedMoves);
    }
    else {
      tile.classList.remove('movable');
      tile.removeEventListener('click', showAuthorizedMoves);
    }

    originTile.removeEventListener('click', showAuthorizedMoves);
    tile.removeEventListener('click', onMovement);

    tile.append(sprite);
    tile.querySelector('svg').classList.add('moving-to');

    setTimeout(() => {
      tile.querySelector('svg').classList.remove('moving-to');
    }, 250);
  }, 250);
}

function onDenyMovement() {
  feedbackUser('error', i18n('index.game.deny_movement_text'));
}

function formatLimitNodeByBounds(x, y, node) {
  if(BOARD_BOUNDS.includes(x) && BOARD_BOUNDS.includes(y)) {
    node.classList.add('out-of-bounds');
    return;
  }

  if(BOARD_BOUNDS.includes(x)) {
    node.innerText = cartesianYToCoordinate(y);
    node.style.borderTop = '1px solid #afafaf';
    node.style.borderBottom = '1px solid #afafaf';
  }
  else {
    node.innerText = X_LETTERS[x - 1];
    node.style.borderRight = '1px solid #afafaf';
    node.style.borderLeft = '1px solid #afafaf';
  }
}

function cartesianYToCoordinate(y) {
  return BOARD_BOUNDS[1] - y;
}

function cartesianXToChar(x) {
  return X_LETTERS[x - 1];
}

function charToCartesianX(c) {
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
}

async function unitNumberToSprite(n) {
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
}

function getBoardTileByCoordinates(x, y) {
  return document.querySelector('#board .board-tile[data-x="' + x + '"][data-y="' + y + '"]');
}

function fillBoardTileWithData(tile, x, y) {
  tile.setAttribute('data-origin-x', x);
  tile.setAttribute('data-origin-y', y);
}

function clearAllBoardTiles() {
  let tiles = document.querySelectorAll('#board .board-tile.authorized-move, #board .board-tile.selected');
  for(let i = 0; i < tiles.length; i++) {
    tiles[i].classList.remove('authorized-move');
    tiles[i].classList.remove('selected');
    tiles[i].removeEventListener('click', onMovement);
  }
}

function boardHtmlToArray() {
  let board = document.getElementById('board');
  let tiles = board.querySelectorAll('.board-tile');
  
  let array = [];

  for(let i = 0; i < tiles.length; i++) {
    let tile = tiles[i];
    array.push({
      x: charToCartesianX(tile.getAttribute('data-x')),
      y: parseInt(tile.getAttribute('data-y')),
      empty: tile.getAttribute('data-u') ? false : true
    });
  }

  return array;
}

function getPlayer() {
  return gameData.players.find(x => x.userTag === userData.tag);
}

function getPlayerSide() {
  return getPlayer().class === 'remote' ? 'r' : 'l';
}

function startCurrentTurnCountdown() {
  let circle = document.getElementById('turn-time-ring').querySelector('circle');
  let radius = circle.r.baseVal.value;
  let circumference = radius * 2 * Math.PI;

  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = `${circumference}`;

  circle.classList.add('running');

  turnCountdown = setInterval(() => {
    TURN_S -= 1;
    document.getElementById('turn-time').innerText = TURN_S < 10 ? '0' + TURN_S : TURN_S;

    let percent =  (TURN_S * 100) / 60;
    const offset = circumference - percent / 100 * circumference;
    circle.style.strokeDashoffset = offset;

    if(TURN_S < 10) {
      document.getElementById('turn-time').classList.add('close');
    }

    if(TURN_S <= 0) {
      stopCurrentTurnCountdown(true);
    }
  }, 1000);
}

function stopCurrentTurnCountdown(outOfTime) {
  clearInterval(turnCountdown);
  turnCountdown = null;
  TURN_S = 60;

  document.getElementById('turn-time-ring').querySelector('circle').classList.remove('running');
  
  document.getElementById('turn-time').classList.remove('close');
  
  if(outOfTime) {
    document.getElementById('turn-time').innerText = i18n('index.game.turn_out_of_time_text');
    //socket.emit('turn out of time', gameData.room_name, gameData.round.count);
  }
  else {
    document.getElementById('turn-time').innerText = '';
  }
}