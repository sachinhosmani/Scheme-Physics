/*Global object*/
var g_Scheme = {
	interpreter : undefined , //BiwaScheme object that interprets
	input : undefined , //where code is written
	output : undefined //where text outputs are displayed
};

if(!this.g_Helper) {
	this.g_Helper = {};
}

//mouse click manager
g_Helper.clickHandler = function() {
	var xUp, yUp, xDown, yDown; //private
	return {
		setXUp : function(x) {
			xUp = x;
		} ,
		setYUp : function(y) {
			yUp = y; 
		} ,
		getXUp : function() {
			return xUp;
		} ,
		getYUp : function() {
			return yUp;
		} ,
		setXDown : function(x) {
			xDown = x;
		} ,
		setYDown : function(y) {
			yDown = y; 
		} ,
		getXDown : function() {
			return xDown;
		} ,
		getYDown : function() {
			return yDown;
		}
	};
}();
//keyboard events manager
g_Helper.keyHandler = function() {
	var keyUp, keyDown; //private
	return {
		setUp : function(key) {
			keyUp = key;
		} ,
		setDown : function(key) {
			keyDown = key;
		} ,
		getUp : function() {
			return keyUp;
		} ,
		getDown : function() {
			return keyDown;
		}
	};
}();
//mouse move manager
g_Helper.moveHandler = function() {
	var xBefore, yBefore, xAfter, yAfter; //private
	return {
		setX : function(x) {
			xBefore = xAfter;
			xAfter = x;
		} ,
		setY : function(y) {
			yBefore = yAfter;
			yAfter = y;
		} ,
		getXAfter : function() {
			return xAfter;
		} ,
		getYAfter : function() {
			return yAfter;
		} ,
		getXBefore : function() {
			return xBefore;
		} ,
		getYBefore : function() {
			return yBefore;
		}
	};
}();
g_Scheme.updateMouseVars = function() {
	//Update Scheme click variables
	BiwaScheme.CoreEnv["x-down"] = g_Helper.clickHandler.getXDown();
	BiwaScheme.CoreEnv["y-down"] = g_Helper.clickHandler.getYDown();
	BiwaScheme.CoreEnv["x-before"] = g_Helper.moveHandler.getXBefore();
	BiwaScheme.CoreEnv["y-before"] = g_Helper.moveHandler.getYBefore();
	BiwaScheme.CoreEnv["x-after"] = g_Helper.moveHandler.getXAfter();
	BiwaScheme.CoreEnv["y-after"] = g_Helper.moveHandler.getYAfter();
	BiwaScheme.CoreEnv["x-up"] = g_Helper.clickHandler.getXUp();
	BiwaScheme.CoreEnv["y-up"] = g_Helper.clickHandler.getYUp();
};
g_Scheme.updateKeyVars = function() {
	//Update Scheme keyboard variables
	BiwaScheme.CoreEnv["key-up"] = g_Helper.keyHandler.getUp();
	BiwaScheme.CoreEnv["key-down"] = g_Helper.keyHandler.getDown();
};
g_Scheme.updateBodyVars = function() {
	//Update body click variables
	BiwaScheme.CoreEnv["body-list"] = BiwaScheme.array_to_list(g_Box2D.getBodyList());
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
};
$(document).ready(
	function() {
		g_Scheme.editor = CodeMirror.fromTextArea(
			document.getElementById("input"),
				{ lineNumbers: true, smartIndent: true,
				  lineWrapping: true});
		g_Scheme.output = $("#output");
		g_Scheme.interpreter = new BiwaScheme.Interpreter(function(e, state) {
			g_Scheme.output.css("color", "red");
			g_Scheme.output.val(g_Scheme.output.val() + e.message + '\n'); //error messages
			g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
		});
		//Scheme environment variables
		g_Scheme.updateMouseVars();
		g_Scheme.updateBodyVars();
		g_Scheme.updateKeyVars();
		BiwaScheme.CoreEnv["canvas-width"] = canvas_width;
		BiwaScheme.CoreEnv["canvas-height"] = canvas_height;
		
		g_Scheme.interpreter.evaluate($("#basic_functions").text()); //evaluate the basic functions which the user uses
});
$("#eval_btn").click(function() {
  	g_Scheme.schemeEval();
});
$("#sample_btn").click(function() {
	g_Helper.loadCode("sample"); //to load 'sample code'
});
$("#clear_btn").click(function() {
	g_Scheme.output.val("");
});
g_Helper.loadCode = function(id) {
	g_Scheme.editor.setValue($("#" + id).text());
}
g_Scheme.listToArray = function(list) {
//converts scheme list to javascript array (vice-versa implemented in BiwaScheme)
	var tokens = [];
	var tmp = list.car;
	if(typeof tmp === "object") {
		tokens.push(g_Scheme.listToArray(tmp));
	}
	else if(typeof tmp === "number") {
		tokens.push(tmp);
	}
	else {
		return [];
	}
	if(list.cdr) {
		tokens = tokens.concat(g_Scheme.listToArray(list.cdr));
	}
	return tokens;
}




