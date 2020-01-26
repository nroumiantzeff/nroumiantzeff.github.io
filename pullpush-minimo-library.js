/////////////////////////////////////////////////////////////////////////////////////////////
// pullpush minimo library (no interaction with the DOM)

let stepper = (function(){
	let observers = {};
	function callback(sink, delay, begining, end){
		if(pullpush.registered(sink, observers)){
			return stepper(sink, delay, begining, end);
		}
		else{
			return pullpush.value(sink);
		}
	};
	return function stepper(sink, delay, begining, end){
		let steps = pullpush.value(sink, (begining || 0) - 1) + 1;
		if(delay === undefined || steps >= end){
			return steps;
		}
		return (pullpush.register(sink, observers))
			(pullpush.forcast(sink, undefined, delay, callback, delay, begining, end))
			(steps);
	};
})();
let series = (function(){
	function next(sink, index, f, ...args){
		let value = f(index, pullpush.value(sink), ...args);
		return { index, value };
	};
	return function series(sink, index, f, ...args){
		let value = pullpush(sink, next, index, f, ...args).value;
		if(Array.isArray(value)){
			return value[value.length - 1];
		}
		return value;
	};
})();
function timer(sink, delay, begining, end){
	let time = pullpush.time(sink) + (begining || 0);
	if(time > end){
		return pullpush.value(sink, begining || 0);
	}
	pullpush(sink, stepper, delay);
	return time;
}
function counter(sink, delay, begining, end){
	let count = pullpush.value(sink, begining || 0);
	if(count >= end){
		return end;
	}
	pullpush(sink, stepper, delay);
	return count + 1;
}
let toggle = (function(){
	function toggle(sink, source, ...args){
		let value = pullpush(sink, source, ...args);
		let current = pullpush.value(sink);
		if(current === undefined){
			return { toggle: false, value };
		}
		if(value === current.value){
			return current;
		}
		return { toggle: !current.toggle, value };
	}
	return function(source, ...args){
		let name = toggle.name + "_" + source.name;
		let named = {
			[name]: function(sink, ...args){
				return pullpush(sink, toggle, source, ...args).toggle;
			},
		};
		return named[name];
	};
})();
let trigger = (function(){ //todo implement "limiter" which allows specifying a limite on the number of triggers
	function trigger(sink, source, ...args){
		let value = pullpush(sink, source, ...args);
		let current = pullpush.value(sink);
		if(current === undefined || value === current.value){
			return { trigger: false, value };
		}
		return (pullpush.forcast(sink, undefined, 0, trigger, source, ...args))
			({ trigger: true, value });
	}
	return function(source, ...args){
		let name = trigger.name + "_" + source.name;
		let named = {
			[name]: function(sink, ...args){
				return pullpush(sink, trigger, source, ...args).trigger;
			},
		};
		return named[name];
	};
})();
let switcher = (function(){
	function switcher(sink, delay, source, ...args){
		let value = pullpush(sink, source, ...args);
		let current = pullpush.value(sink);
		if(current === undefined || value === current.value){
			return { switcher: false, value };
		}
		return (pullpush.forcast(sink, undefined, delay, switcher, delay, source, ...args))
			({ switcher: true, value });
	}
	return function(source, delay, ...args){
		let name = switcher.name + "_" + source.name;
		let named = {
			[name]: function(sink, ...args){
				return pullpush(sink, switcher, delay, source, ...args).switcher;
			},
		};
		return named[name];
	};
})();
let lagger = (function(){
	function lagger(sink, source, ...args){
		let value = pullpush(sink, source, ...args);
		return value;
	}
	return function(source, delay, ...args){
		let name = lagger.name + "_" + source.name;
		let named = {
			[name]: function(sink, ...args){
				let value = pullpush.value(sink);
				return (pullpush.forcast(sink, undefined, delay, lagger, source, ...args))
					(value);
			},
		};
		return named[name];
	};
})();
let share = (function(){
	let cache = {};
	return function share(id, source, register, unregister){
		//todo test with a source with observers (for example an input from the framework)
		//todo check that the source has no observers (local source)
		//todo take into account the source, register and unregister as key to the cache (to ensure referential transparency for multiple calls with different arguments but the id)
		let cached = cache[id];
		if(cached){
			return cached;
		}
		let observers = {};
		let name = share.name + "_" + id + "_" + source.name;
		let named = {
			[name]: function(sink, ...args){
				let value = pullpush(sink, source, ...args);
				return (pullpush.register(sink, observers, register, unregister))
					(pullpush.broadcast(sink, observers, value))
					(value);
			},
		};
		return cache[id] = named[name];
	};
})();
function local(sink, initial, value, delay){
	if(value === undefined){
		return pullpush.value(sink, initial);
	}
	return (pullpush.forcast(sink, value, delay))
		(pullpush.value(sink, initial));
}
let global = function(id){
	return share(id, local);
};
function latest(sources){ //todo use spreading if first argument is a function
	function latest(sink){
		if(sources.length > 0){
			let values = sources.map(function(source, index){
				let subsink = sink(index);
				let value = pullpush(subsink, source);
				return { sink: subsink, value };
			});
			values.sort(function(item1, item2){
				return pullpush.sequence(item1.sink, item2.sink);
			});
			return values[values.length - 1].value;
		}
	}
	return latest;
}
function all(sources){ //todo use spreading if first argument is a function
	function earliest(sink){
		let value = pullpush.value(sink);
		let sequences = sources.map(function(source, index){
			return pullpush.sequence(sink(index));
		});
		sequences.sort(function(sequence1, sequence2) {
			return sequence1 - sequence2;
		});
		if(value !== undefined && sequences[0] <= value.latest){
			return value;
		}
		let values = sources.map(function(source, index){
			return pullpush(sink(index), source);
		});
		return { latest: sequences[sequences.length - 1], values: values };
	};
	return function all(sink){
		if(sources.length > 0){
			let value = pullpush(sink, earliest);
			return value.values;
		}
	};
}
function curry(source, arg){
	// curry :: source (a b) c -> a -> source b (source (a b) c)
	let name = curry.name + "_" + source.name;
	let named = {
		[name]: function(sink, ...args){
			return source(sink, arg, ...args);
		},
	};
	return named[name];
}
function identity(sink, arg){
	// identity :: source a a :: source (a b) a
	return arg;
}
function unit(value){
	// unit :: a -> source () a
	let name = typeof value === "function"? value.name: value? value.toString(): unit.name;
	let named = {
		[name]: function(sink){
			return value;
		},
	};
	return named[name];
}
function mapl(fAB, sBC){
	// mapl :: (a -> b) -> source b c -> source a c
	let name = mapl.name + "_" + fAB.name + "_" + sBC.name;
	let named = {
		[name]: function(sink, ...a){
			let b = fAB(...a);
			let c = pullpush(sink, sBC, b);
			return c;
		},
	};
	return named[name];
}
function mapr(sAB, fBC){
	// mapr :: source a b -> (b -> c) -> source a c
	let name = mapr.name + "_" + sAB.name + "_" + fBC.name;
	let named = {
		[name]: function(sink, ...a){
			let b = pullpush(sink, sAB, ...a);
			let c = fBC(b);
			return c;
		},
	};
	return named[name];
}
function apl(sAfBC, sCD, ...a){
	// apl :: source a (b -> c) -> source c d -> source b d
	let name = apl.name + "_" + sAfBC.name + "_" + sCD.name;
	let name1 = sAfBC.name; 
	let name2 = sCD.name !== sAfBC.name? sCD.name: "apl" + sCD.name; 
	let named = {
		[name]: function(sink, ...b){
			let fBC = pullpush(sink(name1), sAfBC, ...a);
			let c = fBC(...b);
			let d = pullpush(sink(name2), sCD, c);
			return d;
		},
	};
	return named[name];
}
function apr(sAB, sCfBD, ...c){
	// apr :: source a b -> source c (b -> d) -> source b d
	let name = apr.name + "_" + sAB.name + "_" + sCfBD.name;
	let name1 = sAB.name; 
	let name2 = sCfBD.name !== sAB.name? sCfBD.name: "apr" + sCfBD.name; 
	let named = {
		[name]: function(sink, ...a){
			let b = pullpush(sink(name1), sAB, ...a);
			let fBD = pullpush(sink(name2), sCfBD, ...c);
			let d = fBD(b);
			return d;
		},
	};
	return named[name];
}
function shuffle(sBC, fAB){
	// shuffle :: source (b) c -> ((a) -> (b)) -> source (a) c
	let name = shuffle.name + "_" + sBC.name + "_" + fAB.name;
	let named = {
		[name]: function(sink, ...a){
			let b = fAB(...a);
			let c = pullpush(sink, sBC, ...b);
			return c;
		},
	};
	return named[name];
}
let reverse = function(source){
	return shuffle(source, function reverse(...args){
		return args.slice().reverse();
	});
};
function shell(source1, source2){
	// shell :: source a b -> source (source a b) b -> source a b
	if(source2 === undefined){
		return source1;
	}
	let name = shell.name + "_" + source1.name + "_" + source2.name;
	let names = {
		[name]: function(sink, ...args){
			return pullpush(sink, source2, source1, ...args);
		},
	};
	return names[name];
}
function shield(source1, source2){
	// shield :: source a b -> source error b -> source a b
	if(source2 === undefined){
		return source1;
	}
	let name = shield.name + "_" + source1.name + "_" + source2.name;
	let names = {
		[name]: function(sink, ...args){
			try{
				return pullpush(sink("handled"), source1, ...args);
			}
			catch(exception){
				return pullpush(sink("handler"), source2, exception);
			}
		},
	};
	return names[name];
}
