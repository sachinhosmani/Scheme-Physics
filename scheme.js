var intepreter;
var input; //where code is written
var output; //where text outputs are displayed
var xClick, yClick;
$(document).ready(
	function() {
		input = $("#input");
		output = $("#output");
		intepreter = new BiwaScheme.Interpreter(function(e, state) {
			output.css("color", "red");
			output.val(output.val() + e.message + '\n'); //error messages
		});
		intepreter.evaluate($("#basic_functions").text()); //evaluate the basic functions which the user uses
});
$("#eval_btn").click(function() {
  	scheme_eval();
});
$("#sample_btn").click(function() {
	load_code("sample"); //to load 'sample code'
});
function load_code(id) {
	input.val($("#"+id).text());
}
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
//link up a javascript function to BiwaScheme
BiwaScheme.define_libfunc("alert", 1, 1, function(args) {
	alert(args[0]);
	return BiwaScheme.undef;
});
//link up a javascript function to BiwaScheme
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
		addBody(new Body(body_type, new RectangleShape(shape[0], shape[1]), new Vector2D(position[0], position[1]), angle[0], 
		new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2])), id);
	else if(shape.length === 1) //if circle
		addBody(new Body(body_type, new CircleShape(shape[0]), new Vector2D(position[0], position[1]), angle[0], 
		new Vector2D(0.0, 0.0), new Attributes(attributes[0], attributes[1], attributes[2]), new Color(color[0], color[1], color[2])), id);
	return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-body", 1, 1, function(args) {
	removeBody(args[0]);
});
BiwaScheme.define_libfunc("remove-clicked", 0, 0, function() {
	removeClicked();
});
BiwaScheme.define_libfunc("on", 2, 2, function(args) {
	if(args[0] === "click") {
		addHandler("click", args[1]);
	}
});
BiwaScheme.define_libfunc("alert-coords", 0, 0, function() {
	alert(xClick + " " + yClick);
});
function scheme_eval() {
	if(unbalanced_parentheses(input.val())) {
		output.css("color", "red");
		output.val(output.val() + "Unbalanced Parentheses" + '\n');
	}
	else {
		intepreter.evaluate(input.val(),
			function(result) {
				if (result !== BiwaScheme.undef && result != undefined) {
					result = BiwaScheme.to_write(result);
					output.css("color", "green");
					output.val(output.val() + result + '\n');
				}
		});
	}
}
function tokenize_list(list) {//converts scheme list to javascript array
	var tokens = [];
	while(list.length() != 0) {
		tokens.push(list.car);
		list = list.cdr;
	}
	return tokens;
}
function addHandler(event, scheme_code) {
	var evalSchemeCode = function(e) {
						intepreter.evaluate(scheme_code);
						};
	canvas.addEventListener(event, evalSchemeCode, false);
}
function removeClicked() {
	body_remove = findBodyAt(new Vector2D(xClick, yClick));
	if(body_remove != undefined)
		removeBody(body_remove.id);
}
function fetchCoords(event) {
	xClick = event.clientX - canvas.offsetLeft;
	yClick = event.clientY - canvas.offsetTop;
}
