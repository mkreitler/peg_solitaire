/**
 *	Manages the data representation of the game board
 *  and provides utility functions for manipulating the
 *  representation.
 *
 *  The board has two primary representations:
 *	1) Tree
 *	2) Bit array, where each bit represents one space in a row which can be occupied (1) or unoccupied (0).
 *	   The bit array is primarily used to support undo-redo functionality.
 *
 *			*		<-- Row 0, line 0
 *					<-- Row ?, line 1
 *		  *   *		<-- Row 1, line 2
 *					<-- Row ?, line 3
 *		*   *   *	<-- Row 2, line 4
 *
 * etc...
 * There are 2 * rows - 1 "lines" on the board. Even-index lines contain the pegs. Odd-indexed lines are blank spacers.
 * And the middline line is always given my "rows - 1".
 *
 */

// Construction ---------------------------------------------------------------
var Board = function (rows, game, gfx, emptyRow, emptyCol) {
	tps.utils.assert(rows > 0 && rows * (rows + 1) / 2 <= Board.MAX_BITS, "Invalid board size");

	this.nodes = [];
	this.game = game;
	this.rows = rows;
	this.width = 0;
	this.height = 0;
	this.moveStack = new tps.utils.Stack();
	this.bestStack = new tps.utils.Stack();
	this.undoStack = new tps.utils.Stack();
	this.redoStack = new tps.utils.Stack();

	this.solutionStartTime = 0;
	this.wantsSolution = false;
	this.solverStack = new tps.utils.Stack();
	this.onSolvedCallback = null;

	this.replayStack 	= new tps.utils.Stack();
	this.DEBUG_allMoves	= new tps.utils.Stack();

	this.rootNode = this.build(emptyRow, emptyCol, gfx);
};

Board.MAX_BITS 					= 32;
Board.PEG_RADIUS				= 35;
Board.SLOT_RADIUS 				= 50;
Board.PEG_SPACING				= 10;
Board.SOLVE_TIME_PER_FRAME_MS	= 17;

Board.DEBUG_PEG_COLOR 			= "green";
Board.DEBUG_PEG_OUTLINE_COLOR	= "white";

// Playing --------------------------------------------------------------------
Board.prototype.addPeg = function(row, col) {
	var node = this.nodeAt(row, col);
	tps.utils.assert(node, "(addPeg) Invalid node!");

	node.addPeg();
};

Board.prototype.removePeg = function(row, col) {
	var node = this.nodeAt(row, col);
	tps.utils.assert(node, "(removePeg) Invalid node!");

	node.removePeg();
};

Board.prototype.nodeAt = function(row, col) {
	// Compute index into nodeList by using the geometry of the triangular
	// layout: the number of nodes in the first 'n' rows is n * (n + 1) / 2.
	var index = row * (row + 1) / 2 + col;

	tps.utils.assert(index >= 0 || index < this.nodes.length, "(nodeAt) Invalid node index!");

	return this.nodes[index];	
};

// Solving --------------------------------------------------------------------
Board.prototype.update = function() {
	if (this.wantsSolution) {
		this.solutionStartTime = Date.now();
		this.updateSolution();
	}
};

Board.prototype.startBestPlayback = function() {
	if (this.bestStack.size() > 0) {
		this.replayStack.copy(this.bestStack);
		this.deserialize(this.replayStack.peekBottom());
	}
};

Board.prototype.stepBestPlayback = function() {
	if (this.replayStack.shift()) {
		this.deserialize(this.replayStack.peekBottom());
	}
};

Board.prototype.solve = function(onSolvedCallback) {
	this.wantsSolution = true;
	this.onSolvedCallback = onSolvedCallback;

	this.moveStack.clear();
	this.bestStack.clear();
	this.solverStack.clear();
	this.DEBUG_allMoves.clear();

	this.moveStack.push(this.serialize());
	this.DEBUG_allMoves.push(this.moveStack.peek());
	this.addSolutionTracker();

	this.bringSlotsToFront();
};

Board.prototype.addSolutionTracker = function() {
	this.solverStack.push({iNode: 0, moves: [], iMove: 0, currentBoard: this.serialize(), failed: true, wantsUndo: false});
};

