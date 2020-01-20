////////////////////////////////////////////////////////////////
// pullpush minimo framework

let source = (function(){
	return function source(type, getValue, setValue, register, unregister, dispatch, handler){
		let cache = {};
		return function source(id, value){
			let cached = cache[id];
			if(cached){
				return cached;
			}
			let state = value;
			let observers = {};
			let onchange = function onchange(id, observers){
				return function onchange(event){
					if(handler){
						state = handler(id, state, event);
					}
					return pullpush.event(event, observers, getValue(id, state));
				};
			};
			let $onchange = onchange(id, observers);
			let $register = register && function onregister(){
				register(id, $onchange);
			};
			let $unregister = unregister && function onunregister(){
				unregister(id, $onchange);
			};
			let updateState = function updateState(value){
				state = value;
			};
			let change = function change(sink, id, value){
				let current = getValue(id, state);
				state = setValue(id, value, state);
				let next = getValue(id, state);
				if(next !== current){
					if(dispatch){
						dispatch(id, value, state);
					}
					else{
						return (pullpush.broadcast(sink, observers, next))
							(next);						
					}
				}
				return next;
			};
			let name = type + "_" + id;
			let namedFunctions = {
				[name]: function(sink, value, delay){
					if(value === undefined){
						return (pullpush.register(sink, observers, $register, $unregister))
							(getValue(id, state));
					}
					return (pullpush.register(sink, observers, $register, $unregister))
						(pullpush.forcast(sink, undefined, delay, change, id, value))
						(getValue(id, state));
				},
			};
			let uncached = namedFunctions[name];
			cache[id] = uncached;
			return uncached;
		};
	};
})();
let input = source("input",
	function getValue(id){
		let element = document.getElementById(id);
		return element.value;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.value = value;
	},
	function register(id, onchange){
		let element = document.getElementById(id);
		element.addEventListener("change", onchange);
	},
	function unregister(id, onchange){
		let element = document.getElementById(id);
		element.removeEventListener("change", onchange);
	},
	function dispatch(id, value){
		let event = new Event('change');
		let element = document.getElementById(id);
		element.dispatchEvent(event);
	}
);
let click = source("click",
	function getValue(id, state){
		return state || 0;
	},
	function setValue(id, value, state){
		if(value === true){
			state = (state || 0) + 1;
		}
		else if(typeof value === "number"){
			state = value
		}
		return state;
	},
	function register(id, onchange){
		let element = document.getElementById(id);
		element.addEventListener("click", onchange);
	},
	function unregister(id, onchange){
		let element = document.getElementById(id);
		element.removeEventListener("click", onchange);
	},
	function dispatch(id, value, state){
		let element = document.getElementById(id);
		let event = new Event('click');
		element.dispatchEvent(event);
	},
	function handler(id, state){
		state = (state || 0) + 1;
		return state;
	}
);
let dblclick = source("dblclick",
	function getValue(id, state){
		return state || 0;
	},
	function setValue(id, value, state){
		if(value === true){
			state = (state || 0) + 1;
		}
		else if(typeof value === "number"){
			state = value
		}
		return state;
	},
	function register(id, onchange){
		let element = document.getElementById(id);
		element.addEventListener("dblclick", onchange);
	},
	function unregister(id, onchange){
		let element = document.getElementById(id);
		element.removeEventListener("dblclick", onchange);
	},
	function dispatch(id, value, state){
		let element = document.getElementById(id);
		let event = new Event('dblclick');
		element.dispatchEvent(event);
	},
	function handler(id, state){
		state = (state || 0) + 1;
		return state;
	}
);
let focus = source("focus",
	function getValue(id){
		let element = document.getElementById(id);
		return (element === document.activeElement);
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		if(value){
			element.focus();
		}
		else{
			element.blur();
		}
	},
	function register(id, onchange){
		let element = document.getElementById(id);
		element.addEventListener("focus", onchange);
		element.addEventListener("blur", onchange);
	},
	function unregister(id, onchange){
		let element = document.getElementById(id);
		element.removeEventListener("focus", onchange);
		element.removeEventListener("blur", onchange);
	},
	function dispatch(id, value){
		let event = new Event(value? 'focus': 'blur');
		let element = document.getElementById(id);
		element.dispatchEvent(event);
	}
);
let select = source("select",
	function getValue(id){
		let element = document.getElementById(id);
		if(element !== document.activeElement){
			return "";
		}
		return element.value.substring(element.selectionStart, element.selectionEnd);
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		if(typeof value === "string" && value.length !== 0){
			let start = element.value.indefOf(value);
			if(start >= 0){
				element.selectionStart = start;
				element.selectionEnd = start + value.length;
			}
			else{
				element.selectionStart = 0;
				element.selectionEnd = 0;
			}
		}
		else if(value){
			element.selectionStart = 0;
			element.selectionEnd = element.value.length;
		}
		else{
			element.selectionStart = 0;
			element.selectionEnd = 0;
		}
	},
	function register(id, onchange){
		let element = document.getElementById(id);
		element.addEventListener("select", onchange);
		element.addEventListener("blur", onchange);
	},
	function unregister(id, onchange){
		let element = document.getElementById(id);
		element.removeEventListener("select", onchange);
		element.removeEventListener("blur", onchange);
	},
	function dispatch(id, value){
		let event = new Event('select');
		let element = document.getElementById(id);
		element.dispatchEvent(event);
	}
);
let disabled = source("disabled",
	function getValue(id){
		let element = document.getElementById(id);
		return element.disabled;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.disabled = value;
	}
);
let title = source("title",
	function getValue(id){
		let element = document.getElementById(id);
		return element.title;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.title = value;
	}
);

//todo implement websocket
//todo implement ajax

let guard = function guard(source, handler){
	let name = guard.name + "_" + source.name;
	let names = {
		[name]: function (sink, ...args){
			try{
				let value = pullpush(sink, source, ...args);
				return value;
			}
			catch(error){
				let handled = handler(error);
				return handled;
			}
		},
	};
	return names[name];
};

let sink = pullpush.sink()("minimo", {
	stack: (function(){
		// debugger detection, credit to huiting Chen https://stackoverflow.com/questions/7798748/find-out-whether-chrome-console-is-open/51533164#51533164?newreg=6a6f07fc87ce4756b2d7060fbadcc9ed
		let debugging = false;
		var element = document.createElement('chrome-debugger-detector');
		Object.defineProperty(element, 'id', {
			get: function(){
				debugging = true;
				return "chrome-debugger-is-opened";
			}
		});
		console.log(element);
		return debugging;
	})(),
});

delete pullpush.sink; // prevent using the top level sink
