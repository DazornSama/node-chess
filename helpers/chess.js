'use strict';

const ROWS = 8;
const COLUMNS = 8;

const UNITS = {
  'PAWN': 1,
  'TURRET': 2,
  'BISHOP': 3,
  'KNIGHT': 4,
  'QUEEN': 5,
  'KING': 6,
};

const SIDE_LOCAL = 'l';
const SIDE_REMOTE = 'r';

function generateUnits(opponent)
{
  let y = opponent ? 8 : 1;
  let y2 = opponent ? (y - 1) : (y + 1);
  let side = opponent ? SIDE_REMOTE : SIDE_LOCAL;

  return [
    { s: side, u: 2, x: 1, y: y },
    { s: side, u: 4, x: 2, y: y },
    { s: side, u: 3, x: 3, y: y },
    { s: side, u: 5, x: 4, y: y },
    { s: side, u: 6, x: 5, y: y },
    { s: side, u: 3, x: 6, y: y },
    { s: side, u: 4, x: 7, y: y },
    { s: side, u: 2, x: 8, y: y },
    { s: side, u: 1, x: 1, y: y2 },
    { s: side, u: 1, x: 2, y: y2 },
    { s: side, u: 1, x: 3, y: y2 },
    { s: side, u: 1, x: 4, y: y2 },
    { s: side, u: 1, x: 5, y: y2 },
    { s: side, u: 1, x: 6, y: y2 },
    { s: side, u: 1, x: 7, y: y2 },
    { s: side, u: 1, x: 8, y: y2 }
  ];
}

function calcAllPossibleMoves(board, game, player)
{
  let moves = [];

  let foe = game.players.find(x => x !== player);
  let units = cloneObjectArray(player.units).concat(foe.units);

  let cheated = hasBoardBeenEdited(board, units);
  if(cheated)
  {
    player.cheated = true;
    return;
  }

  for(let i = 0; i < player.units.length; i++)
  {
    let unit = player.units[i];
    let moveData = {
      x: unit.x,
      y: unit.y,
      u: unit.u,
      moves: []
    };

    if(unit.u !== UNITS.TURRET && unit.u !== UNITS.KING)
    {
      unit.f = false;
    }
    
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

    if(moveData.moves.length > 0)
    {
      moves.push(moveData);
    }
  }

  return moves;
}

function onKingUnderChess(moves, board, game, player)
{
  let illegalMoves = [];

  let foe = game.players.find(x => x !== player);
  let units = player.units.concat(foe.units);

  let king = player.units.find(x => x.u === UNITS.KING);

  let clonedMoves = cloneObjectArray(moves);

  for(let i = 0; i < clonedMoves.length; i++)
  {
    let move = clonedMoves[i];
    let clonedMs = cloneObjectArray(move.moves);

    for(let j = (clonedMs.length - 1); j >= 0; j--)
    {
      let m = clonedMs[j];
      let clonedBoard = cloneObjectArray(board);
      let clonedUnits = cloneObjectArray(units);
      let clonedFoeUnits = cloneObjectArray(foe.units);
      let clonedKing = Object.assign({}, king);

      if(clonedKing.x === move.x && clonedKing.y === move.y)
      {
        clonedKing.x = m.x;
        clonedKing.y = m.y;
      }
      
      clonedBoard.find(a => a.x === move.x && a.y === move.y).empty = true;
      clonedBoard.find(a => a.x === m.x && a.y === m.y).empty = false;

      let unit = clonedUnits.find(a => a.x === move.x && a.y === move.y);
      unit.x = m.x;
      unit.y = m.y;

      let deadUnit = clonedFoeUnits.find(a => a.x === unit.x && a.y === unit.y);
      if(deadUnit)
      {
        let start = clonedFoeUnits.indexOf(deadUnit);
        clonedFoeUnits.splice(start, 1);
      }

      let kingUnderChess = isKingUnderChess(clonedBoard, clonedFoeUnits, clonedUnits, clonedKing);
      if(kingUnderChess)
      {
        illegalMoves.push([i, j]);
      }
    }
  }  

  for(let i = 0; i < illegalMoves.length; i++)
  {
    moves[illegalMoves[i][0]].moves.splice(illegalMoves[i][1], 1);
  }

  return isKingUnderChess(board, foe.units, units, king);
}

function hasBoardBeenEdited(board, units)
{
  let result = false;

  for(let i = 0; i < board.length; i++)
  {
    let tile = board[i];
    
    if(!tile.empty)
    {
      let unit = units.find(x => x.x === tile.x && x.y === tile.y);
      if(!unit)
      {
        result = true;
      }
    }
  }

  return result;
}

