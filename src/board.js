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
	this.boardGroup = this.game.add.group();
	this.moveStack = new tps.utils.Stack();
	this.bestStack = new tps.utils.Stack();
	this.undoStack = new tps.utils.Stack();
	this.redoStack = new tps.utils.Stack();

	this.createPoolObjects();

	this.selectTimer = 0;
	this.selectedNode = null;
	this.selectedMoves = null;

	this.solutionStartTime = 0;
	this.wantsSolution = false;
	this.solverStack = new tps.utils.Stack();
	this.onSolvedCallback = null;

	this.playingParticles = [];

	this.replayStack 	= new tps.utils.Stack();
	this.DEBUG_allMoves	= new tps.utils.Stack();

	this.rootNode = this.build(emptyRow, emptyCol, gfx);

	tps.switchboard.listenFor("pegParticleStart", this);
	tps.switchboard.listenFor("pegParticleStop", this);
};

Board.MAX_BITS 							= 32;
Board.PEG_RADIUS						= 35;
Board.SLOT_RADIUS 						= 50;
Board.PEG_SPACING						= 10;
Board.SOLVE_TIME_PER_FRAME_MS			= 17;
Board.MIN_PEG_SCALE 					= 0.95;
Board.MAX_PEG_SCALE 					= 1.05;
Board.PEG_SCALE_PERIOD 					= 1.0;
Board.DEFAULT_NUM_MOVE_TRACKERS			= 100;
Board.DEFAULT_NUM_SOLUTION_TRACKERS 	= 25;
Board.DEFAULT_NUM_PEG_PARTICLES 		= 5;
Board.DEFAULT_NUM_PP_SPRITES			= 3;
Board.PP_LIFETIME 						= 0.5;
Board.PP_MIN_SCALE 						= 0.25;
Board.PP_MAX_SCALE 						= 3.0;
Board.PP_EMIT_TIME 						= 0.02;

Board.DEBUG_PEG_COLOR 			= "green";
Board.DEBUG_PEG_OUTLINE_COLOR	= "white";

// Playing --------------------------------------------------------------------
Board.prototype.turnOffAllNodes = function() {
	for (var i=0; i<this.nodes.length; ++i) {
		this.nodes[i].acceptInput(false);
	}
};

Board.prototype.enableLivePegs = function() {
	for (var i=0; i<this.nodes.length; ++i) {
		this.nodes[i].acceptInput(!this.nodes[i].isEmpty());
	}
};

Board.prototype.enableLiveTargetSlots = function() {
	tps.utils.assert(this.selectedMoves, "(enableLiveTargetSlots) Invalid move selection!");

	for (var i=0; i<this.selectedMoves.length; ++i) {
		this.selectedMoves[i].dest.acceptInput(true);
	}
};

Board.prototype.abortCurrentMove = function() {
	if (this.selectedMoves) {
		for (var i=0; i<this.selectedMoves.length; ++i) {
			this.selectedMoves[i].dest.hideTarget();

			this.selectedMoves[i].src.scalePeg(1.0);
			this.selectedMoves[i].src.scaleTarget(1.0);
			this.selectedMoves[i].dest.scalePeg(1.0);
			this.selectedMoves[i].dest.scaleTarget(1.0);
		}
	}

	this.clearMove();
	tps.switchboard.broadcast("moveAborted");
};

Board.prototype.completeMove = function(move) {
	this.movePeg(move);
	tps.switchboard.broadcast("moveCompleted");

	if (this.playerHasWon()) {
		tps.switchboard.broadcast("playerWon");
	}
	else if (this.playerHasLost()) {
		tps.switchboard.broadcast("playerLost");
	}
};

Board.prototype.checkForMoveCompletion = function() {
	tps.utils.assert(this.selectedNode, "(checkForMoveCompletion) No selected node!");
	tps.utils.assert(this.selectedMoves && this.selectedMoves.length > 1, "(checkForMoveCOmpletion) Not enough moves!");

	for (var i=0; i<this.nodes.length; ++i) {
		if (this.nodes[i].wasPressed()) {
			if (!this.nodes[i].isEmpty() && this.nodes[i] !== this.selectedNode) {
				// Player clicked on a peg other than the original one.
				this.abortCurrentMove();
			}
			else {
				for (var j=0; j<this.selectedMoves.length; ++j) {
					if (this.nodes[i] === this.selectedMoves[j].dest) {
						this.completeMove(this.selectedMoves[j]);
						break;
					}
				}
			}

			break;
		}
	}
};

