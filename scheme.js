/*Global object*/
var g_Scheme = {
	interpreter : undefined ,
	input : undefined , //where code is written
	output : undefined //where text outputs are displayed
};

//mouse click manager
var clickHandler = function() {
	var xClick, yClick; //private
	return {
		setX : function(x) {
			xClick = x;
		} ,
		setY : function(y) {
			yClick = y; 
		} ,
		getX : function() {
			return xClick;
		} ,
		getY : function() {
			return yClick;
		}
	};
}();
//mouse move manager
var moveHandler = function() {
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
		getX : function() {
			return xAfter;
		} ,
		getY : function() {
			return yAfter;
		}
	};
}();

$(document).ready(
	function() {
		g_Scheme.input = $("#input");
		g_Scheme.output = $("#output");
		g_Scheme.interpreter = new BiwaScheme.Interpreter(function(e, state) {
			g_Scheme.output.css("color", "red");
			g_Scheme.output.val(g_Scheme.output.val() + e.message + '\n'); //error messages
		});
		g_Scheme.interpreter.evaluate($("#basic_functions").text()); //evaluate the basic functions which the user uses
		
		/*Scheme environment variables*/
		BiwaScheme.CoreEnv["x-click"] = clickHandler.getX();
		BiwaScheme.CoreEnv["y-click"] = clickHandler.getY();
		BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
		BiwaScheme.CoreEnv["canvas-width"] = canvas_width;
		BiwaScheme.CoreEnv["canvas-height"] = canvas_height;
		BiwaScheme.CoreEnv["body-list"] = array_to_list(getBodyList());
		var bodyClicked = findBodyAt(new Vector2D(clickHandler.getX(), clickHandler.getY()));
		BiwaScheme.CoreEnv["id-clicked"] = bodyClicked && bodyClicked.id();
});
$("#eval_btn").click(function() {
  	scheme_eval();
});
$("#sample_btn").click(function() {
	load_code("sample"); //to load 'sample code'
});
function load_code(id) {
	g_Scheme.input.val($("#" + id).text());
}
//converts scheme list to javascript array (vice-versa implemented in BiwaScheme)
function listToArray(list) {
	var tokens = [];
	var tmp = list.car;
	if(typeof tmp === "object") {
		tokens.push(listToArray(tmp));
	}
	else if(typeof tmp === "number") {
		tokens.push(tmp);
	}
	else {
		return [];
	}
	if(list.cdr) {
		tokens = tokens.concat(listToArray(list.cdr));
	}
	return tokens;
}