/*Scheme evaluator*/
g_Scheme.unbalancedParentheses = function(code) {
	//tells if parentheses are balanced
	var tokens = (new BiwaScheme.Parser(code)).tokens;
	var parentheses = 0;
	var brakets = 0;
	for(var i = 0; i < tokens.length; i++) {
		switch(tokens[i]) {
			case "[": ++brakets; break;
			case "]": --brakets; break;
			case "(": ++parentheses; break;
			case ")": --parentheses; break;
		}
	}
	return parentheses != 0 || brakets != 0;
}
g_Scheme.schemeEval = function() { //called everytime 'Evaluate' button is clicked
	if(g_Scheme.unbalancedParentheses(g_Scheme.editor.getValue())) {
		g_Scheme.output.css("color", "red");
		g_Scheme.output.val(g_Scheme.output.val() + "Unbalanced Parentheses" + '\n');
		g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
	}
	else {
		g_Scheme.interpreter.evaluate(g_Scheme.editor.getValue(),
			function(result) {
				if (result !== BiwaScheme.undef && result != undefined) {
					result = BiwaScheme.to_write(result);
					g_Scheme.output.css("color", "green");
					g_Scheme.output.val(g_Scheme.output.val() + result + '\n');
					g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
				}
		});
	}
}
/* ~ Scheme evaluator*/