Board.prototype.checkForPlayerMove = function() {
	tps.utils.assert(!this.selectedMoves, "(checkForPlayerMove) SelectedMoves is not null!");

	this.selectedNode = null;

	for (var i=0; i<this.nodes.length; ++i) {
		if (this.nodes[i].wasPressed()) {
			this.selectedMoves = this.findMovesForNode(this.nodes[i].getIndex());

			if (this.selectedMoves && this.selectedMoves.length > 0) {
				if (this.selectedMoves.length === 1) {
					// Only one possible move, so make it.
					this.selectedNode = this.nodes[i];
					this.completeMove(this.selectedMoves[0]);
				}
				else {
					this.selectedNode = this.nodes[i];
					this.selectTimer = 0;

					// Turn on target cursors.
					for (var j=0; j<this.selectedMoves.length; ++j) {
						this.selectedMoves[j].dest.showTarget();
					}

					tps.switchboard.broadcast("moveStarted");
				}
			}

			break;
		}
	}

	return this.selectedNode !== null;
};

Board.prototype.clearMove = function() {
	this.releaseMoves(this.selectedMoves);
	this.selectedNode = null;
	this.selectedMoves = null;
};

Board.prototype.movePeg = function(move) {
	tps.utils.assert(move, "(movePeg) Invalid move!");

	this.applyMove(move);

	// TODO: play a sound and particle effect.

	this.selectedNode.scalePeg(1.0);

	for (var i=0; i<this.selectedMoves.length; ++i) {
		this.selectedMoves[i].dest.scaleTarget(1.0);
		this.selectedMoves[i].dest.hideTarget();
	}

	this.clearMove();

	// TODO: check for victory.
};

Board.prototype.releaseMoves = function(moveList) {
	tps.objectPool.release("moveTracker", moveList);
};

Board.prototype.canSelectedPieceJump = function() {
	var canJump = false;
	tps.utils.assert(this.selectedNode, "(canSelectedPieceJump) No piece selected!");

	var moves = this.findMovesForNode(this.selectedNode.getIndex());
	canJump = moves && moves.length > 0;

	return canJump;
};

Board.prototype.pulseSelection = function() {
	tps.utils.assert(this.selectedNode, "(pulseSelection) Invalid node!");
	tps.utils.assert(this.selectedMoves && this.selectedMoves.length > 1, "(pulseSelection) Invalid move list!");

	this.selectTimer += this.game.time.elapsedMS * 0.001;

	var variation = Math.sin(this.selectTimer * 2.0 * Math.PI / Board.PEG_SCALE_PERIOD);
	var amplitude = (Board.MAX_PEG_SCALE - Board.MIN_PEG_SCALE);
	var scale = Board.MIN_PEG_SCALE + amplitude * variation;
	this.selectedNode.scalePeg(scale);

	variation = Math.sin(-this.selectTimer * 2.0 * Math.PI / Board.PEG_SCALE_PERIOD);
	scale = Board.MIN_PEG_SCALE + amplitude * variation;
	for (var i=0; i<this.selectedMoves.length; ++i) {
		this.selectedMoves[i].dest.scaleTarget(scale);
	}
};

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

Board.prototype.acceptInput = function(doAccept) {
	for (var i=0; i<this.nodes.length; ++i) {
		this.nodes[i].acceptInput(doAccept);
	}
};

Board.prototype.reset = function() {
	this.clearStacks();
	this.deserialize(Math.pow(2, this.rows * (this.rows + 1) / 2) - 2);
	tps.objectPool.releaseAll("moveTracker");
	tps.objectPool.releaseAll("solutionTracker");
};

Board.prototype.clearStacks = function() {
	this.moveStack.clear();
	this.bestStack.clear();
	this.solverStack.clear();
	this.DEBUG_allMoves.clear();
};

