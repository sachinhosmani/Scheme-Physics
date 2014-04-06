Set = Set || function(array) {
    var store = {};
    for (var i = 0; i < array.length; i++) {
        store[array[i]] = true;
    }
    this.has = function(el) {
        return el in store;
    };
    this.add = function(el) {
        if (el in store) {
            return;
        }
        store[el] = true;
    };
};

/*Global object*/
var g_Scheme = {
    interpreter: undefined, // BiwaScheme object that interprets
    input: undefined, // where code is written
    output: undefined, // where text outputs are displayed
    events: new Set(["mouseup", "mousedown", "mousemove", "mouseover", "mouseout",
            "keyup", "keydown"])
};

if (!this.g_Helper) {
    this.g_Helper = {};
}

g_Scheme.updateBodyVars = function () {
    // Update body click variables
    BiwaScheme.CoreEnv["body-list"] = BiwaScheme.array_to_list(g_Box2D.getBodyList());
    BiwaScheme.CoreEnv["body-count"] = g_Box2D.body_count;
};
$(document).ready(
    function () {
        g_Scheme.editor = CodeMirror.fromTextArea(
            document.getElementById("input"), {
                lineNumbers: true,
                smartIndent: true,
                lineWrapping: true
            });
        g_Scheme.output = $("#output");
        g_Scheme.interpreter = new BiwaScheme.Interpreter(function (e, state) {
            g_Scheme.output.css("color", "red");
            g_Scheme.output.val(g_Scheme.output.val() + e.message + '\n'); //error messages
            g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
        });
        // Scheme environment variables
        g_Scheme.updateBodyVars();
        BiwaScheme.CoreEnv["canvas-width"] = canvas_width;
        BiwaScheme.CoreEnv["canvas-height"] = canvas_height;

        g_Scheme.interpreter.evaluate($("#basic_functions").text()); //evaluate the basic functions which the user uses
    });
$("#eval_btn").click(function () {
    g_Scheme.schemeEval();
});
$("#sample_btn").click(function () {
    g_Helper.loadCode("sample");
});
$("#clear_btn").click(function () {
    g_Scheme.output.val("");
});
g_Helper.loadCode = function (id) {
    g_Scheme.editor.setValue($("#" + id).text());
}
g_Scheme.listToArray = function (list) {
    // converts scheme list to javascript array (vice-versa implemented in BiwaScheme)
    var tokens = [];
    var tmp = list.car;
    if (typeof tmp === "object") {
        tokens.push(g_Scheme.listToArray(tmp));
    } else if (typeof tmp === "number") {
        tokens.push(tmp);
    } else {
        return [];
    }
    if (list.cdr) {
        tokens = tokens.concat(g_Scheme.listToArray(list.cdr));
    }
    return tokens;
}




