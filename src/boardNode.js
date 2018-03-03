/**
 * Nodes hold the data associated with each space on the game board.
 * This includes the graphical representation of the slots, pegs, and
 * target cursors.
 */

tps.BoardNode = function(spriteSlot, spritePeg, spriteTarget, row, col, isEmpty) {
	tps.utils.assert(spriteSlot, "(BoardNode constructor) Invalid slot sprite!");
	tps.utils.assert(spritePeg, "(BoardNode constructor) Invalid peg sprite!");
	tps.utils.assert(spriteTarget, "(BoardNode constructor) Invalid target sprite!");

	this.leftChild = null;
	this.rightChild = null;
	this.leftParent = null;
	this.rightParent = null;
	this.leftSibling = null;
	this.rightSibling = null;

	this.row = row;
	this.col = col;

	this.spriteSlot = spriteSlot;
	this.initSprite(spriteSlot);

	this.spritePeg = spritePeg;
	this.initSprite(spritePeg);

	this.spriteTarget = spriteTarget;
	this.initSprite(spriteTarget);
};

tps.BoardNode.prototype.initSprite = function(sprite) {
	 sprite.visible = false;
	 sprite.anchor.set(0.5, 0.5);
	 sprite.scale.set(1.0, 1.0);
	 sprite.data = this;
	 sprite.inputEnabled = false;
};

tps.BoardNode.prototype.wasPressed = function() {
	return this.spriteSlot.inputEnabled && this.spriteSlot.input.justPressed(0, 333);
};

tps.BoardNode.prototype.isEmpty = function() {
	return !this.spritePeg || !this.spritePeg.visible;
};

tps.BoardNode.prototype.moveToScreen = function(x, y) {
	this.spriteSlot.position.x = x;
	this.spriteSlot.position.y = y;

	this.spritePeg.position.x = x;
	this.spritePeg.position.y = y;

	this.spriteTarget.position.x = x;
	this.spriteTarget.position.y = y;
};

tps.BoardNode.prototype.setParents = function(left ,right) {
	this.leftParent = left;
	this.rightParent = right;
};

tps.BoardNode.prototype.setSiblings = function(left, right) {
	this.leftSibling = left;
	this.rightSibling = right;
};

tps.BoardNode.prototype.setChildren = function(left, right) {
	this.leftChild = left;
	this.rightChild = right;
};

tps.BoardNode.prototype.getLeftParent = function() {
	return this.leftParent;
};

tps.BoardNode.prototype.getRightParent = function() {
	return this.rightParent;
};

tps.BoardNode.prototype.getLeftChild = function() {
	return this.leftChild;
};

tps.BoardNode.prototype.getRightChild = function() {
	return this.rightChild;
};

tps.BoardNode.prototype.getLeftSibling = function() {
	return this.leftSibling;
};

tps.BoardNode.prototype.getRightSibling = function() {
	return this.rightSibling;
};

tps.BoardNode.prototype.makeVisible = function() {
	this.spriteSlot.visible = true;
	this.spritePeg.visible = true;
	this.spriteTarget.visible = false;
};

tps.BoardNode.prototype.makeInvisible = function() {
	this.spriteSlot.visible = false;
	this.spritePeg.visible = false;
	this.spriteTarget.visible = false;
};

tps.BoardNode.prototype.showTarget = function() {
	this.spriteTarget.visible = true;
};

tps.BoardNode.prototype.hideTarget = function() {
	this.spriteTarget.visible = false;
};

tps.BoardNode.prototype.showSlot = function() {
	this.spriteSlot.visible = true;
};

tps.BoardNode.prototype.hideSlot = function() {
	this.spriteSlot.visible = false;
};

tps.BoardNode.prototype.setPegAlpha = function(alpha) {
	this.spritePeg.alpha = alpha;
};

tps.BoardNode.prototype.addPeg = function() {
	this.spritePeg.visible = true;
};

tps.BoardNode.prototype.removePeg = function() {
	this.spritePeg.visible = false;
};

tps.BoardNode.prototype.getPosition = function() {
	return this.spritePeg.position;
};

tps.BoardNode.prototype.getIndex = function() {
	return this.row * (this.row + 1) / 2 + this.col;
};

tps.BoardNode.prototype.getSlotSprite = function() {
	return this.spriteSlot;
};

tps.BoardNode.prototype.getPegSprite = function() {
	return this.spritePeg;
};

tps.BoardNode.prototype.getTargetSprite = function() {
	return this.spriteTarget;
};

tps.BoardNode.prototype.acceptInput = function(doAccept) {
	this.spriteSlot.inputEnabled = doAccept;
};

tps.BoardNode.prototype.scalePeg = function(scale) {
	this.spritePeg.scale.set(scale, scale);
};

tps.BoardNode.prototype.scaleTarget = function(scale) {
	this.spriteTarget.scale.set(scale, scale);
};

tps.BoardNode.getScreenCoordsForPeg = function(row, peg, rowLength, rows, screenWidth, screenHeight) {
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
