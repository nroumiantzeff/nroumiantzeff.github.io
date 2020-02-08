/////////////////////////////////////////////////////////////////////////////////////////////
// pullpush minimo library (no interaction with the DOM)

let stepper = (function(){ //todo rename "counter"
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
let series = (function(){ //todo is it more performant or handier than "deduce" to compute series?
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
		pullpush(sink(stepper.name), false); // declaration to not keep the unused source
		return pullpush.value(sink, begining || 0);
	}
	pullpush(sink(stepper.name), stepper, delay);
	return time;
}
function counter(sink, delay, begining, end){ //todo remove (duplicate of "stepper")
	let count = pullpush.value(sink, begining || 0);
	if(count >= end){
		pullpush(sink(stepper.name), false); // declaration to not keep the unused source
		return end;
	}
	pullpush(sink(stepper.name), stepper, delay);
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
		let name = toggle.name + "~" + source.name;
		let named = {
			[name]: function(sink, ...args){
				return pullpush(sink, toggle, source, ...args).toggle;
			},
		};
		return named[name];
	};
})();
let trigger = (function(){
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
		let name = trigger.name + "~" + source.name;
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
		let name = switcher.name + "~" + source.name;
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
		let value = pullpush(sink(lagger.name), source, ...args);
		return value;
	}
	return function(source, delay, ...args){
		let name = lagger.name + "~" + source.name;
		let named = {
			[name]: function(sink, ...args){
				pullpush(sink(lagger.name), true); // declaration to keep the unused source //todo should sinks used by the forcast callaback be checked for reclaim?
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
		let name = share.name + "~" + id + "~" + source.name;
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
function namer(source, ...names){
	let name = names.map(name => name || source.name).join("~"); 
	let named = {
		[name]: function(sink, ...args){
			return source(sink, ...args);
		},
	};
	return named[name];
}
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
function nth(source, n){
	let values = 0;
	let value = {}; // nonce
	let name = nth.name + "~" + n + "~" + source.name;
	let named = {
		[name]: function(sink, ...args){
			pullpush(sink, false); // declaration to not keep unused sources
			if(n > 0){
				if(values >= n){
					return value;
				}
				let current = pullpush(sink, source, ...args);
				if(current !== value){
					values++;
					value = current;
				}
				if (values >= n){
					return value;
				}
			}
		},
	};
	return named[name];
}
let once = supercomposition(superapposition(namer, "once", ""), superapposition(times, 1)); //todo move to test or reemplement with simpler name
function times(source, n){
	let values = 0;
	let value = {}; // nonce
	let name = times.name + "~" + n + "~" + source.name;
	let named = {
		[name]: function(sink, ...args){
			pullpush(sink, false); // declaration to not keep unused sources
			if(n > 0){
				if(values >= n){
					return value;
				}
				let current = pullpush(sink, source, ...args);
				if(current !== value){
					values++;
					value = current;
				}
				return current;
			}
		},
	};
	return named[name];
}
function clipper(source, n, m){
	let values = 0;
	let value = {}; // nonce
	let name = clipper.name + "~" + n + "~" + m + "~" + source.name;
	let named = {
		[name]: function(sink, ...args){
			pullpush(sink, false); // declaration to not keep unused sources
			if(m > 0 && m >= n){
				if(values >= m){
					return value;
				}
				let current = pullpush(sink, source, ...args);
				if(current !== value){
					value = current;
					values++;
				}
				if(values > n){
					return current;
				}
			}
		},
	};
	return named[name];
}
function skipper(source, n){ //todo use nonce (see "clippper")
	let values = 1;
	let value = undefined;
	let name = skipper.name + "~" + n + "~" + source.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink, source, ...args);
			if(values > n){
				return current;
			}
			if(current !== value){
				value = current;
				values++;
			}
		},
	};
	return named[name];
}
function filter(source, f){
	let last;
	let values = 0;
	let value = {}; // nonce
	let name = filter.name + "~" + source.name + "~" + f.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink, source, ...args);
			if(current !== value){
				value = current;
				values++;
			}
			if(f(current, values)){
				last = current;
				return current;
			}
			return last;
		},
	};
	return named[name];
}
function filterer(source1, source2, ...args2){
	let last;
	let values = 0;
	let value = {}; // nonce
	let name = filterer.name + "~" + source1.name + "~" + source2.name;
	let named = {
		[name]: function(sink, ...args1){
			let current = pullpush(sink("filtered"), source1, ...args1);
			if(current !== value){
				value = current;
				values++;
			}
			if(pullpush(sink("filter"), source2, current, values, ...args2)){
				last = current;
				return current;
			}
			return last;
		},
	};
	return named[name];
}
function reduce(source, f, accumulator){
	let values = 0;
	let value = {}; // nonce
	let name = reduce.name + "~" + source.name + "~" + f.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink, source, ...args);
			if(current !== value){
				value = current;
				values++;
			}
			accumulator = f(accumulator, current, values);
			return accumulator;
		},
	};
	return named[name];
}
function reducer(source1, source2, accumulator, ...args2){
	let values = 0;
	let value = {}; // nonce
	let name = reducer.name + "~" + source1.name + "~" + source2.name;
	let named = {
		[name]: function(sink, ...args1){
			let current = pullpush(sink("reduced"), source1, ...args1);
			if(current !== value){
				value = current;
				values++;
			}
			accumulator = pullpush(sink("reducer"), source2, accumulator, current, values, ...args2);
			return accumulator;
		},
	};
	return named[name];
}
function deduce(source, f, ...accumulators){
	let values = accumulators.slice();
	let index = 0;
	let last = {}; // nonce
	let name = deduce.name + "~" + accumulators.length + "~" + source.name + "~" + f.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink, source, ...args);
			if(current !== last){
				last = current;
				index++;
			}
			let value = f(...values, current, index);
			values.push(value);
			values.shift();
			return value;
		},
	};
	return named[name];
}
function deducer(source1, source2, ...accumulators){
	let values = accumulators.slice();
	let index = 0;
	let last = {}; // nonce
	let name = deduce.name + "~" + accumulators.length + "~" + source1.name + "~" + source2.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink("deduced", source1, ...args);
			if(current !== last){
				last = current;
				index++;
			}
			let value = pullpush(sink("deducer"), source2, ...values, current, index);
			values.push(value);
			values.shift();
			return value;
		},
	};
	return named[name];
}
function induce(source, f, accumulators){
	let values = accumulators.slice();
	let index = 0;
	let last = {}; // nonce
	let name = induce.name + "~" + accumulators.length + "~" + source.name + "~" + f.name;
	let named = {
		[name]: function(sink, ...args){
			let current = pullpush(sink, source, ...args);
			if(current !== last){
				last = current;
				index++;
			}
			let value = f(values, current, index);
			values.push(value);
			values.shift();
			return value;
		},
	};
	return named[name];
}
function inducer(source1, source2, accumulators, ...args2){
	let values = accumulators.slice();
	let index = 0;
	let last = {}; // nonce
	let name = induce.name + "~" + accumulators.length + "~" + source1.name + "~" + source2.name;
	let named = {
		[name]: function(sink, ...args1){
			let current = pullpush(sink, source1, ...args1);
			if(current !== last){
				last = current;
				index++;
			}
			let value = pullpush(sink, source2, values, current, index, ...args2);
			values.push(value);
			values.shift();
			return value;
		},
	};
	return named[name];
}
function latest(...sources){
	let array = (sources.length === 1 && typeof sources[0] !== "function")? sources[0]: sources;
	function latest(sink){
		if(array.length > 0){
			let values = array.map(function(source, index){
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
function all(...sources){
	let array = (sources.length === 1 && typeof sources[0] !== "function")? sources[0]: sources;
	function earliest(sink){
		array.reduce(function(unused, source, index){
			pullpush(sink(index), true); // declaration to keep the unused source
		}, undefined);
		let value = pullpush.value(sink);
		let sequences = array.map(function(source, index){
			return pullpush.sequence(sink(index));
		});
		sequences.sort(function(sequence1, sequence2) {
			return sequence1 - sequence2;
		});
		if(value !== undefined && sequences[0] <= value.latest){
			return value;
		}
		let values = array.map(function(source, index){
			return pullpush(sink(index), source);
		});
		return { latest: sequences[sequences.length - 1], values: values };
	};
	return function all(sink){
		if(array.length > 0){
			let value = pullpush(sink, earliest);
			return value.values;
		}
	};
}
function partial(...sources){
	return function(source){
		let array = (sources.length === 1 && typeof sources[0] !== "function")? sources[0]: sources;
		let array2 = [];
		let total = true;
		let done = false;
		for(let index = 0; index < array.length; index++){
			if(!array[index]){
				if(done){
					array2.push(array[index]);
					total = false;
				}
				else{
					array2.push(source);
					done = true;
				}
			}
			else{
				array2.push(array[index]);
			}
		}
		if(total){
			return composition(...array2);
		}
		return partial(...array2);
	};
}
function curry(source, arg){
	// curry :: source (a b) c -> a -> source b (source (a b) c)
	let name = curry.name + "~" + source.name;
	let named = {
		[name]: function(sink, ...args){
			return source(sink, arg, ...args);
		},
	};
	return named[name];
}
function identity(sink, arg){
	// identity :: source a a
	return arg;
}
function unit(f){
	// unit :: (a -> b) -> source a b
	let name = unit.name + "~" + f.name;
	let named = {
		[name]: function(sink, ...args){
			return f(...args);
		},
	};
	return named[name];
}
function mapl(fAB, sBC){ //todo rename "premap"
	// mapl :: (a -> b) -> source b c -> source a c
	let name = mapl.name + "~" + fAB.name + "~" + sBC.name;
	let named = {
		[name]: function(sink, ...a){
			let b = fAB(...a);
			let c = pullpush(sink, sBC, b);
			return c;
		},
	};
	return named[name];
}
function mapr(sAB, fBC){ //todo rename "map"
	// mapr :: source a b -> (b -> c) -> source a c
	let name = mapr.name + "~" + sAB.name + "~" + fBC.name;
	let named = {
		[name]: function(sink, ...a){
			let b = pullpush(sink, sAB, ...a);
			let c = fBC(b);
			return c;
		},
	};
	return named[name];
}
function mapper(sAB, sBC){
	// mapper :: source a b -> source b c -> source a c
	let name = mapper.name + "~" + sAB.name + "~" + sBC.name;
	let named = {
		[name]: function(sink, ...a){
			let b = pullpush(sink, sAB, ...a);
			let c = pullpush(sink, sBC, b);
			return c;
		},
	};
	return named[name];
}
function apl(sAfBC, sCD, ...a){ //todo rename "preap"
	// apl :: source a (b -> c) -> source c d -> source b d
	let name = apl.name + "~" + sAfBC.name + "~" + sCD.name;
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
function apr(sAB, sCfBD, ...c){ //todo rename "ap"
	// apr :: source a b -> source c (b -> d) -> source b d
	let name = apr.name + "~" + sAB.name + "~" + sCfBD.name;
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
function superimposition(definer, ...args){
	// superimposition :: (source a b -> c -> d -> source a b) -> c -> (source a b -> d -> source a b)
	let name = superimposition.name + "~" + definer.name;
	let named = {
		[name]: function(source, ...args2){
			return definer(source, ...args, ...args2);
		},
	};
	return named[name];
}
function imposition(source, ...args){
	// imposition :: source a b c -> a -> source b c
	let name = imposition.name + "~" + definer.name;
	let named = {
		[name]: function(sink, ...args2){
			return pullpush(sink,  ...args, ...args2);
		},
	};
	return named[name];
}
function apposition(source, ...args){
	// apposition :: source a b c -> b -> source a c
	let name = superapposition.name + "~" + definer.name;
	let named = {
		[name]: function(sink, ...args2){
			return pullpush(sink, ...args2,  ...args);
		},
	};
	return named[name];
}
function superapposition(definer, ...args){
	// superapposition :: (source a b -> c -> d -> source a b) -> d -> (source a b -> c -> source a b) 
	let name = superapposition.name + "~" + definer.name;
	let named = {
		[name]: function(source, ...args2){
			return definer(source, ...args2, ...args);
		},
	};
	return named[name];
}
function composition(...sources){
	// composition :: (source y z) -> (source x y) ... (source b c) -> (source a b) -> source a z
	let array = (sources.length === 1 && typeof sources[0] !== "function")? sources[0]: sources;
	let name = composition.name + "~" + array.map(source => source.name).join("~");
	let named = {
		[name]: function(sink, value){
			return array.slice().reverse().reduce(function(value, source, index){
				return pullpush(sink(index), source, value);
			}, value);
		},
	};
	return named[name];
}
function supercomposition(...definers){
	// supercomposition :: (source w x -> source y z) -> (source u v -> source w x) ... (source c d -> source e f) -> (source a b -> source c d) -> (source a b -> source y z)
	let array = (definers.length === 1 && typeof definers[0] !== "function")? definers[0]: definers;
	let name = supercomposition.name + "~" + array.map(item => item.name).join("~");
	let named = {
		[name]: function(source){
			return array.slice().reverse().reduce(function(source, definer){
				return definer(source);
			}, source);
		},
	};
	return named[name];
}
function chain(source, ...args){
	// chain :: source a ((source (b a) c) -> ((source (d c) e) -> ... ((source (y x) z) -> (() -> z))))
	let sources = [ { source, args } ];
	return function link(source, ...args){
		if(source === undefined){
			let name = chain.name + "~" + sources.map(item => item.source.name).join("~");
			let named = {
				[name]: function(sink, value){
					return sources.reduce(function(value, item, index){
						return pullpush(sink(index), item.source, ...item.args, value);
					}, value);
				},
			};
			return named[name];
		}
		sources.push({ source, args });
		return link;		
	};
}
function shuffle(sBC, fAB){
	// shuffle :: source (b) c -> ((a) -> (b)) -> source (a) c
	let name = shuffle.name + "~" + sBC.name + "~" + fAB.name;
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
	let name = shell.name + "~" + source1.name + "~" + source2.name;
	let names = {
		[name]: function(sink, ...args){
			return pullpush(sink, source2, source1, ...args);
		},
	};
	return names[name];
}
function shield(source1, source2, ...args2){
	// shield :: source a b -> source error b -> source a b :: source a b -> source (error c) b -> c -> source a b
	if(source2 === undefined){
		return source1;
	}
	let name = shield.name + "~" + source1.name + "~" + source2.name;
	let names = {
		[name]: function(sink, ...args1){
			pullpush(sink("handler"), false); // declaration to not keep unused source
			try{
				return pullpush(sink("handled"), source1, ...args1);
			}
			catch(exception){
				return pullpush(sink("handler"), source2, exception, ...args2);
			}
		},
	};
	return names[name];
}
