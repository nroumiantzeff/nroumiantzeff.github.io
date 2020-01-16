/////////////////////////////////////////////////////////////////////////////////////////////
// pullpush minimo library

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
			(pullpush.forcast(sink, delay, callback, delay, begining, end))
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
let trigger = (function(){ //todo implement "limiter" which allows specifying a limite on the number of triggers
	function trigger(sink, source, ...args){
		let value = pullpush(sink, source, ...args);
		let current = pullpush.value(sink);
		if(current === undefined || value === current.value){
			return { trigger: false, value };
		}
		return (pullpush.forcast(sink, 0))
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
//todo toggle (like trigger)
let switcher = (function(){
	function switcher(sink, delay, source, ...args){
		let value = pullpush(sink, source, ...args);
		let current = pullpush.value(sink);
		if(current === undefined || value === current.value){
			return { switcher: false, value };
		}
		return (pullpush.forcast(sink, delay))
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
function local(sink, initial, value){
	if(value === undefined){
		return pullpush.value(sink, initial);
	}
	return (pullpush.forcast(sink, 0, identity, value))
		(pullpush.value(sink, initial));
}
let global = (function(){
	let cache = {};
	return function global(id){
		let cached = cache[id];
			if(cached){
				return cached;
		}
		let name = global.name + "_" + id;
		let named = {
			[name]: function global(sink, value){
				if(value === undefined){
					return pullpush.value(sink);
				}
				return (pullpush.forcast(sink, 0, identity, value))
					(pullpush.value(sink));
			},
		};
		return cache[id] = named[name];
	};
})();
function latest(sources){
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
function all(sources){
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
	return function curry(sink, ...args){
		return source(sink, ...args, arg);
	};
}
function identity(sink, arg){
	return arg;
}
function unit(value){
	// unit :: a -> source a
	let name = typeof value === "function"? value.name: value? value.toString(): "unit";
	let named = {
		[name]: function(sink){
			return value;
		},
	};
	return named[name];
}
function mapl(fAB, sBC){
	// mapl :: (a -> b) -> source b c -> source a c
	let name = "map_" + fAB.name + "_" + sBC.name;
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
	let name = "mapr_" + sAB.name + "_" + fBC.name;
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
	let name = "apl_" + sAfBC.name + "_" + sCD.name;
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
	let name = "apr_" + sAB.name + "_" + sCfBD.name;
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
