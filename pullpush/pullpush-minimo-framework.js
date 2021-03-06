////////////////////////////////////////////////////////////////
// pullpush minimo framework

let sourcer = (function(){
	return function sourcer(type, getValue, setValue, register, unregister, dispatch, handler){
		let cache = {};
		return function sourcer(id, value){
			let cached = cache[id || ""];
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
			let name = type + "~" + (id || "");
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
			cache[id || ""] = uncached;
			return uncached;
		};
	};
})();
let input = sourcer("input",
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
let click = sourcer("click",
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
let dblclick = sourcer("dblclick",
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
let focus = sourcer("focus",
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
let select = sourcer("select",
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
let disabled = sourcer("disabled",
	function getValue(id){
		let element = document.getElementById(id);
		return element.disabled;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.disabled = value;
	}
);
let title = sourcer("title",
	function getValue(id){
		let element = document.getElementById(id);
		return element.title;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.title = value;
	}
);
let text = sourcer("text",
	function getValue(id){
		let element = document.getElementById(id);
		return element.textContent;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.textContent = value;
		return element.textContent;
	}
);
let html = sourcer("html", //todo remove for security reasons (script injection) and implement a more secure source "subnodes" to change the DOM nodes (passing an object describing the subnodes with whitelisted node attributes) 
	function getValue(id){
		let element = document.getElementById(id);
		return element.innerHTML;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.innerHTML = value;
		return element.innerHTML;
	}
);
let src = sourcer("src",
	function getValue(id){
		let element = document.getElementById(id);
		return element.src;
	},
	function setValue(id, value){
		let element = document.getElementById(id);
		element.src = value;
	}
);
let load = sourcer("load",
	function getValue(id, state){
		return state;
	},
	function setValue(id, value, state){
		// triggering a load event is not allowed
		return state;
	},
	function register(id, onchange){
		let element = id? document.getElementById(id): window;
		element.addEventListener("load", onchange);
	},
	function unregister(id, onchange){
		let element = id? document.getElementById(id): window;
		element.removeEventListener("error", onchange);
	},
	function dispatch(id, value, state){
		let element = id? document.getElementById(id): window;
		let event = new Event('load', state);
		element.dispatchEvent(event);
	},
	function handler(id, state, event){
		state = event.type + ((event.target && event.target.src)? (": " + event.target.src): "");
		return state;
	}
);
let error = sourcer("error",
	function getValue(id, state){
		return state;
	},
	function setValue(id, value, state){
		if(id){
			// raising an error on an element is not allowed (except on the window element)
			return state;
		}
		if(value !== undefined){
			state = value;
		}
		return state;
	},
	function register(id, onchange){
		let element = id? document.getElementById(id): window;
		element.addEventListener("error", onchange);
	},
	function unregister(id, onchange){
		if(id){
			let element = document.getElementById(id);
			element.removeEventListener("error", onchange);
		}
		// note: do not unregister window error event listener (typically undeclared sinks used after the exception are dropped which unregisters the handlers of their observed sinks if there are no other observers left)
	},
	function dispatch(id, value, state){
		let element = id? document.getElementById(id): window;
		let error = Error.prototype.isPrototypeOf(state)? state: new Error(state);
		let event = new ErrorEvent("error", error);
		element.dispatchEvent(event);
	},
	function handler(id, state, event){
		state = event.message? event.message: event.type + ((event.target && event.target.src)? (": " + event.target.src): ""); //todo should be more generic in case event.message is not available (typically for img elements)
		return state;
	}
);
let message = sourcer("message",
	function getValue(id, state){
		return state;
	},
	function setValue(id, value, state){
		if(value !== undefined){
			state = value;
		}
		return state;
	},
	function register(id, onchange){
		let element = id? document.getElementById(id): window; //todo support other window objects (opener, open, frames, parent...)
		element.addEventListener("message", onchange);
	},
	function unregister(id, onchange){
		let element = id? document.getElementById(id): window; //todo support other window objects (opener, open, frames, parent...)
		element.removeEventListener("message", onchange);
	},
	function dispatch(id, value, state){
		let element = id? document.getElementById(id): window; //todo support other window objects (opener, open, frames, parent...)
		element.postMessage(state, "*"); //todo do not specify "*" as the targetOrigin for security reasons
	},
	function handler(id, state, event){
		//todo check security attributes
		state = event.data;
		return state;
	}
);

//todo implement websocket
//todo implement ajax
//todo implement indexBD and/or web storage

let sink = pullpush.sink();