Board.prototype.updateSolution = function() {
	// "st" = "solution tracker".
	var recurse = false;

	// Continue on from the last node.
	while (this.solverStack.size() > 0 && Date.now() - this.solutionStartTime < Board.SOLVE_TIME_PER_FRAME_MS) {
		var st = this.solverStack.peek();
		recurse = false;

		for (/* no init */; !recurse && st.iNode<this.nodes.length; ++st.iNode) {
			if (!this.nodes[st.iNode].isEmpty()) {

				st.moves = this.findMovesForNode(st.iNode);
				if (st.moves) {

					var currentBoard = this.serialize();
					st.currentBoard = currentBoard;
					for (/* no init*/; st.iMove<st.moves.length; ++st.iMove) {
						if (!this.applyMove(st.moves[st.iMove])) {
							// Didn't solve it.
							this.addSolutionTracker();
							st.wantsUndo = true;
							recurse = true;
							break;
						}

						this.moveStack.pop();
						this.deserialize(currentBoard);
						this.DEBUG_allMoves.push(currentBoard);
					}
				}
				else {
					// No moves remaining for this node.
				}
			}
		}

		if (!recurse) {
			// If we're here and we didn't recurse, that means we have completed
			// processing nodes for this recursive level. We can pop the stack,
			// return the board to the previous configuration, and pick up the
			// analysis at that level.
			this.solverStack.pop();
			st = this.solverStack.peek();

			if (st) {
				this.deserialize(st.currentBoard);

				if (st.wantsUndo) {
					this.moveStack.pop();
					this.DEBUG_allMoves.push(st.currentBoard);
					++st.iMove;

					if (st.iMove === st.moves.length) {
						st.iNode += 1;
						st.iMove = 0;
					}

					st.wantsUndo = false;
				}
			}
			else {
				this.wantsSolution = false;

				if (this.bestStack.size() === 0) {
					console.log("No solution found!");
				}
				else {
					console.log("Best solution: " + (this.bestStack.size() - 1) + " moves.");
					this.startBestPlayback();
					if (this.onSolvedCallback) {
						this.onSolvedCallback();
					}
				}

				this.bringPegsToFront();
			}
		}
	}	
};

Board.prototype.applyMove = function(move) {
	var solved = false;

	move.src.removePeg();
	move.jump.removePeg();
	move.dest.addPeg();

	var newBoard = this.serialize();
	this.moveStack.push(newBoard);

	this.DEBUG_allMoves.push(newBoard);

	solved = this.playerHasWon();

	if (solved && (this.bestStack.size() === 0 || this.moveStack.size() < this.bestStack.size())) {
		this.bestStack.copy(this.moveStack);
	}

	return solved;
};

Board.prototype.playerHasWon = function() {
	// Bit of math: if exactly one peg remains on the board,
	// the bit representation of the board will be an integer
	// power of two.

	var bitArray = this.serialize();
	var powerOfTwo = Math.log(bitArray) / Math.log(2.0);

	return  powerOfTwo === Math.floor(powerOfTwo);
};

Board.prototype.findMovesForNode = function(nodeIndex) {
	var node = this.nodes[nodeIndex];
	var moves = [];

	// Move up.
	var leftParent = node.getLeftParent();
	var rightParent = node.getRightParent();

	if (leftParent && !leftParent.isEmpty()) {
		var leftGrandparent = leftParent.getLeftParent();
		if (leftGrandparent && leftGrandparent.isEmpty()) {
			moves.push({src: node, dest: leftGrandparent, jump: leftParent});
		}
	}

	if (rightParent && !rightParent.isEmpty()) {
		var rightGrandparent = rightParent.getRightParent();
		if (rightGrandparent && rightGrandparent.isEmpty()) {
			moves.push({src: node, dest: rightGrandparent, jump: rightParent});
		}
	}

	// Move across.
	var leftSibling = node.getLeftSibling();
	var rightSibling = node.getRightSibling();

	if (leftSibling && !leftSibling.isEmpty()) {
		var leftGrandsibling = leftSibling.getLeftSibling();
		if (leftGrandsibling && leftGrandsibling.isEmpty()) {
			moves.push({src: node, dest: leftGrandsibling, jump: leftSibling});
		}
	}

	if (rightSibling && !rightSibling.isEmpty()) {
		var rightGrandsibling = rightSibling.getRightSibling();
		if (rightGrandsibling && rightGrandsibling.isEmpty()) {
			moves.push({src: node, dest: rightGrandsibling, jump: rightSibling});
		}
	}

	// Move down.
	var leftChild = node.getLeftChild();
	var rightChild = node.getRightChild();

	if (leftChild && !leftChild.isEmpty()) {
		var leftGrandchild = leftChild.getLeftChild();
		if (leftGrandchild && leftGrandchild.isEmpty()) {
			moves.push({src: node, dest: leftGrandchild, jump: leftChild});
		}
	}

	if (rightChild && !rightChild.isEmpty()) {
		var rightGrandchild = rightChild.getRightChild();
		if (rightGrandchild && rightGrandchild.isEmpty()) {
			moves.push({src: node, dest: rightGrandchild, jump: rightChild});
		}
	}


	return moves.length ? moves : null;
};

