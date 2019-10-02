'use strict';

// Chess units enum
const UNITS = {
  'PAWN': 1,
  'TURRET': 2,
  'BISHOP': 3,
  'KNIGHT': 4,
  'QUEEN': 5,
  'KING': 6,
};

// Chess players   sides
const SIDES = {
  LOCAL: 'l',
  REMOTE: 'r'
};

/**
 * Returns a chess board's units initial positions
 * @param {Boolean} opponent Is the player the opponent?
 */
function generateUnits(opponent)
{
  // Gets current player first and second row vertical axis
  let firstRow = opponent ? 8 : 1;
  let secondRow = opponent ? (firstRow - 1) : (firstRow + 1);

  // Gets current player board's side
  let side = opponent ? SIDES.REMOTE : SIDES.LOCAL;

  return [
    { s: side, u: 2, x: 1, y: firstRow },
    { s: side, u: 4, x: 2, y: firstRow },
    { s: side, u: 3, x: 3, y: firstRow },
    { s: side, u: (opponent ? 6 : 5), x: 4, y: firstRow },
    { s: side, u: (opponent ? 5 : 6), x: 5, y: firstRow },
    { s: side, u: 3, x: 6, y: firstRow },
    { s: side, u: 4, x: 7, y: firstRow },
    { s: side, u: 2, x: 8, y: firstRow },
    { s: side, u: 1, x: 1, y: secondRow },
    { s: side, u: 1, x: 2, y: secondRow },
    { s: side, u: 1, x: 3, y: secondRow },
    { s: side, u: 1, x: 4, y: secondRow },
    { s: side, u: 1, x: 5, y: secondRow },
    { s: side, u: 1, x: 6, y: secondRow },
    { s: side, u: 1, x: 7, y: secondRow },
    { s: side, u: 1, x: 8, y: secondRow }
  ];
}

/**
 * Calculates all moves a player can do in a specific turn
 * @param {Object} board Chess board object
 * @param {Object} game Game object
 * @param {Object} player Player object
 */
function calcAllPossibleMoves(board, game, player)
{
  let moves = [];

  // Gets current player's foe
  let foe = game.players.find(x => x !== player);
  // Concatenates player and foe units into an union array
  let units = cloneObjectArray(player.units).concat(foe.units);

  // Condition to check if current player has maliciously edited the chess board
  let cheated = hasBoardBeenEdited(board, units);
  if(cheated)
  {
    // Returns the player has cheated
    player.cheated = true;
    return;
  }

  // Cycle throught all player's units
  for(let i = 0; i < player.units.length; i++)
  {
    // Gets current unit
    let unit = player.units[i];
    let moveData = {
      x: unit.x,
      y: unit.y,
      u: unit.u,
      moves: []
    };

    // Condition to check if unit is not a turrent/king
    if(unit.u !== UNITS.TURRET && unit.u !== UNITS.KING)
    {
      // Sets the first move as false
      unit.f = false;
    }
    
    // Switches current unit typology to calculate specific moves
    switch(unit.u)
    {
      case UNITS.PAWN:
        moveData.moves = calcPawnAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
      case UNITS.TURRET:
        moveData.moves = calcTurretAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
      case UNITS.BISHOP:
        moveData.moves = calcBishopAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
      case UNITS.KNIGHT:
        moveData.moves = calcKnightAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
      case UNITS.QUEEN:
        moveData.moves = calcQueenAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
      case UNITS.KING:
        moveData.moves = calcKingAuthorizedMoves(board, units, unit.x, unit.y, unit.s);
        break;
    }

    // Condition to check if currente unit move data has at least 1 move
    if(moveData.moves.length > 0)
    {
      moves.push(moveData);
    }
  }

  return moves;
}

/**
 * Calculates illegal moves to avoid to put current player's king under chess
 * @param {Array} movesData Current turn player's moves
 * @param {Object} board Chess board object
 * @param {Object} game Game object
 * @param {Object} player Player object
 */