function calcPawnAuthorizedMoves(board, units, x, y, side) 
{
  let moves = [];
  let isRemote = side === SIDE_REMOTE;
  let length = calcPawnMoveLength(y, isRemote);

  for(let i = -1; i <= 1; i++) 
  {
    let relLength = i === 0 ? length : 1;
    
    let encounter = false;

    for(let j = 1; j <= relLength; j++) 
    {
      if(encounter) 
      {
        continue;
      }

      let relX = x + i;
      let relY = y + parseNumberRelativeToSide(j, isRemote);

      let tile = getBoardTileByCoordinates(board, relX, relY);
      if(!tile) 
      {
        continue;
      }

      let tileUnit = getUnitbyCoordinates(units, tile.x, tile.y);

      if(!tile.empty) 
      {
        encounter = true;
      }

      if(relX === x && !tile.empty) 
      {
        continue;
      }
      else if(relX !== x && !isTileFullAndEnemyUnit(tile, tileUnit, side)) 
      {
        continue;
      }

      tile.first = length === 2 ? true : false;
      tile.promote = isPawnAtLimit(relY, isRemote);

      moves.push(tile);
    }
  }

  for(let i = -1; i <= 1; i += 2)
  {
    let relX = x + i;
    
    let tile = getBoardTileByCoordinates(board, relX, y);
    if(!tile)
    {
      continue;
    }

    let tileUnit = getUnitbyCoordinates(units, tile.x, tile.y);
    
    if(!isTileFullAndEnemyUnit(tile, tileUnit, side))
    {
      continue;
    }
    else if(!tileUnit.f)
    {
      continue;
    }

    moves.push(tile);
  }

  return moves;
}

function calcPawnMoveLength(y, isRemote) 
{
  if(isRemote && y === 7 ||
    !isRemote && y === 2) 
  {
    return 2;
  }

  return 1;
}

function isPawnAtLimit(y, isRemote) {
  if(isRemote && y === 1 ||
    !isRemote && y === 8)
  {
    return true;
  }

  return false;
}

function calcKnightAuthorizedMoves(board, units, x, y, side) 
{
  let isRemote = side === SIDE_REMOTE;

  let yStart = y + parseNumberRelativeToSide(2);
  let yEnd = y + parseNumberRelativeToSide(-2);
  let yIncrement = yStart > yEnd ? -1 : 1;
  let yOffset = yEnd + yIncrement;

  let xStart = x - parseNumberRelativeToSide(2);
  let xEnd = x + parseNumberRelativeToSide(2);
  let xIncrement = parseNumberRelativeToSide(1);
  let nxStart = xStart ? xStart : getLastXBySide(true);
  let nxEnd = xEnd ? xEnd : getLastXBySide(false);
  let nxOffset = nxEnd + xIncrement;

  let vMoves = iterateKnightMoves(board, units, y, yStart, yOffset, yIncrement, xStart, xEnd, side, true);
  let hMoves = iterateKnightMoves(board, units, x, nxStart, nxOffset, xIncrement, yStart, yEnd, side, false);

  return vMoves.concat(hMoves);
}

function iterateKnightMoves(board, units, axis, start, end, increment, j, k, side, vertical) 
{
  let moves = [];

  for(let i = start; i !== end; i += increment) 
  {
    let offset = i - axis;
    if(offset % 2 === 0) 
    {
      continue;
    }
    
    let startTile;
    let endTile;

    if(!vertical) 
    {
      startTile = getBoardTileByCoordinates(board, i, j);
      endTile = getBoardTileByCoordinates(board, i, k);
    }
    else 
    {
      startTile = getBoardTileByCoordinates(board, j, i);
      endTile = getBoardTileByCoordinates(board, k, i);
    }

    if(startTile)
    {
      let startTileUnit = getUnitbyCoordinates(units, startTile.x, startTile.y);
      if(startTile && (startTile.empty || isTileFullAndEnemyUnit(startTile, startTileUnit, side))) 
      {
        moves.push(startTile);
      }
    }
    
    if(endTile)
    {
      let endTileUnit = getUnitbyCoordinates(units, endTile.x, endTile.y);
      if(endTile && (endTile.empty || isTileFullAndEnemyUnit(endTile, endTileUnit, side))) 
      {
        moves.push(endTile);
      }
    }
  }

  return moves;
}

