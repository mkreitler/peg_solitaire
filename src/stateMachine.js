/**
 *	Manages transitions among states.
 *  States are assumed to have the form:

 *  {enter: function() {...}, update: function() {...}, exit: function() {...}}

 *  where all of the functions are optional.
 */
 tps.stateMachine = function(owner) {
 	this.owner = owner;
 	this.currentState = null;
 	this.nextState = null;
 	this.wantsTransition = false;
 };

 tps.stateMachine.prototype.transitionTo = function(nextState) {
 	this.nextState = nextState;
 	this.wantsTransition = true;
 };

 tps.stateMachine.prototype.update = function() {
 	if (this.wantsTransition) {
 		this.transition();
 	}

 	if (this.currentState && this.currentState.update) {
 		this.currentState.update.bind(this.owner)();
 	}
};

 tps.stateMachine.prototype.transition = function() {
 	if (this.nextState != this.currentState) {
 		if (this.currentState && this.currentState.exit) {
 			this.currentState.exit.bind(this.owner)();
 		}

 		if (this.nextState && this.nextState.enter) {
 			this.nextState.enter.bind(this.owner)();
 		}
 	}

 	this.currentState = this.nextState;
 	this.wantsTransition = false;
 	this.nextState = null;
 };
