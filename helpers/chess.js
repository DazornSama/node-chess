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
  let units = player.units.concat(foe.units);

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
      moves: []
    };

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

      moves.push(tile);
    }
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

  return axisTiles.concat(diagonalTiles);
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

exports.generateUnits = generateUnits;
exports.calcAllPossibleMoves = calcAllPossibleMoves;