function calcTurretAuthorizedMoves(board, units, x, y, side, single) 
{
  let tiles = [];
  let axis = [x, y];

  for(let i = 0; i < axis.length; i++) 
  {
    let a = axis[i];

    for(let j = -1; j <= 1; j += 2) 
    {
      let tile;
      let encounter = false;
      let relA = a;
      let b;

      do {
        relA += j;
        
        if(i === 0) 
        {
          b = axis[1];
          tile = getBoardTileByCoordinates(board, relA, b);
        }
        else 
        {
          b = axis[0];
          tile = getBoardTileByCoordinates(board, b, relA);
        }

        if(!tile) 
        {
          continue;
        }

        if(!tile.empty)
        {
          encounter = true;
        }
        
        let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
        if(!tile.empty && !isTileFullAndEnemyUnit(tile, unitTile, side)) 
        {
          continue;
        }
         
        tiles.push(tile);
      }
      while(tile && !encounter && !single);
    }
  }

  return tiles;
}

function calcBishopAuthorizedMoves(board, units, x, y, side, single) 
{
  let tiles = [];

  for(let i = -1; i <= 1; i += 2) 
  {
    for(let j = -1; j <= 1; j += 2) 
    {
      let tile;
      let encounter = false;
      let relX = x;
      let relY = y;

      do {
        relX += j;
        relY += i;

        tile = getBoardTileByCoordinates(board, relX, relY);

        if(!tile) 
        {
          continue;
        }

        if(!tile.empty)
        {
          encounter = true;
        }

        let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
        if(!tile.empty && !isTileFullAndEnemyUnit(tile, unitTile, side)) 
        {
          continue;
        }

        tiles.push(tile);
      }
      while(tile && !encounter && !single);
    }
  }

  return tiles;
}

function calcQueenAuthorizedMoves(board, units, x, y, side) {
  let axisTiles = calcTurretAuthorizedMoves(board, units, x, y, side);
  let diagonalTiles = calcBishopAuthorizedMoves(board, units, x, y, side);

  return axisTiles.concat(diagonalTiles);
}

function calcKingAuthorizedMoves(board, units, x, y, side) {
  let axisTiles = calcTurretAuthorizedMoves(board, units, x, y, side, true);
  let diagonalTiles = calcBishopAuthorizedMoves(board, units, x, y, side, true);
  let castlingTiles = calcKingCastling(board, units, x, y, side);

  return axisTiles.concat(diagonalTiles).concat(castlingTiles);
}

function calcKingCastling(board, units, x, y, side) {
  let tiles = [];

  for(let i = -1; i <= 1; i += 2) 
  {
    let tile;
    let encounter = false;
    let relX = x;

    let counter = 1;
    let turretTile = undefined;
    let kingTile = undefined;

    do {
      relX += i;

      tile = getBoardTileByCoordinates(board, relX, y);

      if(counter === 1)
      {
        turretTile = tile;
      }
      else if(counter === 2)
      {
        kingTile = tile;
      }

      counter++;

      if(!tile || tile.empty) 
      {
        continue;
      }

      if(!tile.empty)
      {
        encounter = true;
      }

      let unitTile = getUnitbyCoordinates(units, tile.x, tile.y);
      if(unitTile.u !== UNITS.TURRET || counter <= 3 && unitTile.u === UNITS.TURRET)
      {
        continue;
      }

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

        tiles.push(castling);
      }
    }
    while(tile && !encounter);
  }

  return tiles;
}

function isKingUnderChess(board, foeUnits, allUnits, kingUnit)
{
  let status = false;

  for(let i = 0; i < foeUnits.length; i++)
  {
    let unit = foeUnits[i];
    let moves = [];

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

    if(moves.find(a => a.x === kingUnit.x && a.y === kingUnit.y))
    {
      status = true;
    }
  }


  return status;
}

function isTileFullAndEnemyUnit(tile, unit, side)
{
  if(!tile.empty)
  {
    if(side !== unit.s) 
    {
      return true;
    }
  }

  return false;
}

function parseNumberRelativeToSide(n, isRemote)
{
  if(isRemote) 
  {
    return -n;
  }

  return n;
}

function getBoardTileByCoordinates(board, x, y)
{
  return board.find(a => a.x === x && a.y === y);
}

function getLastXBySide(start)
{
  return start ? 1 : 8;
}

function getUnitbyCoordinates(units, x, y)
{
  return units.find(a => a.x === x && a.y === y);
}

function cloneObjectArray(array)
{
  let clone = [];

  for(let i = 0; i < array.length; i++)
  {
    clone[i] = Object.assign({}, array[i]);
  }

  return clone;
}

exports.generateUnits = generateUnits;
exports.calcAllPossibleMoves = calcAllPossibleMoves;
exports.onKingUnderChess = onKingUnderChess;
exports.isKingUnderChess = isKingUnderChess;