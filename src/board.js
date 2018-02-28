/**
 *	Manages the data representation of the game board
 *  and provides utility functions for manipulating the
 *  representation.
 *
 *  The board has two primary representations:
 *	1) Tree
 *	2) Bit array, where each bit represents one space in a row which can be occupied (1) or unoccupied (0).
 *	   The bit array is primarily used to support undo-redo functionality.
 */

var Board = function (rows, game, gfx) {
	tps.utils.assert(rows > 0 && rows * (rows + 1) / 2 <= Board.MAX_BITS, "Invalid board size");

	this.game = game;
	this.rows = rows;
	this.rootNode = this.build(gfx);
};

Board.MAX_BITS 			= 32;
Board.PEG_RADIUS		= 35;
Board.SLOT_RADIUS 		= 50;
Board.PEG_SPACING		= 10;
Board.PEG_COLOR 		= "green";
Board.PEG_OUTLINE_COLOR	= "white";

Board.prototype.draw = function(gfx) {
	var nodesInRow = [];
	nodesInRow.push(this.rootNode);

	this.drawRow(nodesInRow, 0, gfx);
};

Board.prototype.drawRow = function(nodesInRow, row, gfx) {
	// this.drawCanvasPegs(nodesInRow, row, gfx);
};

Board.prototype.canvasDrawPegAtPoint = function(gfx, point) {
	gfx.beginPath();
	gfx.strokeStyle = Board.PEG_OUTLINE_COLOR;
	gfx.fillStyle = Board.PEG_COLOR; // DEBUG: "rgba(0, " + Math.floor(255 * row / this.rows) + ", 0, 255)";
	gfx.arc(point.x, point.y, Board.PEG_RADIUS, 0, 2.0 * Math.PI);
	gfx.fill();
	gfx.stroke();
	gfx.closePath();
};

Board.prototype.build = function(gfx) {
	var slotSprite = this.game.add.sprite(0, 0, "slot_orange");
	var pegSprite  = this.game.add.sprite(0, 0, "peg_green");

	Board.SLOT_RADUIS = slotSprite.width / 2;
	Board.PEG_RADIUS = pegSprite.width / 2;

	var rootNode = new BoardNode(slotSprite, pegSprite);
	var nodesInRow = [];

	rootNode.setParents(null, null);
	nodesInRow.push(rootNode);

	this.addRow(1, nodesInRow, this.rows, gfx);

	return rootNode;
};

Board.prototype.addRow = function(row, previousRow, rows, gfx) {
	var nodesInRow = [];

	// Position elements on the previous row.
	for (var i=0; i<previousRow.length; ++i) {
		var point = BoardNode.getScreenCoordsForPeg(row, i, previousRow.length, this.rows, gfx.canvas.width, gfx.canvas.height);

		previousRow[i].moveToScreen(point.x, point.y);
		previousRow[i].makeVisible();
	}

	// Create the elements of this new row.
	if (row < rows) {
		for(var i=0; i<row+1; ++i) {
			nodesInRow.push(new BoardNode(this.game.add.sprite(0, 0, "slot_orange"), this.game.add.sprite(0, 0, "peg_green")));
		}

		// Hook them up to the previous row.
		for (var i=0; i<nodesInRow.length; ++i) {
			if (i === 0) {
				nodesInRow[i].setParents(null, previousRow[0]);
				previousRow[i].setChildren(nodesInRow[i], nodesInRow[i + 1]);
			}
			else if (i === nodesInRow.length - 1) {
				nodesInRow[i].setParents(previousRow[previousRow.length - 1], null);
			}
			else {
				nodesInRow[i].setParents(previousRow[i - 1], previousRow[i]);
				previousRow[i].setChildren(nodesInRow[i], nodesInRow[i + 1]);
			}
		}

		this.addRow(row + 1, nodesInRow, rows, gfx);
	}
};

// Debug //////////////////////////////////////////////////////////////////////
Board.prototype.drawCanvasPegs = function(nodesInRow, row, gfx) {
	if (row < this.rows) {
		var nodesInNextRow = [];

		for (var i=0; i<nodesInRow.length; ++i) {
			var point = BoardNode.getScreenCoordsForPeg(row, i, nodesInRow.length, this.rows, gfx.canvas.width, gfx.canvas.height);
			this.canvasDrawPegAtPoint(gfx, point);

			// Add children.
			tps.utils.assert(nodesInRow[i], "Invalid nodesInRow array!");
			nodesInNextRow.push(nodesInRow[i].getLeftChild());

			if (i === nodesInRow.length - 1) {
				nodesInNextRow.push(nodesInRow[i].getRightChild());
			}
		}

		this.drawRow(nodesInNextRow, row + 1, gfx);
	}
};

// Node Structure /////////////////////////////////////////////////////////////
var BoardNode = function(spriteSlot, spritePeg) {
	this.leftChild = null;
	this.rightChild = null;
	this.leftParent = null;
	this.rightParent = null;

	this.spriteSlot = spriteSlot;
	this.spriteSlot.visible = false;
	this.spriteSlot.anchor.set(0.5, 0.5);
	this.spriteSlot.data = this;

	this.spritePeg = spritePeg;
	this.spritePeg.visible = false;
	this.spritePeg.anchor.set(0.5, 0.5);
	this.spritePeg.data = this;
};

BoardNode.prototype.moveToScreen = function(x, y) {
	this.spriteSlot.position.x = x;
	this.spriteSlot.position.y = y;

	this.spritePeg.position.x = x;
	this.spritePeg.position.y = y;
};

BoardNode.prototype.setParents = function(left ,right) {
	this.leftParent = left;
	this.rightParent = right;
};

BoardNode.prototype.setChildren = function(left, right) {
	this.leftChild = left;
	this.rightChild = right;
};

BoardNode.prototype.getLeftChild = function() {
	return this.leftChild;
};

BoardNode.prototype.getRightChild = function() {
	return this.rightChild;
};

BoardNode.prototype.makeVisible = function() {
	this.spriteSlot.visible = true;
	this.spritePeg.visible = true;
};

BoardNode.prototype.makeInvisible = function() {
	this.spriteSlot.visible = false;
	this.spritePeg.visible = false;
};

BoardNode.getScreenCoordsForPeg = function(row, peg, rowLength, rows, screenWidth, screenHeight) {
	//			*		<-- Row 0, line 0
	//					<-- Row ?, line 1
	//		  *   *		<-- Row 1, line 2
	//					<-- Row ?, line 3
	//		*   *   *	<-- Row 2, line 4
	//
	// etc...
	// There are 2 * rows - 1 "lines" on the board. Even-index lines contain the pegs. Odd-indexed lines are blank spacers.
	// And the middline line is always given my "rows - 1".

	var coords = {x:0, y:0};

	var midLine = rows - 1;
	var curLine = 2 * row;
	var curCol = 2.0 * (peg - (rowLength - 1) / 2);
	coords.x = curCol * (Board.PEG_SPACING + Board.SLOT_RADIUS) + screenWidth / 2;
	coords.y = (curLine - midLine) * (Board.PEG_SPACING + Board.SLOT_RADIUS) + screenHeight / 2;

	coords.x = Math.round(coords.x);
	coords.y = Math.round(coords.y);

	return coords;
};