function onKingUnderChess(movesData, board, game, player)
{
  let illegalMoves = [];

  // Gets current player's foe
  let foe = game.players.find(x => x !== player);
  // Concatenates player and foe units into an union array
  let units = player.units.concat(foe.units);

  // Gets player's king unit
  let king = player.units.find(x => x.u === UNITS.KING);

  // Clones move's data into a new variable
  let clonedMovesData = cloneObjectArray(movesData);

  // Cycle throught all moves data cloned
  for(let i = 0; i < clonedMovesData.length; i++)
  {
    // Gets current move's data
    let moveData = clonedMovesData[i];
    // Clones move data's moves into a new variable 
    let clonedMoves = cloneObjectArray(moveData.moves);

    // Cycle throught all move data's moves cloned
    // From last to zero index
    for(let j = (clonedMoves.length - 1); j >= 0; j--)
    {
      // Get's current move
      let move = clonedMoves[j];
      
      // Clones board into a new variable
      let clonedBoard = cloneObjectArray(board);
      // Clones player's units into a new variable
      let clonedPlayerUnits = cloneObjectArray(units);
      // Clones foe's units into a new variable
      let clonedFoeUnits = cloneObjectArray(foe.units);
      // Clones player's king into a new variable
      let clonedKing = Object.assign({}, king);

      // Condition to check if current unit is the king one
      if(clonedKing.x === moveData.x && clonedKing.y === moveData.y)
      {
        // Updates cloned king position
        clonedKing.x = move.x;
        clonedKing.y = move.y;
      }
      
      // Simulates unit movement on board object
      clonedBoard.find(a => a.x === moveData.x && a.y === moveData.y).empty = true;
      clonedBoard.find(a => a.x === move.x && a.y === move.y).empty = false;

      // Gets current move player's cloned unit
      let unit = clonedPlayerUnits.find(a => a.x === moveData.x && a.y === moveData.y);
      // Updates player's cloned unit position
      unit.x = move.x;
      unit.y = move.y;

      // Gets a possible foe's cloned dead unit
      let deadUnit = clonedFoeUnits.find(a => a.x === unit.x && a.y === unit.y);
      // Condition to check if foe's cloned dead unit exists
      if(deadUnit)
      {
        // Removes foe's cloned dead unit from cloned units array
        let start = clonedFoeUnits.indexOf(deadUnit);
        clonedFoeUnits.splice(start, 1);
      }

      // Gets if after the move king is under chess status
      let kingUnderChess = isKingUnderChess(clonedBoard, clonedFoeUnits, clonedPlayerUnits, clonedKing);
      // Condition to check if king is under chess
      if(kingUnderChess)
      {
        // Stores current move as illegal
        illegalMoves.push([i, j]);
      }
    }
  }  

  // Cycle throught all illegal moves
  for(let i = 0; i < illegalMoves.length; i++)
  {
    // Removes current illegal move from possible moves array
    movesData[illegalMoves[i][0]].moves.splice(illegalMoves[i][1], 1);
  }

  // Returns if king is actually under chess
  return isKingUnderChess(board, foe.units, units, king);
}

/**
 * Checks if current turn chess' board has been maliciously edited
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 */
function hasBoardBeenEdited(board, units)
{
  let result = false;

  // Cycle throught all board tiles
  for(let i = 0; i < board.length; i++)
  {
    // Gets current board tile
    let tile = board[i];
    
    // Condition to check if tle is not empty
    if(!tile.empty)
    {
      // Gets current tile unit
      let unit = units.find(x => x.x === tile.x && x.y === tile.y);
      // Condition to check if unit exists
      if(!unit)
      {
        // Player has cheated
        result = true;
      }
    }
  }

  return result;
}

/**
 * Calculates all moves for the pawn unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 */
