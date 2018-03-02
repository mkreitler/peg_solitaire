/**
 *	UI element: click or toggle button.
 */

tps.Button = function(game, type, spriteButton, spriteIcon, downMessage, upMessage, tooltip) {
	tps.utils.assert(game, "(Button.constructor) Invalid game object!");
	tps.utils.assert(type !== "undefined" && (type === tps.Button.Type.CLICK || type === tps.Button.Type.TOGGLE), "(Button.constructor) Invalid button type!");
	tps.utils.assert(spriteButton, "(Button.constructor) Invalid button sprite!");
	tps.utils.assert(spriteIcon, "(Button.constructor) Invalid icon sprite!");

	this.game = game;
	this.type = type;
	this.spriteButton = spriteButton;
	this.spriteIcon = spriteIcon;
	this.downMessage = downMessage;
	this.upMessage = upMessage;
	this.tooltip = tooltip;
	this.wantsUntoggle = false;
	this.tooltipBlocked = false;

	this.spriteButton.visible = true;
	this.spriteIcon.visible = true;
	this.spriteButton.frame = 0;
	this.spriteIcon.frame = tps.Button.IconStyle.NORMAL;
	this.spriteButton.anchor.set(0.5, 0.5);
	this.spriteIcon.anchor.set(0.5, 0.5);
	this.deactivated = false;

	this.group = game.add.group();
	this.group.add(this.spriteButton);
	this.group.add(this.spriteIcon);

	switch (this.type) {
		case tps.Button.Type.CLICK:
			this.updateState = this.clickStateUp;
		break

		case tps.Button.Type.TOGGLE:
			this.updateState = this.toggleStateUp;
		break;

		default:
			this.updateState = null;
		break;
	}

	this.spriteButton.inputEnabled = true;
	this.spriteIcon.inputEnabled = true;
};

tps.Button.Type 			= {CLICK: 0, TOGGLE: 1};
tps.Button.Style 			= {NORMAL: 0, DARK: 1};
tps.Button.IconStyle 		= {LIT: 0, NORMAL: 1, DARK: 2};
tps.Button.ALPHA_INACTIVE	= 0.33;
tps.Button.ALPHA_ACTIVE		= 1.0;

tps.Button.prototype.deactivate = function() {
	this.spriteButton.alpha = tps.Button.ALPHA_INACTIVE;
	this.spriteIcon.alpha = tps.Button.ALPHA_INACTIVE;
	this.deactivated = true;

	if (this.spriteIcon.frame === tps.Button.IconStyle.LIT) {
		this.spriteIcon.frame = tps.Button.IconStyle.NORMAL;
		tps.switchboard.broadcast("clearTooltip");
	}
};

tps.Button.prototype.activate = function() {
	this.spriteButton.alpha = tps.Button.ALPHA_ACTIVE;
	this.spriteIcon.alpha = tps.Button.ALPHA_ACTIVE;
	this.spriteButton.inputEnabled = true;
	this.spriteIcon.inputEnabled = true;
	this.deactivated = false;
};

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

	this.group.position.set(x, y);
};

tps.Button.prototype.setStyle = function(buttonStyle, iconStyle) {
	var changed = false;

	if (this.spriteButton.frame !== buttonStyle) {
		this.spriteButton.frame = buttonStyle;
		changed = true;
	}

	if (this.spriteIcon.frame !== iconStyle) {
		this.spriteIcon.frame = iconStyle;
		changed = true;
	}

	return changed;
};

tps.Button.prototype.update = function() {
	if (this.updateState) {
		this.updateState();
	}
};