/*Mappings*/
//link up javascript functions to BiwaScheme
BiwaScheme.define_libfunc("add-body", 7, 8, function(args) {
	//adds a body to the world
	//arguments : body type, shape, initial position, initial angle, attributes, color, id, (opt.)initial velocity
	var body_type;
	if(args[0] === "static")
		body_type = b2Body.b2_staticBody;
	else if(args[0] === "dynamic")
		body_type = b2Body.b2_dynamicBody;

	var shape = g_Scheme.listToArray(args[1]);
	var position = g_Scheme.listToArray(args[2]);
	var angle = args[3];
	var attributes = g_Scheme.listToArray(args[4]);
	var color = g_Scheme.listToArray(args[5]);
	var id = args[6];
	if(args.length === 8) {
		//if initial vel was specified
		var vel2 = g_Scheme.listToArray(args[7]);
		var vel = g_Box2D.vector2D(vel2[0], vel2[1]);
	}
	else {
		//assume 0 initial vel
		var vel = g_Box2D.vector2D(0.0, 0.0);
	}
	if(shape.length === 2) {//if rectangle
		(g_Box2D.createBody(body_type, g_Box2D.rectangleShape(shape[0], shape[1]), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
	}
	else if(shape.length === 1) {//if circle
		(g_Box2D.createBody(body_type, g_Box2D.circleShape(shape[0]), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
	}
	else if(shape.length > 2) { //if polygon
		var tmp = [];
		for(var i = 0; i < shape.length; i++) {
			tmp.push(g_Box2D.vector2D(shape[i][0], shape[i][1]));
		}
		(g_Box2D.createBody(body_type, g_Box2D.polygonShape(tmp), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
	}
	/*Update Scheme body-count and body-list*/
	g_Scheme.updateBodyVars();
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-body", 1, 1, function(args) {
	//removes a body (id to be passed)
	g_Box2D.removeBody(args[0]);
	
	/*Update Scheme body-count and body-list*/
	g_Scheme.updateBodyVars();
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-clicked", 0, 0, function() {
	//removes last clicked object
	body_remove = g_Box2D.findBodyAt(g_Box2D.vector2D(g_Helper.clickHandler.getXUp(), g_Helper.clickHandler.getYUp()));
	if(body_remove !== undefined)
		g_Box2D.removeBody(body_remove.id());
	/*Update Scheme body-count and body-list*/
	g_Scheme.updateBodyVars();
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("change-body-color", 2, 2, function(args) {
	//changes a body's color
	var color_arr = g_Scheme.listToArray(args[1]);
	var id = args[0];
	c_body = g_Box2D.bodies[g_Box2D.findBodyIndex(id)];
	if(c_body != undefined && (g_Helper.liesIn(color_arr[0], 0, 1) && g_Helper.liesIn(color_arr[1], 0, 1) && g_Helper.liesIn(color_arr[2], 0, 1))) {
		c_body.color = g_Box2D.color(color_arr[0], color_arr[1], color_arr[2]);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("change-bg-color", 1, 1, function(args) {
	//changes the bg-color of the canvas
	var bg_color = g_Scheme.listToArray(args[0]);
	if(g_Helper.liesIn(bg_color[0], 0, 1) && g_Helper.liesIn(bg_color[1], 0, 1) && g_Helper.liesIn(bg_color[2], 0, 1)) {
		g_WebGL.gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1.0);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("on", 2, 2, function(args) {
	//adds event handler function (on event "handling code")
	if(args[0] !== "mouseup" && args[0] !== "mousedown" && args[0] !== "mousemove" && args[0] !== "keydown" && args[0] !== "keyup") {
		console.log("G");
		return;
	}
	g_Scheme.handlerManager.addHandler(args[0], args[1]);
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("~on", 1, 2, function(args) {
	//removes event handler
	if(args[0] !== "mouseup" && args[0] !== "mousedown" && args[0] !== "mousemove" && args[0] !== "keydown" && args[0] !== "keyup") {
		return;
	}
	if(args.length === 2) {
		g_Scheme.handlerManager.removeHandler(args[0], args[1]);
	}
	else {
		g_Scheme.handlerManager.removeHandler(args[0]);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("handler-data", 0, 1, function(args) {
	//lists all added handlers to various events
	if(args.length === 0) {
		var data = g_Scheme.handlerManager.allHandlerData();
		var tmp = [];
		for(var i in data) {
			if(data.hasOwnProperty(i)) {
				tmp.push(BiwaScheme.array_to_list(data[i]));
			}
		}
		return BiwaScheme.array_to_list(tmp);
	}
	else {
		return BiwaScheme.array_to_list(g_Scheme.handlerManager.allHandlerData(args[0]));
	}
});
BiwaScheme.define_libfunc("alert-click-coords", 0, 0, function() {
	//alerts last clicked coordinates
	alert(g_Helper.clickHandler.getXUp() + " " + g_Helper.clickHandler.getYUp());
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("click-coords", 0, 0, function() {
	//Scheme list of last clicked coordinates
	var coords = [typeof g_Helper.clickHandler.getXUp() === "number" ? g_Helper.clickHandler.getXUp() : "undefined", typeof g_Helper.clickHandler.getYUp() === "number" ? g_Helper.clickHandler.getYUp() : "undefined"];
	return BiwaScheme.array_to_list(coords);
});
BiwaScheme.define_libfunc("random", 0, 2, function(args) {
	//return a random number between the arguments specified (0, 1 assumed if not specified)
	if(args.length === 2)
		return (typeof args[0] === "number" && typeof args[1] === "number") ? g_Helper.getRandom(args[0], args[1]) : Math.random();
	else
		return Math.random();
});
BiwaScheme.define_libfunc("apply-impulse", 2, 3, function(args) {
	//body's id, impulse vector, (opt.)point of application of impulse
	var impulse = g_Scheme.listToArray(args[1]);
	if(impulse.length !== 2) {
		return BiwaScheme.undef;
	}
	if(args.length === 3) {
		var point = g_Scheme.listToArray(args[2]);
		g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(impulse[0], impulse[1]), g_Box2D.vector2D(point[0], point[1]));
	}
	else {
		g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(impulse[0], impulse[1]));
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("apply-force", 3, 4, function(args) {
	//arguments : body's id, impulse vector, (opt.)point of application of impulse
	var force = g_Scheme.listToArray(args[1]);
	var time = args[2];
	if(!g_Helper.liesIn(time, g_Box2D.time_step, Infinity)) {
		return BiwaScheme.undef;
	}
	if(force.length !== 2) {
		return BiwaScheme.undef;
	}
	if(args.length === 3) {
		var point = g_Scheme.listToArray(args[2]);
		g_Box2D.applyForce(args[0], g_Box2D.vector2D(force[0], force[1]), time, g_Box2D.vector2D(point[0], point[1]));
	}
	else {
		g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(force[0], force[1]), time);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("set-linear-velocity", 2, 2, function(args) {
	//id, vector2 velocity
	var body = g_Box2D.bodyMap(args[0]);
	var vel = g_Scheme.listToArray(args[1]);
	if(vel.length !== 2 || typeof vel[0] !== "number" || typeof vel[1] !== "number") {
		return;
	}
	body.SetLinearVelocity(new b2Vec2(vel[0]/g_Box2D.scale, vel[1]/g_Box2D.scale));
	return BiwaScheme.undef;
});

//Body information returning functions
BiwaScheme.define_libfunc("body-com", 1, 1, function(args) {
	var body = g_Box2D.bodyMap(args[0]);
	if(body !== undefined) {
		var com = body.GetWorldCenter();
		return BiwaScheme.array_to_list([com.x*g_Box2D.scale, com.y*g_Box2D.scale]);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-angle", 1, 1, function(args) {
	var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
	if(body !== undefined) {
		return body.angle;
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-vertices", 1, 1, function(args) {
	var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
	if(body !== undefined) {
		return BiwaScheme.array_to_list(body.shape.getVertices());
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-linear-velocity", 1, 1, function(args) {
	var body = g_Box2D.bodyMap(args[0]);
	if(body !== undefined) {
		var vel = body.GetLinearVelocity();
		return BiwaScheme.array_to_list([vel.x*g_Box2D.scale, vel.y*g_Box2D.scale]);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-attributes", 1, 1, function(args) {
	var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
	if(body !== undefined) {
		return BiwaScheme.array_to_list([body.attributes.density, body.attributes.friction, body.attributes.restitution]);
	}
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-color", 1, 1, function(args) {
	var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
	if(body !== undefined) {
		return BiwaScheme.array_to_list([body.color.red, body.color.green, body.color.blue]);
	}
	return BiwaScheme.undef;
});


BiwaScheme.define_libfunc("set-gravity", 1, 1, function(args) {
	var gravity = g_Scheme.listToArray(args[0]);
	if(gravity.length !== 2) {
		return BiwaScheme.undef;
	}
	if(typeof gravity[0] !== "number" || typeof gravity[1] !== "number") {
		return BiwaScheme.undef;
	}
	g_Box2D.world.SetGravity(new b2Vec2(gravity[0]/g_Box2D.scale, gravity[1]/g_Box2D.scale));
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-at", 1, 1, function(args) {
	var coords = g_Scheme.listToArray(args[0]);
	if(coords[0] === undefined || coords[1] === undefined) {
		return;
	}
	var body = g_Box2D.findBodyAt(g_Box2D.vector2D(coords[0], coords[1]));
	if(body !== undefined) {
		return body.id();
	}
	return BiwaScheme.undef;
});
/* ~ Mappings*/






g_Helper.getRandom = function(a, b) { //returns a random number between a and b
	return Math.random() * Math.abs(a - b) + Math.min(a, b);
}
String.prototype.splice = function(index, remove, add) {
	return this.slice(0, index) + add + this.slice(Math.abs(remove) + index);
}
/*g_Helper.display = function(something) { //displays something on the output console
	g_Scheme.output.css("color", "green");
	g_Scheme.output.val(g_Scheme.output.val() + something + '\n');
	g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight; 
}*/

//keeps store of references to event handler functions for use during removal
g_Scheme.handlerManager = (function() {
	var handlerStore = (function() {
		//stores everything in 'details' and has retrieval methods 
		var details = {};
		return {
			recordHandler : 
				function(event, call_back, scheme_code) {
					if(details[event] === undefined) {
						details[event] = {};
					}
					if(details[event][scheme_code] === undefined) {
						details[event][scheme_code] = call_back;
						return 1; //added
					}
					return 0; //not added (was there before)
				} ,
			eraseHandler : //erase handler from 'details'
				function(event, scheme_code) {
					if(scheme_code !== undefined) {
						delete details[event][scheme_code];
						var ctr = 0;
						for(var i in details[event]) {
							if(details[event].hasOwnProperty(i)) {
								ctr++;
							}
						}
						if(ctr === 0) {
							delete details[event];
						}
					}
					else {
						delete details[event];
					}
				} ,
			retrieveCallBack : 
				function(event, scheme_code) {
					return details[event][scheme_code];
				} ,
			listCallBacks : //list all call backs of an event
				function(event) {
					var list = [];
					for(var i in details[event]) {
						if(details[event].hasOwnProperty(i)) {
							list.push(this.retrieveCallBack(event, i));
						}
					}
					return list;
				} ,
			allHandlerData : //list all handler data
				function(event) {
					var allData = [];
					if(event === undefined) {	
						for(var i in details) {
							if(details.hasOwnProperty(i)) {
								for(var j in details[i]) {
									if(details[i].hasOwnProperty(j)) {
										allData.push([i, j]);
									}
								}
							}
						}
					}
					else {
						for(var i in details[event]) {
							if(details[event].hasOwnProperty(i)) {
								allData.push(i);
							}
						}
					}
					return allData;
				}
					
		}
	})();
	return {
		addHandler : 
			function(event, scheme_code) {
				var evalSchemeCode = function() {
					g_Scheme.interpreter.evaluate(scheme_code);
				};
				if(handlerStore.recordHandler(event, evalSchemeCode, scheme_code)) {
				//only if handler wasn't added before
					g_WebGL.canvas.addEventListener(event, evalSchemeCode, false);
				}
			} ,
		removeHandler : 
			function(event, scheme_code) {
				if(scheme_code) {
				//retrieve the call_back reference from the handlerStore
					var call_back = handlerStore.retrieveCallBack(event, scheme_code);
					handlerStore.eraseHandler(event, scheme_code);
					g_WebGL.canvas.removeEventListener(event, call_back, false);
				}
				else {
					var call_backs = handlerStore.listCallBacks(event);
					handlerStore.eraseHandler(event);
					for(var i = 0; i < call_backs.length; i++) {
						g_WebGL.canvas.removeEventListener(event, call_backs[i], false);
					}
				}
			} ,
		allHandlerData :
			function(event) {
				return handlerStore.allHandlerData(event);
			}
	}
})();
g_Helper.fetchMouseDown = function(event) {
//called everytime there is a mouse down on the canvas
	g_Helper.clickHandler.setXDown(event.clientX - canvas.offsetLeft);
	g_Helper.clickHandler.setYDown(canvas_height - (event.clientY - canvas.offsetTop));
	g_Scheme.updateMouseVars();
};
g_Helper.fetchMouseUp = function(event) {
//called everytime there is a mouse up on the canvas
	g_Helper.clickHandler.setXUp(event.clientX - canvas.offsetLeft);
	g_Helper.clickHandler.setYUp(canvas_height - (event.clientY - canvas.offsetTop));
	g_Scheme.updateMouseVars();
};
g_Helper.fetchMoveCoords = function(event) {
//called everytime there is mouse movement on the canvas
	g_Helper.moveHandler.setX(event.clientX - canvas.offsetLeft);
	g_Helper.moveHandler.setY(canvas_height - (event.clientY - canvas.offsetTop));
	g_Scheme.updateMouseVars();
};
g_Helper.fetchKeyDown = function(event) {
//called everytime there is a key down
	g_Helper.keyHandler.setDown(event.keyCode);
	g_Scheme.updateKeyVars();
};
g_Helper.fetchKeyUp = function(event) {
//called everytime there is a key up
	g_Helper.keyHandler.setUp(event.keyCode);
	g_Scheme.updateKeyVars();
};
	
	
	
	
	