function calcPawnAuthorizedMoves(board, units, x, y, side) 
{
  let moves = [];

  // Gets if current unit is on the reflected side of the board
  let isRemote = side === SIDES.REMOTE;
  // Gets the movement tiles length
  let length = calcPawnMoveLength(y, isRemote);

  // Cycle 3 times
  // From -1 to 1
  // -1, 0, 1
  for(let i = -1; i <= 1; i++) 
  {
    // Gets current position length
    // Just the central one can be of 2
    let relLength = i === 0 ? length : 1;
    
    let encounter = false;

    // Cycle throught all movement length
    for(let j = 1; j <= relLength; j++) 
    {
      // Condition to check if along movement has been encountered another unit
      if(encounter) 
      {
        continue;
      }

      // Calculates movement new horizontal and vertical axis
      let relX = x + i;
      let relY = y + parseNumberRelativeToSide(j, isRemote);

      // Gets movement new board tile
      let tile = getBoardTileByCoordinates(board, relX, relY);
      // Condition to check if board tile exists
      if(!tile) 
      {
        continue;
      }
      // Condition to check if tile is not empty
      else if(!tile.empty) 
      {
        encounter = true;
      }

      // Gets board tile's unit
      let tileUnit = getUnitbyCoordinates(units, tile.x, tile.y);

      // Conditions to avoid current movement
      // Horizontal axis is the same as initial and board tile is not empty
      if(relX === x && !tile.empty) 
      {
        continue;
      }
      // Horizontal axis is different from initial and board tile is not empty and ally
      else if(relX !== x && !isTileFullAndEnemyUnit(tile, tileUnit, side)) 
      {
        continue;
      }

      // Sets if current movement is unit's first or not
      tile.first = length === 2 ? true : false;
      // Calculates if current movement can promote the unit
      tile.promote = isPawnAtLimit(relY, isRemote);

      // Stores current movement as legal
      moves.push(tile);
    }
  }

  // Cycle 2 times
  // From -1 to 1
  // -1, 1
  for(let i = -1; i <= 1; i += 2)
  {
    // Calculates movement new horizontal axis
    let relX = x + i;
    
    // Gets movement new board tile
    let tile = getBoardTileByCoordinates(board, relX, y);
    // Condition to check if board tile exists
    if(!tile)
    {
      continue;
    }

    // Gets board tile's unit
    let tileUnit = getUnitbyCoordinates(units, tile.x, tile.y);
    
    // Conditions to avoid current movement
    // Board tile is not empty and ally
    if(!isTileFullAndEnemyUnit(tile, tileUnit, side))
    {
      continue;
    }
    // Board tile unit has done more than 1 movement
    else if(!tileUnit.f)
    {
      continue;
    }

    // Stores current movement as legal
    moves.push(tile);
  }

  return moves;
}

/**
 * Calculates pawn unit vertical movement length
 * @param {Number} y Unit's vertical axis
 * @param {Boolean} isRemote Is the unit on the reflected side of the board?
 */
function calcPawnMoveLength(y, isRemote) 
{
  // Condition to check if unit is on initial position
  if(isRemote && y === 7 ||
    !isRemote && y === 2) 
  {
    return 2;
  }

  return 1;
}

/**
 * Calculates if pawn unit is at the opposite - from initial - side of the board
 * @param {Number} y Unit's vertical axis
 * @param {Boolean} isRemote Is the unit on the reflected side of the board?
 */
function isPawnAtLimit(y, isRemote) {
  // Condition to check if unit is at the opposite side from initial
  if(isRemote && y === 1 ||
    !isRemote && y === 8)
  {
    return true;
  }

  return false;
}

/**
 * Calculates all moves for the knight unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 */
function calcKnightAuthorizedMoves(board, units, x, y, side) 
{
  // Calculates the square to use to calculate moves

  // Gets square vertical axis start
  let yStart = y + parseNumberRelativeToSide(2);
  // Gets square vertical axis end
  let yEnd = y + parseNumberRelativeToSide(-2);
  // Gets the vertical axis increment
  let yIncrement = yStart > yEnd ? -1 : 1;
  // Gets the updated vertical axis end value
  let yOffset = yEnd + yIncrement;

  // Gets square horizontal axis start
  let xStart = x - parseNumberRelativeToSide(2);
  // Gets first possible horizontal value if "xStart" is out of bounds
  let nxStart = xStart ? xStart : getLastXBySide(true);
  // Gets square horizontal axis end
  let xEnd = x + parseNumberRelativeToSide(2);
  // Gets last possible horizontal value if "xEnd" is out of bounds
  let nxEnd = xEnd ? xEnd : getLastXBySide(false);
  // Gets the horizontal axis increment
  let xIncrement = parseNumberRelativeToSide(1);
  let nxOffset = nxEnd + xIncrement;

  // Calculates square's vertical moves
  let vMoves = iterateKnightMoves(board, units, y, yStart, yOffset, yIncrement, xStart, xEnd, side, true);
  // Calculates square's horizontal moves
  let hMoves = iterateKnightMoves(board, units, x, nxStart, nxOffset, xIncrement, yStart, yEnd, side, false);

  // Returns all the moves calculated
  return vMoves.concat(hMoves);
}