// Serializing ----------------------------------------------------------------
Board.prototype.serialize = function() {
	var bitArray = 0;

	for (var i=0; i<this.nodes.length; ++i) {
		if (!this.nodes[i].isEmpty()) {
			bitArray += 1 << i;
		}
	}

	return bitArray;
};

Board.prototype.deserialize = function(bitArray) {
	for (var i=0; i<this.nodes.length; ++i) {
		if (bitArray & (1 << i)) {
			this.nodes[i].addPeg();
		}
		else {
			this.nodes[i].removePeg();
		}
	}
};

// Rendering ------------------------------------------------------------------
Board.prototype.draw = function(gfx, emptyRow, emptyCol) {
	var nodesInRow = [];
	nodesInRow.push(this.rootNode);

	this.drawRow(nodesInRow, 0, gfx);
};

Board.prototype.drawRow = function(nodesInRow, row, gfx) {
	// this.DEBUG_drawCanvasPegs(nodesInRow, row, gfx);
};

Board.prototype.bringSlotsToFront = function() {
	for (var i=0; i<this.nodes.length; ++i) {
		this.game.world.bringToTop(this.nodes[i].getSlotSprite());
	}
};

Board.prototype.bringPegsToFront = function() {
	for (var i=0; i<this.nodes.length; ++i) {
		this.game.world.bringToTop(this.nodes[i].getPegSprite());
	}
};

Board.prototype.canvasDrawPegAtPoint = function(gfx, point) {
	gfx.beginPath();
	gfx.strokeStyle = Board.DEBUG_PEG_OUTLINE_COLOR;
	gfx.fillStyle =  Board.DEBUG_PEG_COLOR; // DEBUG: "rgba(0, " + Math.floor(255 * row / this.rows) + ", 0, 255)";
	gfx.arc(point.x, point.y, Board.PEG_RADIUS, 0, 2.0 * Math.PI);
	gfx.fill();
	gfx.stroke();
	gfx.closePath();
};

// Building -------------------------------------------------------------------
Board.prototype.build = function(emptyRow, emptyCol, gfx) {
	var slotSprite = this.game.add.sprite(0, 0, "slot_orange");
	var pegSprite  = this.game.add.sprite(0, 0, "peg_green");

	Board.SLOT_RADUIS = slotSprite.width / 2;
	Board.PEG_RADIUS = pegSprite.width / 2;

	var row = 0;
	var col = 0;
	var rootNode = new BoardNode(slotSprite, pegSprite, 0, 0, row === emptyRow && col === emptyCol);
	var nodesInRow = [];

	rootNode.setParents(null, null);
	nodesInRow.push(rootNode);

	this.addRow(1, nodesInRow, this.rows, gfx, emptyRow, emptyCol);

	this.height = Math.floor(this.rows * (slotSprite.height + Board.PEG_SPACING));
	this.width = Math.floor(this.height);

	return rootNode;
};

