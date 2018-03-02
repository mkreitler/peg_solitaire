/**
 *	Assoc tables for managing string lookup.
 *  Localization would go here.
 */

 tps.strings = {
 	table: {
 		tt_button_hint: "Press to see the next move.",
 		tt_button_undo: "Press to undo a move.",
 		tt_button_redo: "Press to redo a move.",
 		tt_button_quit: "Press to quit this game.",
 		tt_button_music: "Press to toggle music.",
 		tt_button_sound: "Press to toggle sound.",
 	},

 	lookup: function(key) {
 		tps.utils.assert(key && key.length > 0, "(tps.strings.lookup) Invalid key!");

 		key = key.toLowerCase();
 		var tableEntry = this.table[key];

 		tps.utils.assert(tableEntry, "(tps.strings.lookup) No entry for key '" + key + "'!");

 		return tableEntry;
 	}
 };
