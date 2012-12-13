/*Global object*/
var g_Scheme = {
	interpreter : undefined ,
	input : undefined , //where code is written
	output : undefined //where text outputs are displayed
};


var clickHandler = function() { //click manager
	var xClick, yClick; //private
	return {
		setX : function(x) { xClick = x; } ,
		setY : function(y) { yClick = y; } ,
		getX : function() { return xClick; } ,
		getY : function() { return yClick; }
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
});
$("#eval_btn").click(function() {
  	scheme_eval();
});
$("#sample_btn").click(function() {
	load_code("sample"); //to load 'sample code'
});
function load_code(id) {
	g_Scheme.input.val($("#"+id).text());
}
function tokenize_list(list) {//converts scheme list to javascript array
	var tokens = [];
	while(list.length() != 0) {
		tokens.push(list.car);
		list = list.cdr;
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
function scheme_eval() {
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
BiwaScheme.define_libfunc("add-body", 7, 7, function(args) {
	var body_type;
	if(args[0] === "static")
		body_type = b2Body.b2_staticBody;
	else if(args[0] === "dynamic")
		body_type = b2Body.b2_dynamicBody;

	var shape = tokenize_list(args[1]);
	var position = tokenize_list(args[2]);
	var angle = tokenize_list(args[3]);
	var attributes = tokenize_list(args[4]);
	var color = tokenize_list(args[5]);
	var id = args[6];
	if(shape.length === 2) //if rectangle
		addBody(Body(body_type, new RectangleShape(shape[0], shape[1]), new Vector2D(position[0], position[1]), angle[0], 
		new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	else if(shape.length === 1) //if circle
		addBody(Body(body_type, new CircleShape(shape[0]), new Vector2D(position[0], position[1]), angle[0], 
		new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2]), id));
	
	/*Update Scheme bodyCount*/
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-body", 1, 1, function(args) {
	removeBody(args[0]);
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
});
BiwaScheme.define_libfunc("remove-clicked", 0, 0, function() {
	body_remove = findBodyAt(new Vector2D(clickHandler.getX(), clickHandler.getY()));
	console.log(body_remove);
	if(typeof body_remove !== "undefined")
		removeBody(body_remove.id());
	BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
});
BiwaScheme.define_libfunc("change-color", 2, 2, function(args) {
	var color_arr = tokenize_list(args[1]);
	var id = args[0];
	c_body = findBody(id);
	if(c_body != undefined) {
		c_body.color = new Color(color_arr[0], color_arr[1], color_arr[2]);
	}
});
BiwaScheme.define_libfunc("on", 2, 2, function(args) {
	if(args[0] === "click") {
		addHandler("click", args[1]);
	}
});
BiwaScheme.define_libfunc("~on", 1, 1, function(args) {
	if(args[0] === "click") {
		removeHandler("click");
	}
});
BiwaScheme.define_libfunc("alert-coords", 0, 0, function() {
	alert(clickHandler.getX() + " " + clickHandler.getY());
});
BiwaScheme.define_libfunc("bg-color", 1, 1, function(args) {
	var bg_color = tokenize_list(args[0]);
	var liesIn = function(num, a, b) {
		if(typeof num === "number" && (num >= a && num <= b)) return 1;
		else return 0;
	}
	if(liesIn(bg_color[0], 0, 1) && liesIn(bg_color[1], 0, 1) && liesIn(bg_color[2], 0, 1))
		g_WebGL.gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1.0);
});
/* ~ Mappings*/





function addHandler(event, scheme_code) {
	var evalSchemeCode = function() {
						g_Scheme.interpreter.evaluate(scheme_code);
						};
	g_WebGL.canvas.addEventListener(event, evalSchemeCode, false);
}
function removeHandler(event, scheme_code) {
	$("#canvas").unbind(event);
}
function fetchCoords(event) {
	clickHandler.setX(event.clientX - canvas.offsetLeft);
	clickHandler.setY(canvas_height - (event.clientY - canvas.offsetTop));
	
	/*Update Scheme click variables*/
	BiwaScheme.CoreEnv["x-click"] = clickHandler.getX();
	BiwaScheme.CoreEnv["y-click"] = clickHandler.getY();
}