Board.prototype.pegParticleStart = function(particle) {
	this.playingParticles.push(particle);
};

Board.prototype.pegParticleStop = function(particle) {
	tps.objectPool.release("pegParticle", particle);
	tps.utils.removeElementFromArray(particle, this.playingParticles);
};

Board.prototype.anyParticlesPlaying = function() {
	return this.playingParticles.length > 0;
};

// Solving --------------------------------------------------------------------
Board.prototype.createPoolObjects = function() {
	tps.objectPool.register("moveTracker", tps.Move, Board.DEFAULT_NUM_MOVE_TRACKERS);
	tps.objectPool.register("solutionTracker", tps.SolutionTracker, Board.DEFAULT_NUM_SOLUTION_TRACKERS);
	tps.objectPool.register("pegParticle", tps.PegParticle, Board.DEFAULT_NUM_PEG_PARTICLES);

	var pegParticles = tps.objectPool.count("pegParticle");
	for (var i=0; i<pegParticles; ++i) {
		var sprites = [];
		for (var j=0; j<Board.DEFAULT_NUM_PP_SPRITES; ++j) {
			sprites.push(this.addSprite("peg_particle"));
		}

		var particle = tps.objectPool.request("pegParticle");
		tps.utils.assert(particle, "(createPoolObjects) Not enough peg particles!");
		particle.init(this.game, Board.PP_LIFETIME, Board.PP_MIN_SCALE, Board.PP_MAX_SCALE, Board.PP_EMIT_TIME, sprites);
	}
	tps.objectPool.releaseAll("pegParticle");
};

Board.prototype.gameUpdate = function() {
	if (this.wantsSolution) {
		this.solutionStartTime = Date.now();
		this.updateSolution();
	}

	tps.objectPool.callOnUsed("pegParticle", "update");
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

	this.clearStacks();

	this.moveStack.push(this.serialize());
	this.DEBUG_allMoves.push(this.moveStack.peek());
	this.addSolutionTracker();

	this.bringSlotsToFront();
};

Board.prototype.addSolutionTracker = function() {
	var st = tps.objectPool.request("solutionTracker");
	tps.utils.assert(st, "(addSolutionTracker) SolutionTracker request failed!");

	st.currentBoard = this.serialize();
	this.solverStack.push(st);
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

					tps.objectPool.release("moveTracker", st.moves);
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
			st = this.solverStack.pop();
			tps.objectPool.release("moveTracker", st.moves);
			tps.objectPool.release("solutionTracker", st);

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
						tps.objectPool.release("moveTracker", st.moves);
					}

					st.wantsUndo = false;
				}
			}
			else {
				this.wantsSolution = false;
				this.solverStack.clear();

				tps.objectPool.releaseAll("moveTracker");
				tps.objectPool.releaseAll("solutionTracker");

				if (this.bestStack.size() === 0) {
					console.log("No solution found!");
				}
				else {
					console.log("Best solution: " + (this.bestStack.size() - 1) + " moves.");
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

	var pegParticle = tps.objectPool.request("pegParticle");
	tps.utils.assert(pegParticle, "(applylMove) Invalid pegParticle!");
	var position = move.jump.getPosition();
	pegParticle.play(position.x, position.y);

	var newBoard = this.serialize();
	this.moveStack.push(newBoard);

	this.DEBUG_allMoves.push(newBoard);

	solved = this.playerHasWon();

	if (solved && (this.bestStack.size() === 0 || this.moveStack.size() < this.bestStack.size())) {
		this.bestStack.copy(this.moveStack);
	}

	return solved;
};

Board.prototype.playerHasLost = function() {
	var playerLost = true;

	for (var i=0; i<this.nodes.length; ++i) {
		if (!this.nodes[i].isEmpty()) {
			var moves = this.findMovesForNode(this.nodes[i].getIndex());

			if (moves) {
				tps.objectPool.release("moveTracker", moves);
				playerLost = false;
				break;
			}
		}
	}

	return playerLost;
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
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, leftGrandparent, leftParent);
			moves.push(move);
		}
	}

	if (rightParent && !rightParent.isEmpty()) {
		var rightGrandparent = rightParent.getRightParent();
		if (rightGrandparent && rightGrandparent.isEmpty()) {
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, rightGrandparent, rightParent);
			moves.push(move);
		}
	}

	// Move across.
	var leftSibling = node.getLeftSibling();
	var rightSibling = node.getRightSibling();

	if (leftSibling && !leftSibling.isEmpty()) {
		var leftGrandsibling = leftSibling.getLeftSibling();
		if (leftGrandsibling && leftGrandsibling.isEmpty()) {
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, leftGrandsibling, leftSibling);
			moves.push(move);
		}
	}

	if (rightSibling && !rightSibling.isEmpty()) {
		var rightGrandsibling = rightSibling.getRightSibling();
		if (rightGrandsibling && rightGrandsibling.isEmpty()) {
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, rightGrandsibling, rightSibling);
			moves.push(move);
		}
	}

	// Move down.
	var leftChild = node.getLeftChild();
	var rightChild = node.getRightChild();

	if (leftChild && !leftChild.isEmpty()) {
		var leftGrandchild = leftChild.getLeftChild();
		if (leftGrandchild && leftGrandchild.isEmpty()) {
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, leftGrandchild, leftChild);
			moves.push(move);
		}
	}

	if (rightChild && !rightChild.isEmpty()) {
		var rightGrandchild = rightChild.getRightChild();
		if (rightGrandchild && rightGrandchild.isEmpty()) {
			var move = tps.objectPool.request("moveTracker");
			tps.utils.assert(move, "(findMovesForNode) Move request failed!");
			move.set(node, rightGrandchild, rightChild);
			moves.push(move);
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
		this.boardGroup.bringToTop(this.nodes[i].getSlotSprite());
	}
};

