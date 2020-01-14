let pullpush = (function(){
	"use strict";
	let $$time = Date.now();
	let $$timeStamp = undefined;
	let $$sequence = 0;
	let $$sinks = 0;
	let $$sink0 = undefined; // universal sink (top level) 
	let $$sink = undefined; // currently processed sink
	let $$registers = Symbol("pullpushregisters");
	let $$register = Symbol("pullpushregister");
	let $$unregister = Symbol("pullpushunregister");
	function pullpush(sink, source, ...args){
		//todo refactor using subfunctions so that debugging steps on essetial code only
		let $sink = sink($$safe);
		if($sink.sink === undefined || !$sink.pullpushable){
			$sink = $sink.safe(source.name)($$safe); // generate a sink automatically (using the function name)
		}
		$sink.pullpushable = false;
		checkDuplicates($sink);
		$sink.duplicates = undefined;
		if($sink.source === undefined || !equals(args, $sink.args)){
			if($sink.source === undefined){
				// note: use the source declared first ignoring sources declared afterwards (theoriticaly, functions could be laysilly evaluated by an optimized javascript implementation)
				$sink.source = source;
			}
			$sink.args = args;
			$sink.sequence = $$sequence;
			$$timeStamp = undefined;
			update($sink, pull($sink, $sink.source, ...$sink.args));
		}
		$sink.duplicates = undefined;
		return $sink.value;
	}
	function pull($sink, source, ...args){
		$sink.nonce = { handlers: 0 };
		let current = $$sink;
		$$sink = $sink;
		let value = source($$safe($sink), ...args); // immutability: $$safe($sink) ensures that the first argument passed to $sink.source is different from previous calls
		$$sink = current;
		checkSources($sink);
		let result = handlerValue($sink.nonce, value);
		if($sink.nonce.handlers > 0){
			warning('17: pullpush.forcast and pullpush.register should not be called outside the return chain. Consider using the following syntax: return (pullpush.forcast(sink, 0))(value)', $sink);

		}
		if(result === $sink.nonce){
			warning('18: no value specified in the returned chain. Note: even an undefined value must be explicitly specified in this case, for example: return (pullpush.forcast(sink, 0))()', $sink);
			return;
		}
		return result;
	}
	function push(sink, value, force){
		let $sinks = [];
		let $sink = sink($$safe);
		if(value !== $sink.value){
			update($sink, value);
			if(force){
				$sink.currentValue = $sink.value;
			}
			$sink.sequence = $$sequence;
			$sinks.push($sink);
		}
		pushSourcesInTopologicalOrder($sinks);
		return value;
	}
	function event(event, observers, value){
		// observers is an object (maybe a static function) registered using pullpush.register (a keys is a sink index and the associated value is the corresponding sink)
		checkEvent(event);
		$$time = Date.now();
		$$sequence++;
		let $sinks = [];
		for(let index in observers){
			let $sink = observers[index]($$safe);
			if(value !== $sink.value){
				update($sink, value);
				$sink.sequence = $$sequence;
				$sinks.push($sink);
			}
		}
		pushSourcesInTopologicalOrder($sinks);
		return value;
	}
	function checkEvent(event){
		if(event === undefined){
			// pseudo-event
			//todo check that no pseudo-event or real-event has not been checked yet in the same event loop step
			//todo check that pullpush has not been called yet in the same event loop step
			return true;
		}
		if(!(event instanceof Event)){
			warning('3: invalid event argument in pullpush.event call');
		}
		if(event.eventPhase === 0){
			warning('4: stale event argument in pullpush.event call');
		}
		if(!event.isTrusted){ //todo check $$timeStamp even for trusted events
			if($$timeStamp === undefined || event.timeStamp < $$timeStamp){
				warning('5: stale programmatic event argument in pullpush.event call');			}
		}
		//todo check that a previous real-event nor pseudo-event has not been checked yet in the same event loop step
		//todo check that pullpush has not been called yet in the same event loop step
	}
	function pushSourcesInTopologicalOrder($sinks){
		if($sinks.length !== 0){
			// note: use topological order so that a source that uses a specific source multiple time (directly or indirectly) is only computed once
			let sourcesCounts = countSources($sinks);
			pushSources($sinks, sourcesCounts);
		}
	}
	function countSources($sinks){
		let sourcesCounts = {};
		for(let index = 0; index < $sinks.length; index++){
			let $sink = $sinks[index];
			let $parent = $sink.sink;
			while($parent){
				let sourcesCount = sourcesCounts[$parent.index];
				if(sourcesCount !== undefined){
					sourcesCounts[$parent.index] = sourcesCount + 1;
					break;
				}
				else{
					sourcesCounts[$parent.index] = 1;
					$parent = $parent.sink;
				}
			}
		}
		return sourcesCounts;
	}
	function pushSources($sinks, sourcesCounts){
		for(let index = 0; index < $sinks.length; index++){
			let $sink = $sinks[index];
			let $parent = $sink.sink;
			while($parent){
				let sourcesCount = sourcesCounts[$parent.index];
				if(sourcesCount > 1){
					sourcesCounts[$parent.index] = sourcesCount - 1;
					break;
				}
				else{
					if(!pushSource($parent))
					{
						break;
					}
					if($parent.sink && $parent.sink.index === 0){
						warning('14: caution: the root sink is never pushed: top level pullpush call with id "' + $parent.id + '" should always return undefined instead of ' + typeof $parent.value + ' "' + $parent.value + '"', $parent);
					}
					$parent = $parent.sink;
				}
			}			
		}
		return sourcesCounts;
	}
	function pushSource($sink){
		$sink.duplicates = undefined;
		let value = pull($sink, $sink.source, ...$sink.args);
		$sink.duplicates = undefined;
		if(value === $sink.value){
			return false;
		}
		update($sink, value);
		$sink.sequence = $$sequence;
		return true;
	}
	function update($sink, value){
		if($sink.currentSequence === undefined || $$sequence > $sink.currentSequence){
			$sink.currentValue = $sink.value;
			$sink.currentSequence = $$sequence;
		}
		$sink.value = value;
		return value;
	}
	let $debugging = (function(){
		// debugger detection
		// credit to huiting Chen https://stackoverflow.com/questions/7798748/find-out-whether-chrome-console-is-open/51533164#51533164?newreg=6a6f07fc87ce4756b2d7060fbadcc9ed
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
	})();
	function generateSink($sink, id){
		let $parent = $sink;
		if($parent && $parent.index !== 0 && $parent.source === undefined){
			warning('16: invalid sink("' + $parent.id + '")("' + id + '"): only one level of id is allowed per pullpush call', $parent);
		}
		$sink = $parent? $parent.sources[id]: undefined;
		if(!$sink){
			$sink = {
				index: $$sinks++,
				sink: $parent,
				id: id,
				source: undefined,
				args: undefined,
				value: undefined,
				currentValue: undefined,
				time: $$time,
				sequence: $$sequence,
				currentSequence: undefined,
				timer: undefined,
				skips: 0,
				sources: {},
				resources: {}, // refreshed sources, used clean sources by comparing sources and resources
				registers: {},
				stack: $debugging? Error().stack: undefined,
			};
			$$safe($sink);
			if($parent){
				$parent.sources[id] = $sink;
			}
		}
		if($parent){
			$parent.resources[id] = true;
		}
		$sink.pullpushable = true;
		return $sink.safe;
	}
	function $$safe($sink){ //todo safer mechanism to protect $sink: use a nonce (global $$nonce which changes before each call to sink($$safe))
		if(!$sink.safe || $sink.sequence !== $$sequence){ // note: do not call pullpush with the same $sink.safe argument for different $$sequence values
			let name = "sink" + $sink.index;
			let named = {
				[name]: function(id, source, ...args){
					if(id === $$safe){
						return $sink;
					}
					return generateSink($sink, id, source, ...args);
				},
			};
			$sink.safe = named[name]; 
		}
		return $sink.safe;
	}
	function sink(){ // universal sink (top level)
		if($$sink0 == undefined){
			$$sink0 = generateSink(undefined, "")($$safe);
		}
		return $$safe($$sink0);
	}
	function equals(args1, args2){
		if(args1.length !== args2.length){
			return false;
		}
		for(let index = args1.length - 1; index >= 0; index--){
			if(args1[index] !== args2[index]){ // requirement: reference-equality implies deep-equality (either use an immutability library or use simple type arguments only)
				if(!Number.isNaN(args1[index]) || !Number.isNaN(args2[index])){ // cope with javascript perculiarity: NaN !== NaN
					return false;
				}
			}
		}
		return true;
	}
	function checkSources($sink){
		for(let id in $sink.sources){
			if($sink.resources[id] !== true){
				let $source = $sink.sources[id];
				unregister($source);
				delete $sink.sources[id];
			}
		}
		$sink.resources = {};
	}
	function checkDuplicates($sink){
		let $parent = $sink.sink;
		if($parent){
			if($parent.duplicates === undefined){
				$parent.duplicates = {};
			}
			if($parent.duplicates[$sink.id]){
				if($sink.id){
					warning('1: pullpush should not be called twice with the same sink as first argument: consider specifying an explicite localy unique id argument in sink("' + $sink.id + '")', $sink);
				}
				else{
					warning('2: pullpush should not be called twice with the same sink as first argument and anonymous functions as second argument: consider specifying named functions as second argument to pullpush', $sink);
				}
			}
			else{
				$parent.duplicates[$sink.id] = true;
			}
		}
	}
	function handlerValue(nonce, value){
		if(typeof value === "function" && value.name === "pullpushreturnedvalue"){
			return value(nonce);
		} 
		return value;
	}
	function handlerChain(nonce, handler1, sink, ...args){
		// syntax #1 (head of the chain and any other link): handler1(sink, ...args) -> undefined, handlerChain(nonce, handler1, sink, ...args) -> handler, handler(nonce) -> undefined
		// syntax #2 (chaining two links in the middle of the chain): handler1(nonce) -> undefined, handler2(nonce) -> undefined, handlerChain(nonce, handler1, handler2) -> handler(nonce) -> undefined
		// syntax #3 (specifying a value at the tail of the chain): handler1(nonce) -> undefined, handlerChain(nonce, handler1, value) -> handler(nonce) -> value
		let handler = function pullpushreturnedvalue(value){
			if(value !== nonce){
				return handlerChain(nonce, handler, value);
			}
			if(typeof handler1 === "function" && handler1.name === pullpushreturnedvalue.name){
				handler1(value);
				let handler2 = sink;
				if(typeof handler2 === "function" && handler2.name === pullpushreturnedvalue.name){
					return handler2(value);
				}
				return handler2;
			}
			nonce.handlers--;
			return handler1(nonce, sink, ...args);
		};
		return handler;
	}
	function forcast(sink, delay, source, ...args){
		if(delay ===  Number.POSITIVE_INFINITY){
			return; // forcast does nothing for infinite delay
		}
		let $sink = sink($$safe);
		if(delay === undefined){
			warning('19: missing delay argument in pullpush.forcast(sink, delay, source, ...args) where only source argument is optional', $sink);
		}
		if(typeof delay!== "number" || delay < 0 || delay > Number.MAX_SAFE_INTEGER){
			warning('20: invalid delay argument ' + delay + ' in pullpush.forcast(sink, delay, source, ...args)', $sink);
		}
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			let $nonce = $sink.nonce;
			$nonce.handlers++;
			return handlerChain($nonce, forcastHandler, sink, delay, source, args);
		}
		warning('6: incorrect sink argument in pullpush.forcast call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function forcastHandler(nonce, sink, delay, source, args){
		let $sink = sink($$safe);
		if($sink.timer !== undefined){
			clearTimeout($sink.timer);
			if(++$sink.skips > 1000){
				$sink.skips = 0;
				warning('15: pullpush.forcast calls on sink with id "' + $sink.id + '" seem to be endlessly skipped: consider slowing down the rate of the source change', $sink);
			}
		}
		else{
			$sink.skips = 0;
		}
		$sink.timer = setTimeout(forcastCallback, delay, sink, source, args);
		return nonce;
	}
	function forcastCallback(sink, source, args){
		$$time = Date.now();
		$$sequence++;
		$$timeStamp = (new Event("custom")).timeStamp;
		let $sink = sink($$safe);
		$sink.timer = undefined;
		let value = pull($sink, source || $sink.source, ...(source? args: $sink.args));
		if(value !== $sink.value){
			push(sink, value, true);
		}
	}
	function register(sink, observers, register, unregister){
		let $sink = sink($$safe);
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			let $nonce = $sink.nonce;
			$nonce.handlers++;
			return handlerChain($nonce, registerHandler, sink, observers, register, unregister);
		}
		warning('7: incorrect sink argument in pullpush.register call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function registerHandler(nonce, sink, observers, register, unregister){
		if(observers[$$registers] === undefined){
			observers[$$registers] = 0;
			observers[$$register] = register;
			observers[$$unregister] = unregister;
			if(register && !unregister){
				register();
			}
		}
		let $sink = sink($$safe);
		if(!$sink.registered){
			$sink.registered = true;
			let index = $sink.index;
			if(observers[index] === undefined){
				observers[index] = sink;
				if(observers[$$registers]++ === 0 && register && unregister){
					register();
				}
				while($sink){
					$sink.registers[index] = observers;
					$sink = $sink.sink;
				}
			}
		}
		return nonce;
	}
	function unregister($sink){
		for(let index in $sink.registers){
			let observers = $sink.registers[index];
			if(observers){
				if(observers[index] !== undefined){
					delete observers[index];
					if(--observers[$$registers] === 0){
						let unregister = observers[$$unregister];
						if(unregister !== undefined){
							unregister();
						}
					}
					let $parent = $sink.sink;
					while($parent){
						delete $parent.registers[index];
						$parent = $parent.sink;
					}
				}
			}
		}
	}
	function registered(sink, observers){
		let $sink = sink($$safe);
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			return observers[$sink.index] !== undefined;
		}
		warning('8: incorrect sink argument in pullpush.registered call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function value(sink, defaultValue){
		let $sink = sink($$safe);
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			let currentValue = ($$sequence > $sink.currentSequence)? $sink.value: $sink.currentValue;
			return currentValue !== undefined? currentValue: defaultValue;
		}
		warning('9: incorrect sink argument in pullpush.value call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function id(sink){
		let $sink = sink($$safe);
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			return $sink.id;
		}
		warning('10: incorrect sink argument in pullpush.id call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function time(sink){
		let $sink = sink($$safe);
		if($$sink === $sink || $$sink === $sink.sink){ // sink locality
			return $$time - $sink.time;
		}
		warning('11: incorrect sink argument in pullpush.time call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function sequence(sink1, sink2){
		let $sink1 = sink1($$safe);
		if($$sink === $sink1 || $$sink === $sink1.sink){ // sink locality
			if(sink2 === undefined){
				return $sink1.sequence;
			}
			let $sink2 = sink2($$safe);
			if($$sink === $sink2 || $$sink === $sink2.sink){ // sink locality
				return $sink1.sequence - $sink2.sequence;
			}
			warning('12: incorrect sink second argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink2);
		}
		warning('13: incorrect sink first argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink1);
	}
	function stack(sink, all, debug){
		let $sink = sink($$safe);
		let levels = [];
		while($sink){
			if(debug && $sink.stack){
				levels.push($sink.id + ": " + ($sink.stack).replace(/^.*\n/, "\n"));
			}
			else{
				levels.push($sink.id);
			}
			$sink = all && $sink.sink;
		}
		return levels.join("\n");
	}
	let $onwarning = undefined;
	function warning(message, $sink){
		if(typeof $onwarning === "function"){
			setTimeout($onwarning, 0, message);
		}
		if($sink){
			throw "pullpush warning " + message + "\n" + stack($sink.safe, true, true);
		}
		throw "pullpush warning " + message;
	}
	function onwarning(handler){
		if(typeof handler === "function"){
			if($onwarning === undefined){
				$onwarning = handler;
			}
			else{
				$onwarning = (function(handler1, handler2){
					return function(message){
						handler1(message);
						handler2(message);
					};
				})($onwarning, handler);
			}
		}
	};
	pullpush.onwarning = onwarning;
	pullpush.sink = sink;
	pullpush.forcast = forcast;
	pullpush.register = register;
	pullpush.registered = registered;
	pullpush.event = event;
	pullpush.value = value;
	pullpush.time = time;
	pullpush.sequence = sequence;
	pullpush.id = id;
	pullpush.stack = stack;
	return pullpush;
})();