/**
 * Iterates two parallel lines on the knight calculated square
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} axis Current axis value
 * @param {Number} start Current axis start 
 * @param {Number} end Current axis end
 * @param {Number} increment Current axis increment
 * @param {Number} j Cross axis start
 * @param {Number} k Cross axis end
 * @param {SIDES} side Unit's chess board side
 * @param {Boolean} vertical Are the parallel lines vertical?
 */
function iterateKnightMoves(board, units, axis, start, end, increment, j, k, side, vertical) 
{
  let moves = [];

  // Cycle from axis start to axis end
  for(let i = start; i !== end; i += increment) 
  {
    // Calc axis offset
    let offset = i - axis;
    // Condition to check if axis offset is even
    if(offset % 2 === 0) 
    {
      continue;
    }
    
    let tiles = [];

    // Condition to check if current axis is not vertical
    if(!vertical) 
    {
      // Gets start and end tile for horizontal axis
      tiles.push(getBoardTileByCoordinates(board, i, j));
      tiles.push(getBoardTileByCoordinates(board, i, k));
    }
    else 
    {
      // Gets start and end tile for vertical axis
      tiles.push(getBoardTileByCoordinates(board, j, i));
      tiles.push(getBoardTileByCoordinates(board, k, i));
    }

    // Cycle throught tiles array
    for(let l = 0; l < tiles.length; l++)
    {
      let tile = tiles[l];

      // Condition to check if current tile exists
      if(tile)
      {
        // Gets tile's unit
        let unit = getUnitbyCoordinates(units, tile.x, tile.y);
        // Condition to check if tile is empty or tile is not empty and unit is enemy
        if(tile.empty || isTileFullAndEnemyUnit(tile, unit, side))
        {
          // Stores current movement as legal
          moves.push(tile);
        }
      }
    }
  }

  return moves;
}

/**
 * Calculates all moves for the turret unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 * @param {Boolean} single Should cycle just one time?
 */
function calcTurretAuthorizedMoves(board, units, x, y, side, single) 
{
  let tiles = [];
  let axis = [x, y];

  // Cycle throught axis array
  for(let i = 0; i < axis.length; i++) 
  {
    // Gets current axis value
    let a = axis[i];

    // Cycle 2 times
    // -1, 1
    for(let j = -1; j <= 1; j += 2) 
    {
      let tile;
      let encounter = false;
      let relA = a;
      let b;

      // Executes since in bounds, zero unit encountered and not single loop
      do {
        // Calculates movement new axis value
        relA += j;
        
        // Condition to check what is the current axis
        if(i === 0) 
        {
          // Gets vertical axis fixed value
          b = axis[1];
          // Gets movement new board tile
          tile = getBoardTileByCoordinates(board, relA, b);
        }
        else 
        {
          // Gets horizontal axis fixed value
          b = axis[0];
          // Gets movement new board tile
          tile = getBoardTileByCoordinates(board, b, relA);
        }

        // Condition to check if tile exists
        if(!tile) 
        {
          continue;
        }

        // Condition to check if tile is not empty
        if(!tile.empty)
        {
          encounter = true;
        }
        
        // Gets movement board tile's unit
        let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
        // Condition to avoid movement if tile is not empty and unit is ally
        if(!tile.empty && !isTileFullAndEnemyUnit(tile, unitTile, side)) 
        {
          continue;
        }
         
        // Stores movement as legal
        tiles.push(tile);
      }
      while(tile && !encounter && !single);
    }
  }

  return tiles;
}

