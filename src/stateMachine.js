/**
 *	Manages transitions among states.
 *
 *	To use:
 *
 *	var myClass = {
 *		// Create a state machine in your class...
 *		sm: new StateMachine(this);
 *
 *		// Create one or more state objects with enter, update, and exit functions.
 *		// These will execute in the context of the outer class, so if you want
 * 		// state-local variables, create a "locals" block and access it through
 *		// the state machine's "locals()" function...
 *		state: {
 *			locals: {
 *				counter : 0
 *			},
 *
 *			enter: function() {
 *				var locals = this.sm.locals();
 * 
 *				locals.counter = 0;
 *				console.log("Entered state!");
 *			},
 *
 *			update: function() {
 *				var locals = this.sm.locals();
 * 
 *				locals.counter += 1;
 *				console.log("  counter = " + locals.counter);
 *
 *				if (locals.counter === 3) {
 *					this.sm.transitionTo(null);
 *				}
 *			},
 *
 *			exit: function() {
 *				console.log("...done!");
 *			}
 *		},
 *
 *		// Set the state when you want it to execute...
 *		init: function() {
 *			this.sm.transitionTo(this.state);
 *		},
 *
 *		// ...and update the StateMachine every frame. This will automatically
 *		// call the state code and execute any transitions contained within it.
 *		classUpdate: function() {
 *			// classUpdate should be called every frame by an outside object.
 * 			this.sm.update();
 *		}
 *	}
 *
 *
 *  States are assumed to have the form:

 *  {locals: {...}, enter: function() {...}, update: function() {...}, exit: function() {...}}

 *  where all of the members are optional.
 *
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

tps.stateMachine.prototype.execOnState = function(fnName) {
	if (this.currentState && this.currentState[fnName] && typeof(this.currentState[fnName]) === "function") {
		this.currentState[fnName].bind(this.owner)();
	}
};

tps.stateMachine.prototype.transition = function() {
	if (this.nextState != this.currentState) {
		if (this.currentState && this.currentState.exit) {
			this.currentState.exit.bind(this.owner)();
		}

		this.currentState = this.nextState;

		if (this.currentState && this.currentState.enter) {
			this.currentState.enter.bind(this.owner)();
		}
	}

	this.wantsTransition = false;
	this.nextState = null;
};

 tps.stateMachine.prototype.isState = function(testState) {
 	return this.currentState === testState;
 };

 tps.stateMachine.prototype.locals = function() {
 	tps.utils.assert(this.currentState, "(StateMachine.locals) Can't request 'locals' from 'null' state!");
 	tps.utils.assert(this.currentState["locals"], "(StateMachine.locals) No locals defined in state!");

 	return this.currentState["locals"];
 };