/*Scheme evaluator*/
function unbalanced_parentheses(code) {
	var tokens = (new BiwaScheme.Parser(code)).tokens;
	var parentheses = 0;
	var brakets = 0;
	for(var i = 0; i < tokens.length; ++i) {
		switch(tokens[i]) {
			case "[": ++brakets; break;
			case "]": --brakets; break;
			case "(": ++parentheses; break;
			case ")": --parentheses; break;
		}
	}
	return parentheses != 0 || brakets != 0;
}
function scheme_eval() { //called everytime 'Evaluate' button is clicked
	if(unbalanced_parentheses(g_Scheme.input.val())) {
		g_Scheme.output.css("color", "red");
		g_Scheme.output.val(g_Scheme.output.val() + "Unbalanced Parentheses" + '\n');
	}
	else {
		g_Scheme.interpreter.evaluate(g_Scheme.input.val(),
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
BiwaScheme.define_libfunc("alert", 1, 1, function(args) {
	alert(args[0]);
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("add-body", 7, 7, function(args) { //adds a body to the world
	var body_type;
	if(args[0] === "static")
		body_type = b2Body.b2_staticBody;
	else if(args[0] === "dynamic")
		body_type = b2Body.b2_dynamicBody;

	var shape = listToArray(args[1]);
	var position = listToArray(args[2]);
	var angle = args[3];
	var attributes = listToArray(args[4]);
	var color = listToArray(args[5]);
	var id = args[6];
	if(shape.length === 2) {//if rectangle
		addBody(Body(body_type, new RectangleShape(shape[0], shape[1]), new Vector2D(position[0], position[1]), angle, new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	}
	else if(shape.length === 1) {//if circle
		addBody(Body(body_type, new CircleShape(shape[0]), new Vector2D(position[0], position[1]), angle, new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	}
	/*else if(shape.length === 3) { //if triangle
		addBody(Body(body_type, new TriangleShape([new Vector2D(listToArray(shape[0])), listToArray(shape[1]), listToArray(shape[2])]), new Vector2D(position[0], position[1]), angle, new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	}*/
	else if(shape.length > 2) { //if polygon
		var tmp = [];
		for(var i = 0; i < shape.length; i++) {
			tmp.push(new Vector2D(shape[i][0], shape[i][1]));
		}
		addBody(Body(body_type, new PolygonShape(tmp), new Vector2D(position[0], position[1]), angle, new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	}
	/*Update Scheme body-count and body-list*/
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
	BiwaScheme.CoreEnv["body-list"] = array_to_list(getBodyList());
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-body", 1, 1, function(args) { //removes a body (id to be passed)
	removeBody(args[0]);
	
	/*Update Scheme body-count and body-list*/
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
	BiwaScheme.CoreEnv["body-list"] = array_to_list(getBodyList());
});
BiwaScheme.define_libfunc("remove-bodies", 1, 1, function(args) { //removes a list of bodies
	var bodies_remove = listToArray(args[0]);
	for(var i = 0; i < bodies_remove.length; i++)
		removeBody(bodies_remove[i]);

	/*Update Scheme body-count and body-list*/
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
	BiwaScheme.CoreEnv["body-list"] = array_to_list(getBodyList());
});
BiwaScheme.define_libfunc("remove-clicked", 0, 0, function() { //removes last clicked object
	body_remove = findBodyAt(new Vector2D(clickHandler.getX(), clickHandler.getY()));
	if(body_remove !== undefined)
		removeBody(body_remove.id());
	/*Update Scheme body-count and body-list*/
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
	BiwaScheme.CoreEnv["body-list"] = array_to_list(getBodyList());
});
BiwaScheme.define_libfunc("body-color", 2, 2, function(args) { //changes a body's color
	var color_arr = listToArray(args[1]);
	var id = args[0];
	c_body = findBody(id);
	if(c_body != undefined && (liesIn(color_arr[0], 0, 1) && liesIn(color_arr[1], 0, 1) && liesIn(color_arr[2], 0, 1))) {
		c_body.color = new Color(color_arr[0], color_arr[1], color_arr[2]);
	}
});
BiwaScheme.define_libfunc("bg-color", 1, 1, function(args) { //changes the bg-color of the canvas
	var bg_color = listToArray(args[0]);
	if(liesIn(bg_color[0], 0, 1) && liesIn(bg_color[1], 0, 1) && liesIn(bg_color[2], 0, 1))
		g_WebGL.gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1.0);
});
BiwaScheme.define_libfunc("on", 2, 2, function(args) { //adds event handler function (on event "handling code")
	if(args[0] !== "click") return;
	handlerManager.addHandler(args[0], args[1]);
});
BiwaScheme.define_libfunc("~on", 1, 2, function(args) { //removes event handler
	if(args[0] !== "click") return;
	if(args.length === 2) {
		handlerManager.removeHandler(args[0], args[1]);
	}
	else {
		handlerManager.removeHandler(args[0]);
	}

});
BiwaScheme.define_libfunc("handler-data", 0, 1, function(args) { //lists all added handlers to various events
	if(args.length === 0) {
		var data = handlerManager.allHandlerData();
		var tmp = [];
		for(var i in data) {
			if(data.hasOwnProperty(i)) {
				tmp.push(array_to_list(data[i]));
			}
		}
		return array_to_list(tmp);
	}
	else {
		return array_to_list(handlerManager.allHandlerData(args[0]));
	}
});
BiwaScheme.define_libfunc("alert-click-coords", 0, 0, function() {
	alert(clickHandler.getX() + " " + clickHandler.getY());
});
BiwaScheme.define_libfunc("click-coords", 0, 0, function() {
	var coords = [typeof clickHandler.getX() === "number" ? clickHandler.getX() : "undefined", typeof clickHandler.getY() === "number" ? clickHandler.getY() : "undefined"];
	return array_to_list(coords);
});
BiwaScheme.define_libfunc("random", 0, 2, function(args) {
	if(args.length === 2)
		return (typeof args[0] === "number" && typeof args[1] === "number") ? getRandom(args[0], args[1]) : Math.random();
	else
		return Math.random();
});
/* ~ Mappings*/






function getRandom(a, b) { //returns a random number between a and b
	return Math.random() * Math.abs(a - b) + Math.min(a, b);
}
String.prototype.splice = function(index, remove, add) {
	return this.slice(0, index) + add + this.slice(Math.abs(remove) + index);
}
/*function display(something) { //displays something on the output console
	g_Scheme.output.css("color", "green");
	g_Scheme.output.val(g_Scheme.output.val() + something + '\n');
	g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight; 
}*/

//keeps store of references to event handler functions for use during removal
var handlerManager = (function() {
	var handlerStore = (function() {
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
					return 0; //not added
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
					g_WebGL.canvas.addEventListener(event, evalSchemeCode, false);
				}
			} ,
		removeHandler : 
			function(event, scheme_code) {
				if(scheme_code) {
					//retrieve the call_back reference from the handlerStore
					var call_back = handlerStore.retrieveCallBack(event, scheme_code);
					g_WebGL.canvas.removeEventListener(event, call_back, false);
				}
				else {
					var call_backs = handlerStore.listCallBacks(event);
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
function fetchClickCoords(event) { //called everytime there is a click on the canvas
	clickHandler.setX(event.clientX - canvas.offsetLeft);
	clickHandler.setY(canvas_height - (event.clientY - canvas.offsetTop));
	
	/*Update Scheme click variables*/
	BiwaScheme.CoreEnv["x-click"] = clickHandler.getX();
	BiwaScheme.CoreEnv["y-click"] = clickHandler.getY();
	var bodyClicked = findBodyAt(new Vector2D(clickHandler.getX(), clickHandler.getY()));
	BiwaScheme.CoreEnv["id-clicked"] = (bodyClicked && bodyClicked.id());
}
function fetchMoveCoords(event) { //called everytime there is a click on the canvas
	moveHandler.setX(event.clientX - canvas.offsetLeft);
	moveHandler.setY(canvas_height - (event.clientY - canvas.offsetTop));
}