/**
 * Calculates all moves for the bishop unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 * @param {Boolean} single Should cycle just one time?
 */
function calcBishopAuthorizedMoves(board, units, x, y, side, single) 
{
  let tiles = [];

  // Cycle 2 times
  // -1, 1
  for(let i = -1; i <= 1; i += 2) 
  {
    // Cycle 2 times
    // -1, 1
    for(let j = -1; j <= 1; j += 2) 
    {
      let tile;
      let encounter = false;
      let relX = x;
      let relY = y;

      // Executes since in bounds, zero unit encountered and not single loop
      do {
        // Calculates movement new horizontal and vertical axis value
        relX += j;
        relY += i;

        // Gets movement new board tile
        tile = getBoardTileByCoordinates(board, relX, relY);

        // Condition to check if tile exists
        if(!tile) 
        {
          continue;
        }

        // Condition to check if tle is not empty
        if(!tile.empty)
        {
          encounter = true;
        }

        // Gets board tile's unit
        let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
        // Condition to avoid movement if tile is not empty and unit is ally
        if(!tile.empty && !isTileFullAndEnemyUnit(tile, unitTile, side)) 
        {
          continue;
        }

        // Stores movement as legal
        tiles.push(tile);
      }
      while(tile && !encounter && !single);
    }
  }

  return tiles;
}

/**
 * Calculates all moves for the queen unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 */
function calcQueenAuthorizedMoves(board, units, x, y, side) {
  // Reuses turret and bishop logics
  let axisTiles = calcTurretAuthorizedMoves(board, units, x, y, side);
  let diagonalTiles = calcBishopAuthorizedMoves(board, units, x, y, side);

  // Return all legal moves with union
  return axisTiles.concat(diagonalTiles);
}

/**
 * Calculates all moves for the king unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 * @param {SIDES} side Unit's chess board side
 */
function calcKingAuthorizedMoves(board, units, x, y, side) {
  // Reuses turret and bishop logics in a single-loop way
  let axisTiles = calcTurretAuthorizedMoves(board, units, x, y, side, true);
  let diagonalTiles = calcBishopAuthorizedMoves(board, units, x, y, side, true);

  // Calculates special movement "castling" move
  let castlingTiles = calcKingCastling(board, units, x, y);

  // Returns all legal moves with union
  return axisTiles.concat(diagonalTiles).concat(castlingTiles);
}

/**
 * Calculates special move "castling" for the king unit
 * @param {Object} board Chess board object
 * @param {Array} units Chess board units
 * @param {Number} x Unit's horizontal axis
 * @param {Number} y Unit's vertical axis
 */
function calcKingCastling(board, units, x, y) {
  let tiles = [];

  // Cycle 2 times
  // -1, 1
  for(let i = -1; i <= 1; i += 2) 
  {
    let tile;
    let encounter = false;
    let relX = x;

    let counter = 1;
    let turretTile = undefined;
    let kingTile = undefined;

    // Executes since in bounds and zero unit encountered
    do {
      // Calculates movement new horizontal axis value
      relX += i;

      // Gets movement new board tile
      tile = getBoardTileByCoordinates(board, relX, y);

      // Condition to check if movement is on next tile
      if(counter === 1)
      {
        // Stores new turret position
        turretTile = tile;
      }
      // Condition to check if movement is 2 tiles away from starting tile
      else if(counter === 2)
      {
        // Stores new king position
        kingTile = tile;
      }

      // Increase movement counter
      counter++;

      // Condition to check if tile exists or is empty
      if(!tile || tile.empty) 
      {
        continue;
      }
      // Condition to check if tile is not empty
      else if(!tile.empty)
      {
        encounter = true;
      }

      // Gets board tile's unit
      let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
      // Condition to avoid movement if unit is not turret or movement is too short and unit is turret
      if(unitTile.u !== UNITS.TURRET || counter <= 3 && unitTile.u === UNITS.TURRET)
      {
        continue;
      }

      // Condition to check if turret and king position are stored
      if(turretTile && kingTile)
      {
        let castling = {
          empty: kingTile.empty,
          x: kingTile.x,
          y: kingTile.y,
          side: {
            empty: turretTile.empty,
            x: turretTile.x,
            y: turretTile.y,
            originX: unitTile.x,
            originY: unitTile.y,
            type: 'castling'
          }
        };

        // Stores special movement as legal
        tiles.push(castling);
      }
    }
    while(tile && !encounter);
  }

  return tiles;
}

