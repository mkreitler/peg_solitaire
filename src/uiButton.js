/**
 *	UI element: click or toggle button.
 */

tps.Button = function(game, type, spriteButton, spriteIcon, downMessage, upMessage, tooltip) {
	tps.utils.assert(game, "(Button.constructor) Invalid game object!");
	tps.utils.assert(type !== "undefined" && (type === tps.Button.Style.CLICK || type === tps.Button.Style.TOGGLE), "(Button.constructor) Invalid button type!");
	tps.utils.assert(spriteButton, "(Button.constructor) Invalid button sprite!");
	tps.utils.assert(spriteIcon, "(Button.constructor) Invalid icon sprite!");

	this.type = type;
	this.spriteButton = spriteButton;
	this.spriteIcon = spriteIcon;
	this.downMessage = downMessage;
	this.upMessage = upMessage;
	this.tooltip = tooltip;

	this.spriteButton.visible = true;
	this.spriteIcon.visible = true;
	this.spriteButton.frame = 0;
	this.spriteIcon.frame = 0;
	this.spriteButton.anchor.set(0.5, 0.5);
	this.spriteIcon.anchor.set(0.5, 0.5);

	this.group = game.add.group();
	this.group.add(this.spriteButton);
	this.group.add(this.spriteIcon);

	switch (this.type) {
		case tps.Button.Style.CLICK:
			this.updateState = this.clickStateReleased;
		break

		case tps.Button.Style.TOGGLE:
			this.updateState = this.toggleStateUp;
		break;

		default:
			this.updateState = null;
		break;
	}

	this.spriteButton.inputEnabled = true;
};

tps.Button.Style 		= {CLICK: 0, TOGGLE: 1};
tps.Button.IconStyle 	= {LIT: 0, NORMAL: 1, DARK: 2};

tps.Button.prototype.getData = function(iconData) {
	return !iconData ? this.spriteButton.data : this.spriteIcon.data;
};

tps.Button.prototype.setData = function(data, iconData) {
	if (iconData) {
		this.spriteIcon.data = data;
	}
	else {
		this.spriteButton.data = data;
	}
};

tps.Button.prototype.getWidth = function() {
	return this.spriteButton.width;
};

tps.Button.prototype.getHeight = function() {
	return this.spriteButton.height;
};

tps.Button.prototype.getGroup = function() {
	return this.group;
};

tps.Button.prototype.moveTo = function(x, y) {
	x = Math.round(x);
	y = Math.round(y);

	console.log("Moving to: (" + x + ", " + y + ")");
	this.group.position.set(x, y);
};

tps.Button.prototype.update = function() {
	if (this.spriteButton.input.pointerOver(0)) {
		this.spriteIcon.frame = tps.Button.IconStyle.LIT;
	}
	else if (this.updateState === this.clickStatePressed || this.updateState === this.toggleStateDown) {
		this.spriteIcon.frame = tps.Button.IconStyle.DARK;
	}
	else {
		this.spriteIcon.frame = tps.Button.IconStyle.NORMAL;
	}

	if (this.updateState) {
		this.updateState();
	}
};

// Click button states --------------------------------------------------------
tps.Button.prototype.clickStateReleased = function() {
},

tps.Button.prototype.clickStatePressed = function() {

};

// Toggle button states -------------------------------------------------------
tps.Button.prototype.toggleStateUp = function() {

};

tps.Button.prototype.toggleStateDown = function() {

};