// Click button states --------------------------------------------------------
tps.Button.prototype.clickStateUp = function() {
	if (!this.deactivated) {
		if (this.spriteButton.input.pointerOver(0) || this.spriteIcon.input.pointerOver(0)) {
			if (this.spriteButton.input.pointerDown(0) || this.spriteIcon.input.pointerDown(0)) {
				this.setStyle(tps.Button.Style.DARK, tps.Button.IconStyle.DARK);
				this.updateState = this.clickStateDown;
				tps.switchboard.broadcast(this.downMessage, this);
				tps.switchboard.broadcast("buttonClickDown", this);
				this.tooltipBlocked = true;
			}
			else if (!this.game.input.activePointer.isDown) {
				// Don't like spamming the broadcast channel every frame the pointer is over
				// the button, but without this, it's possible to jump from one button to
				// another quickly enough that the new buttons 'set' message beats the old
				// buttons 'clear' message, resulting in a blank tooltip.		
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.LIT);
				tps.switchboard.broadcast("setTooltip", this.tooltip);
			}
		}
		else {
			if (this.spriteIcon.frame === tps.Button.IconStyle.LIT) {
				tps.switchboard.broadcast("clearTooltip");
			}

			if (!this.spriteButton.input.pointerDown(0) && !this.spriteIcon.input.pointerDown(0)) {
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.NORMAL)
			}
		}
	}
},

tps.Button.prototype.clickStateDown = function() {
	if (!this.deactivated) {
		if (!this.spriteButton.input.pointerDown(0) && !this.spriteIcon.input.pointerDown(0)) {
			if (this.spriteButton.input.pointerOver(0) || this.spriteIcon.input.pointerOver(0)) {
				tps.switchboard.broadcast(this.upMessage, this);
				tps.switchboard.broadcast("buttonClickUp", this);
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.LIT);
			}
			else {
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.NORMAL);
			}

			this.updateState = this.clickStateUp;
		}
	}
};

// Toggle button states -------------------------------------------------------
tps.Button.prototype.toggleStateUp = function() {
	if (!this.deactivated) {
		if (this.spriteButton.input.pointerOver(0) || this.spriteIcon.input.pointerOver(0)) {
			if (this.spriteButton.input.pointerDown(0) || this.spriteIcon.input.pointerDown(0)) {
				this.setStyle(tps.Button.Style.DARK, tps.Button.IconStyle.DARK);
				this.updateState = this.toggleWaitForRelease;

				tps.switchboard.broadcast(this.downMessage, this);
				tps.switchboard.broadcast("buttonToggleDown", this);
				this.wantsUntoggle = false;
			}
			else if (!this.game.input.activePointer.isDown) {
				// Don't like spamming the broadcast channel every frame the pointer is over
				// the button, but without this, it's possible to jump from one button to
				// another quickly enough that the new buttons 'set' message beats the old
				// buttons 'clear' message, resulting in a blank tooltip.		
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.LIT);
				tps.switchboard.broadcast("setTooltip", this.tooltip);
			}
		}
		else {
			if (this.spriteIcon.frame === tps.Button.IconStyle.LIT) {
				tps.switchboard.broadcast("clearTooltip");
			}

			if (!this.spriteButton.input.pointerDown(0) && !this.spriteIcon.input.pointerDown(0)) {
				this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.NORMAL)
			}
		}
	}
};

tps.Button.prototype.toggleWaitForRelease = function() {
	if (!this.game.input.activePointer.isDown) {
		this.updateState = this.toggleStateDown;
	}
};

tps.Button.prototype.toggleStateDown = function() {
	if (!this.deactivated) {
		if (this.spriteButton.input.pointerOver(0) || this.spriteIcon.input.pointerOver(0)) {
			if (this.spriteButton.input.pointerDown(0) || this.spriteIcon.input.pointerDown(0)) {
				this.wantsUntoggle = true;
				tps.switchboard.broadcast("clearTooltip");
			}
		}

		if (!this.game.input.activePointer.isDown) {
			if (this.wantsUntoggle) {
				if (this.spriteButton.input.pointerOver(0) || this.spriteIcon.input.pointerOver(0)) {
					this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.LIT);
					tps.switchboard.broadcast("setTooltip", this.tooltip);
				}
				else {
					this.setStyle(tps.Button.Style.NORMAL, tps.Button.IconStyle.NORMAL)
				}

				tps.switchboard.broadcast(this.upMessage, this);
				tps.switchboard.broadcast("buttonToggleUp", this);
				this.updateState = this.toggleStateUp;
				this.wantsUntoggle = false;
			}
		}
	}
};