/**
 * Checks if the player's king unit is under chess
 * @param {Object} board Chess board object
 * @param {Array} foeUnits Player's foe units
 * @param {Array} allUnits Chess board units
 * @param {Object} kingUnit Player's king unit
 */
function isKingUnderChess(board, foeUnits, allUnits, kingUnit)
{
  let status = false;

  // Cycle throught all foe's units
  for(let i = 0; i < foeUnits.length; i++)
  {
    // Gets current foe's unit
    let unit = foeUnits[i];
    let moves = [];

    // Switches current unit typology to calculate specific moves
    switch(unit.u)
    {
      case UNITS.PAWN:
        moves = calcPawnAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
      case UNITS.TURRET:
        moves = calcTurretAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
      case UNITS.BISHOP:
        moves = calcBishopAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
      case UNITS.KNIGHT:
        moves = calcKnightAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
      case UNITS.QUEEN:
        moves = calcQueenAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
      case UNITS.KING:
        moves = calcKingAuthorizedMoves(board, allUnits, unit.x, unit.y, unit.s);
        break;
    }

    // Condition to check if exists a move to kill player's king
    if(moves.find(a => a.x === kingUnit.x && a.y === kingUnit.y))
    {
      // Sets status of king as under chess
      status = true;
    }
  }


  return status;
}

/**
 * Checks if tile is not empty and unit is enemy
 * @param {Object} tile Tile object
 * @param {Object} unit Unit object
 * @param {SIDES} side Unit's chess board side
 */
function isTileFullAndEnemyUnit(tile, unit, side)
{
  // Condition to check if tile is not empty
  if(!tile.empty)
  {
    // Condition to check if tile's unit is of opposite side
    if(side !== unit.s) 
    {
      return true;
    }
  }

  return false;
}

/**
 * Parses a number to respective chess board side
 * @param {Number} n Number to parse
 * @param {Boolean} isRemote Is the unit on the reflected side of the board?
 */
function parseNumberRelativeToSide(n, isRemote)
{
  // Condition to check if unit is on the reflected side of the board
  if(isRemote) 
  {
    return -n;
  }

  return n;
}

/**
 * Gets chess board's tile by axis coordinates
 * @param {Object} board Chess board object
 * @param {Number} x Horizontal axis value
 * @param {Number} y Vertical axis value
 */
function getBoardTileByCoordinates(board, x, y)
{
  return board.find(a => a.x === x && a.y === y);
}

/**
 * Gets first or last horizontal axis value
 * @param {Boolean} start Need first position?
 */
function getLastXBySide(start)
{
  return start ? 1 : 8;
}

/**
 * Gets chess board's unit by axis coordinates
 * @param {Array} units Chess board units
 * @param {Number} x Horizontal axis value
 * @param {Number} y Vertical axis value
 */
function getUnitbyCoordinates(units, x, y)
{
  return units.find(a => a.x === x && a.y === y);
}

/**
 * Clones an array of objects
 * @param {Array} array Array of objects to be cloned
 */
function cloneObjectArray(array)
{
  let clone = [];

  // Cycle throught all array's objects
  for(let i = 0; i < array.length; i++)
  {
    // Clones the object into a new array
    clone[i] = Object.assign({}, array[i]);
  }

  return clone;
}

exports.generateUnits = generateUnits;
exports.calcAllPossibleMoves = calcAllPossibleMoves;
exports.onKingUnderChess = onKingUnderChess;
exports.isKingUnderChess = isKingUnderChess;
exports.UNITS = UNITS;