Board.prototype.addRow = function(row, previousRow, rows, gfx, emptyRow, emptyCol) {
	var nodesInRow = [];

	// Position elements on the previous row.
	for (var i=0; i<previousRow.length; ++i) {
		var point = BoardNode.getScreenCoordsForPeg(row - 1, i, previousRow.length, this.rows, gfx.canvas.width, gfx.canvas.height);

		previousRow[i].moveToScreen(point.x, point.y);

		// While we are at it, build a flat list of nodes for ease of access.
		this.nodes.push(previousRow[i]);
	}

	// Create the elements of this new row.
	if (row < rows) {
		for(var i=0; i<row+1; ++i) {
			var slotSprite = this.game.add.sprite(0, 0, "slot_orange"); 
			var pegSprite = this.game.add.sprite(0, 0, "peg_green")
			nodesInRow.push(new BoardNode(slotSprite, pegSprite, row, i, row === emptyRow && i === emptyCol));
		}

		// Hook them up.
		for (var i=0; i<nodesInRow.length; ++i) {
			if (i === 0) {
				nodesInRow[i].setParents(null, previousRow[0]);
				previousRow[i].setChildren(nodesInRow[i], nodesInRow[i + 1]);
				nodesInRow[i].setSiblings(null, nodesInRow[i + 1]);
			}
			else if (i === nodesInRow.length - 1) {
				nodesInRow[i].setParents(previousRow[previousRow.length - 1], null);
				nodesInRow[i].setSiblings(nodesInRow[i - 1], null);
			}
			else {
				nodesInRow[i].setParents(previousRow[i - 1], previousRow[i]);
				previousRow[i].setChildren(nodesInRow[i], nodesInRow[i + 1]);
				nodesInRow[i].setSiblings(nodesInRow[i - 1], nodesInRow[i + 1]);
			}
		}

		this.addRow(row + 1, nodesInRow, rows, gfx);
	}
};

// Debug //////////////////////////////////////////////////////////////////////
Board.prototype.DEBUG_startPlayback = function() {
	if (this.DEBUG_allMoves.size() > 0) {
		this.deserialize(this.DEBUG_allMoves.peekBottom());
	}
};

Board.prototype.DEBUG_stepPlayback = function() {
	if (this.DEBUG_allMoves.shift()) {
		this.deserialize(this.DEBUG_allMoves.peekBottom());
	}
};

Board.prototype.DEBUG_drawCanvasPegs = function(nodesInRow, row, gfx) {
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
var BoardNode = function(spriteSlot, spritePeg, row, col, isEmpty) {
	this.leftChild = null;
	this.rightChild = null;
	this.leftParent = null;
	this.rightParent = null;
	this.leftSibling = null;
	this.rightSibling = null;

	this.row = row;
	this.col = col;

	this.spriteSlot = spriteSlot;
	this.spriteSlot.visible = true;
	this.spriteSlot.anchor.set(0.5, 0.5);
	this.spriteSlot.data = this;

	this.spritePeg = spritePeg;
	this.spritePeg.visible = !isEmpty;
	this.spritePeg.anchor.set(0.5, 0.5);
	this.spritePeg.data = this;
};

BoardNode.prototype.isEmpty = function() {
	return !this.spritePeg || !this.spritePeg.visible;
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

BoardNode.prototype.setSiblings = function(left, right) {
	this.leftSibling = left;
	this.rightSibling = right;
};

BoardNode.prototype.setChildren = function(left, right) {
	this.leftChild = left;
	this.rightChild = right;
};

BoardNode.prototype.getLeftParent = function() {
	return this.leftParent;
};

BoardNode.prototype.getRightParent = function() {
	return this.rightParent;
};

BoardNode.prototype.getLeftChild = function() {
	return this.leftChild;
};

BoardNode.prototype.getRightChild = function() {
	return this.rightChild;
};

BoardNode.prototype.getLeftSibling = function() {
	return this.leftSibling;
};

BoardNode.prototype.getRightSibling = function() {
	return this.rightSibling;
};

BoardNode.prototype.makeVisible = function() {
	this.spriteSlot.visible = true;
	this.spritePeg.visible = true;
};

BoardNode.prototype.makeInvisible = function() {
	this.spriteSlot.visible = false;
	this.spritePeg.visible = false;
};

BoardNode.prototype.addPeg = function() {
	this.spritePeg.visible = true;
};

BoardNode.prototype.removePeg = function() {
	this.spritePeg.visible = false;
};

BoardNode.prototype.getSlotSprite = function() {
	return this.spriteSlot;
};

BoardNode.prototype.getPegSprite = function() {
	return this.spritePeg;
};

BoardNode.getScreenCoordsForPeg = function(row, peg, rowLength, rows, screenWidth, screenHeight) {
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