Board.prototype.bringPegsToFront = function() {
	for (var i=0; i<this.nodes.length; ++i) {
		this.boardGroup.bringToTop(this.nodes[i].getPegSprite());
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
	var slotSprite = this.addSprite("slot_orange");
	var pegSprite  = this.addSprite("peg_green");
	var targetSprite = this.addSprite("target_ring");

	Board.SLOT_RADUIS = slotSprite.width / 2;
	Board.PEG_RADIUS = pegSprite.width / 2;

	var row = 0;
	var col = 0;
	var rootNode = new tps.BoardNode(slotSprite, pegSprite, targetSprite, 0, 0, row === emptyRow && col === emptyCol);
	var nodesInRow = [];

	rootNode.setParents(null, null);
	nodesInRow.push(rootNode);

	this.addRow(1, nodesInRow, this.rows, gfx, emptyRow, emptyCol);

	this.height = Math.floor(this.rows * (slotSprite.height + Board.PEG_SPACING));
	this.width = Math.floor(this.height);

	return rootNode;
};

Board.prototype.addSprite = function(imageName) {
	var sprite = this.game.add.sprite(0, 0, imageName);
	this.boardGroup.add(sprite);

	return sprite;
};

Board.prototype.addRow = function(row, previousRow, rows, gfx, emptyRow, emptyCol) {
	var nodesInRow = [];

	// Position elements on the previous row.
	for (var i=0; i<previousRow.length; ++i) {
		var point = tps.BoardNode.getScreenCoordsForPeg(row - 1, i, previousRow.length, this.rows, gfx.canvas.width, gfx.canvas.height);

		previousRow[i].moveToScreen(point.x, point.y);
		previousRow[i].showSlot();

		// While we are at it, build a flat list of nodes for ease of access.
		this.nodes.push(previousRow[i]);
	}

	// Create the elements of this new row.
	if (row < rows) {
		for(var i=0; i<row+1; ++i) {
			var slotSprite = this.addSprite("slot_orange");
			var pegSprite = this.addSprite("peg_green")
			var targetSprite = this.addSprite("target_ring")

			nodesInRow.push(new tps.BoardNode(slotSprite, pegSprite, targetSprite, row, i, row === emptyRow && i === emptyCol));
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

// Debug ----------------------------------------------------------------------
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
			var point = tps.BoardNode.getScreenCoordsForPeg(row, i, nodesInRow.length, this.rows, gfx.canvas.width, gfx.canvas.height);
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