/*Scheme evaluator*/
g_Scheme.unbalancedParentheses = function (code) {
    // tells if parentheses are balanced
    var tokens = (new BiwaScheme.Parser(code)).tokens;
    var parentheses = 0;
    var brakets = 0;
    for (var i = 0; i < tokens.length; i++) {
        switch (tokens[i]) {
        case "[":
            ++brakets;
            break;
        case "]":
            --brakets;
            break;
        case "(":
            ++parentheses;
            break;
        case ")":
            --parentheses;
            break;
        }
    }
    return parentheses != 0 || brakets != 0;
}
g_Scheme.schemeEval = function () {
	// called everytime 'Evaluate' button is clicked
    if (g_Scheme.unbalancedParentheses(g_Scheme.editor.getValue())) {
        g_Scheme.output.css("color", "red");
        g_Scheme.output.val(g_Scheme.output.val() + "Unbalanced Parentheses" + '\n');
        g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
    } else {
        g_Scheme.interpreter.evaluate(g_Scheme.editor.getValue(),
            function (result) {
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




/*Mappings
link up javascript functions to BiwaScheme
*/
BiwaScheme.define_libfunc("add-body", 7, 8, function (args) {
    // adds a body to the world
    // arguments : body type, shape, initial position, initial angle, attributes, color, id, (opt.)initial velocity
    var body_type;
    if (args[0] === "static")
        body_type = b2Body.b2_staticBody;
    else if (args[0] === "dynamic")
        body_type = b2Body.b2_dynamicBody;

    var shape = g_Scheme.listToArray(args[1]);
    var position = g_Scheme.listToArray(args[2]);
    var angle = args[3];
    var attributes = g_Scheme.listToArray(args[4]);
    var color = g_Scheme.listToArray(args[5]);
    var id = args[6];
    if (args.length === 8) {
        // if initial vel was specified
        var vel2 = g_Scheme.listToArray(args[7]);
        var vel = g_Box2D.vector2D(vel2[0], vel2[1]);
    } else {
        // assume 0 initial vel
        var vel = g_Box2D.vector2D(0.0, 0.0);
    }
    if (shape.length === 2) {
    	// if rectangle
        (g_Box2D.createBody(body_type, g_Box2D.rectangleShape(shape[0], shape[1]), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
    } else if (shape.length === 1) {
    	// if circle
        (g_Box2D.createBody(body_type, g_Box2D.circleShape(shape[0]), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
    } else if (shape.length > 2) {
    	// if polygon
        var tmp = [];
        for (var i = 0; i < shape.length; i++) {
            tmp.push(g_Box2D.vector2D(shape[i][0], shape[i][1]));
        }
        (g_Box2D.createBody(body_type, g_Box2D.polygonShape(tmp), g_Box2D.vector2D(position[0], position[1]), angle, vel, g_Box2D.attributes(attributes[0], attributes[1], attributes[2]), g_Box2D.color(color[0], color[1], color[2]), id)).add();
    }
    // Update Scheme body-count and body-list
    g_Scheme.updateBodyVars();
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-body", 1, 1, function (args) {
    // removes a body (id to be passed)
    g_Box2D.removeBody(args[0]);

    //Update Scheme body-count and body-list
    g_Scheme.updateBodyVars();
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("remove-clicked", 0, 0, function () {
    // removes last clicked object
    body_remove = g_Box2D.findBodyAt(g_Box2D.vector2D(g_Helper.clickHandler.getXUp(), g_Helper.clickHandler.getYUp()));
    if (body_remove !== undefined)
        g_Box2D.removeBody(body_remove.id());
    // Update Scheme body-count and body-list
    g_Scheme.updateBodyVars();
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("change-body-color", 2, 2, function (args) {
    // changes a body's color
    var color_arr = g_Scheme.listToArray(args[1]);
    var id = args[0];
    c_body = g_Box2D.bodies[g_Box2D.findBodyIndex(id)];
    if (c_body != undefined && (g_Helper.liesIn(color_arr[0], 0, 1) && g_Helper.liesIn(color_arr[1], 0, 1) && g_Helper.liesIn(color_arr[2], 0, 1))) {
        c_body.color = g_Box2D.color(color_arr[0], color_arr[1], color_arr[2]);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("change-bg-color", 1, 1, function (args) {
    // changes the bg-color of the canvas
    var bg_color = g_Scheme.listToArray(args[0]);
    if (g_Helper.liesIn(bg_color[0], 0, 1) && g_Helper.liesIn(bg_color[1], 0, 1) && g_Helper.liesIn(bg_color[2], 0, 1)) {
        g_WebGL.gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1.0);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("on", 2, 2, function (args) {
    // adds event handler function (on event lambda)
    if (!args[0].name || !g_Scheme.events.has(args[0].name)) {
        throw "Illegal event : " + args[0] + " in 'on'";
    }
    g_Scheme.handlerManager.addHandler(args[0].name, args[1]);
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("~on", 1, 2, function (args) {
    // removes event handler
    if (!args[0].name || !g_Scheme.events.has(args[0].name)) {
        throw "Illegal event name: " + args[0] + " in '~on'";
    }
    if (args.length === 2) {
        g_Scheme.handlerManager.removeHandler(args[0].name, args[1]);
    } else {
        g_Scheme.handlerManager.removeHandler(args[0].name);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("handler-data", 0, 1, function (args) {
    // lists all added handlers to various events
    if (args.length === 0) {
        var data = g_Scheme.handlerManager.allHandlerData();
        var tmp = [];
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                tmp.push(BiwaScheme.array_to_list(data[i]));
            }
        }
        return BiwaScheme.array_to_list(tmp);
    } else {
        return BiwaScheme.array_to_list(g_Scheme.handlerManager.allHandlerData(args[0]));
    }
});
BiwaScheme.define_libfunc("console-log", 1, 1, function (args) {
    console.log(args[0]);
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("random", 0, 2, function (args) {
    // return a random number between the arguments specified (0, 1 assumed if not specified)
    if (args.length === 2)
        return (typeof args[0] === "number" && typeof args[1] === "number") ? g_Helper.getRandom(args[0], args[1]) : Math.random();
    else
        return Math.random();
});
BiwaScheme.define_libfunc("apply-impulse", 2, 3, function (args) {
    console.log("on " + args[0]);
    // body's id, impulse vector, (opt.)point of application of impulse
    if (args[0] === BiwaScheme.undef)
        return;
    var impulse = g_Scheme.listToArray(args[1]);
    if (impulse.length !== 2) {
        return BiwaScheme.undef;
    }
    if (args.length === 3) {
        var point = g_Scheme.listToArray(args[2]);
        g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(impulse[0], impulse[1]), g_Box2D.vector2D(point[0], point[1]));
    } else {
        g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(impulse[0], impulse[1]));
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("apply-force", 3, 4, function (args) {
    // arguments : body's id, impulse vector, (opt.)point of application of impulse
    var force = g_Scheme.listToArray(args[1]);
    var time = args[2];
    if (!g_Helper.liesIn(time, g_Box2D.time_step, Infinity)) {
        return BiwaScheme.undef;
    }
    if (force.length !== 2) {
        return BiwaScheme.undef;
    }
    if (args.length === 3) {
        var point = g_Scheme.listToArray(args[2]);
        g_Box2D.applyForce(args[0], g_Box2D.vector2D(force[0], force[1]), time, g_Box2D.vector2D(point[0], point[1]));
    } else {
        g_Box2D.applyImpulse(args[0], g_Box2D.vector2D(force[0], force[1]), time);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("set-linear-velocity", 2, 2, function (args) {
    // id, vector2 velocity
    var body = g_Box2D.bodyMap(args[0]);
    var vel = g_Scheme.listToArray(args[1]);
    if (vel.length !== 2 || typeof vel[0] !== "number" || typeof vel[1] !== "number") {
        return;
    }
    body.SetLinearVelocity(new b2Vec2(vel[0] / g_Box2D.scale, vel[1] / g_Box2D.scale));
    return BiwaScheme.undef;
});

/*Body information returning functions*/
BiwaScheme.define_libfunc("body-com", 1, 1, function (args) {
    var body = g_Box2D.bodyMap(args[0]);
    if (body !== undefined) {
        var com = body.GetWorldCenter();
        return BiwaScheme.array_to_list([com.x * g_Box2D.scale, com.y * g_Box2D.scale]);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-angle", 1, 1, function (args) {
    var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
    if (body !== undefined) {
        return body.angle;
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-vertices", 1, 1, function (args) {
    var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
    if (body !== undefined) {
        return BiwaScheme.array_to_list(body.shape.getVertices());
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-linear-velocity", 1, 1, function (args) {
    var body = g_Box2D.bodyMap(args[0]);
    if (body !== undefined) {
        var vel = body.GetLinearVelocity();
        return BiwaScheme.array_to_list([vel.x * g_Box2D.scale, vel.y * g_Box2D.scale]);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-attributes", 1, 1, function (args) {
    var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
    if (body !== undefined) {
        return BiwaScheme.array_to_list([body.attributes.density, body.attributes.friction, body.attributes.restitution]);
    }
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-color", 1, 1, function (args) {
    var body = g_Box2D.bodies[g_Box2D.findBodyIndex(args[0])];
    if (body !== undefined) {
        return BiwaScheme.array_to_list([body.color.red, body.color.green, body.color.blue]);
    }
    return BiwaScheme.undef;
});


BiwaScheme.define_libfunc("set-gravity", 1, 1, function (args) {
    var gravity = g_Scheme.listToArray(args[0]);
    if (gravity.length !== 2) {
        return BiwaScheme.undef;
    }
    if (typeof gravity[0] !== "number" || typeof gravity[1] !== "number") {
        return BiwaScheme.undef;
    }
    g_Box2D.world.SetGravity(new b2Vec2(gravity[0] / g_Box2D.scale, gravity[1] / g_Box2D.scale));
    return BiwaScheme.undef;
});
BiwaScheme.define_libfunc("body-at", 1, 1, function (args) {
    var coords = g_Scheme.listToArray(args[0]);
    if (coords[0] === undefined || coords[1] === undefined) {
        return;
    }
    var body = g_Box2D.findBodyAt(g_Box2D.vector2D(coords[0], coords[1]));
    if (body !== undefined) {
        return body.id();
    }
    return BiwaScheme.undef;
});
/* ~Body information retruning functions*/
/* ~ Mappings*/




g_Helper.getRandom = function (a, b) {
	// returns a random number between a and b
    return Math.random() * Math.abs(a - b) + Math.min(a, b);
}
String.prototype.splice = function (index, remove, add) {
    return this.slice(0, index) + add + this.slice(Math.abs(remove) + index);
}
/*g_Helper.display = function(something) { //displays something on the output console
	g_Scheme.output.css("color", "green");
	g_Scheme.output.val(g_Scheme.output.val() + something + '\n');
	g_Scheme.output[0].scrollTop = g_Scheme.output[0].scrollHeight;
}*/

/* handlerManager
keeps store of references to event handler functions for use during removal
*/

g_Scheme.handlerManager = (function () {
    var handlerStore = (function () {
        //stores everything in 'details' and has retrieval methods
        var details = {};
        return {
            recordHandler: function (event, call_back, proc) {
                if (details[event] === undefined) {
                    details[event] = {};
                }
                var hashKey = JSON.stringify(proc);
                if (details[event][hashKey] === undefined) {
                    details[event][hashKey] = call_back;
                    return true;
                }
                return false;
            },
            eraseHandler: function (event, proc) {
                if (proc !== undefined) {
                    delete details[event][JSON.stringify(proc)];
                    var ctr = 0;
                    for (var i in details[event]) {
                        if (details[event].hasOwnProperty(i)) {
                            ctr++;
                        }
                    }
                    if (ctr === 0) {
                        delete details[event];
                    }
                } else {
                    delete details[event];
                }
            },
            retrieveCallBack: function (event, proc) {
                if (!(event in details))
                    return null;
                return details[event][JSON.stringify(proc)];
            },
            listCallBacks: function (event) {
            	// list all callbacks for an event
                var list = [];
                for (var i in details[event]) {
                    if (details[event].hasOwnProperty(i)) {
                        list.push(this.retrieveCallBack(event, i));
                    }
                }
                return list;
            },
            allHandlerData: function (event) {
            	// list all handler data
                var allData = [];
                if (event === undefined) {
                    for (var i in details) {
                        if (details.hasOwnProperty(i)) {
                            for (var j in details[i]) {
                                if (details[i].hasOwnProperty(j)) {
                                    allData.push([i, j]);
                                }
                            }
                        }
                    }
                } else {
                    for (var i in details[event]) {
                        if (details[event].hasOwnProperty(i)) {
                            allData.push(i);
                        }
                    }
                }
                return allData;
            }

        }
    })();
	// The returned object just exposes what is needed.
    return {
        addHandler: function (event, proc) {
            var evalProc = function () {
            	var eventObj = arguments[0];
            	switch (event) {
            		case "mouseup":
            		case "mousedown":
            		case "mousemove":
                    case "mouseover":
                    case "mouseout":
            			var x = eventObj.clientX - g_WebGL.canvas.offsetLeft;
            			var y = canvas_height - (eventObj.clientY - g_WebGL.canvas.offsetTop);
		                g_Scheme.interpreter.invoke_closure.call(g_Scheme.interpreter,
		                	proc, [x, y]);
            			break;
            		case "keyup":
            		case "keydown":
		                g_Scheme.interpreter.invoke_closure.call(g_Scheme.interpreter,
		                	proc, [eventObj.keyCode]);
            			break;
            	}
            };
            if (handlerStore.recordHandler(event, evalProc, proc)) {
                // only if handler wasn't added before
                g_WebGL.canvas.addEventListener(event, evalProc, false);
            }
        },
        removeHandler: function (event, proc) {
            if (proc) {
                // retrieve the call_back reference from the handlerStore
                var call_back = handlerStore.retrieveCallBack(event, proc);
                if (call_back) {
	                handlerStore.eraseHandler(event, proc);
	                g_WebGL.canvas.removeEventListener(event, call_back, false);
	            }
            } else {
                var call_backs = handlerStore.listCallBacks(event);
                handlerStore.eraseHandler(event);
                for (var i = 0; i < call_backs.length; i++) {
                    g_WebGL.canvas.removeEventListener(event, call_backs[i], false);
                }
            }
        },
        allHandlerData: function (event) {
            return handlerStore.allHandlerData(event);
        }
    }
})();
