//todo rename to pullpushEngine.js (more distinguishing whensearching the web than pullpush.js)
//todo point to the documentation
//todo copyright 
let pullpush = (function(){
	"use strict";
	let $$time = Date.now();
	let $$timeStamp = undefined;
	let $$sequence = 0;
	let $$sinks = 0;
	let $$sink0 = undefined; // universal sink (top level) 
	let $$sink = undefined; // currently processed sink
	let $$nonce = undefined; // safe access to the private properties of a sink
	let $$pulls = 0; // levels of pulling
	let $$stack = [null]; // pullpush call stack to check the consistecy of $sink.level
	let $$options = { stack: false, lock: false, }; // default sink options
	let $$none = Symbol("none");
	let $$registers = Symbol("pullpushregisters");
	let $$register = Symbol("pullpushregister");
	let $$unregister = Symbol("pullpushunregister");
	function pullpush(sink, source, ...args){
		//todo refactor using subfunctions so that debugging steps on essetial code only
		// note: source may be undefined: declaration only (to keepalive the source for the sink)
		let declaration = source === undefined;
		let $sink = sink(nonce());
		if($sink.sink === undefined || !$sink.pullpushable){
			if(declaration){
				warning('21: pullpush should not be called with an undefined source argument directly on the current sink: consider passing an explicit id argument to the sink for source declaration or pass an explicit source argument for actual source access', $sink);
			}
			$sink = $sink.safe(source.name)(nonce()); // generate a sink automatically (using the function name)
		}
		checkDuplicates($sink, declaration); // if declaration: no duplicate check
		if(declaration){
			return;
		}
		$sink.pullpushable = false;
		if($sink.source === undefined || !equals(args, $sink.args)){
			if($sink.source === undefined){
				// note: use the source declared first ignoring sources declared afterwards (theoriticaly, functions could be laysily evaluated by an optimized javascript implementation)
				$sink.source = source;
			}
			$sink.args = args;
			$sink.sequence = $$sequence;
			$$timeStamp = undefined;
			if($$stack.length !== 0){
				if($$stack[$$stack.length - 1] === null){
					$$stack[$$stack.length - 1] = $sink;
				}
				else if($sink.level !== $$stack[$$stack.length - 1].level){
					warning('23: inconsistent sink level (' + $sink.level + ' instead of ' + $$stack[$$stack.length - 1].level + '): consider not using sink("' + $$stack[$$stack.length - 1].id + '") nor sink("' + $sink.id + '") as argument to several pullpush calls', $sink);
				}
			}
			$$stack.push(null);
			$$pulls++;
			$sink.duplicates = undefined;
			try{
				update($sink, pull($sink, $sink.source, ...$sink.args));
			}
			finally{
				$sink.duplicates = undefined;
				$$pulls--;
				$$stack.length--;
			}
		}
		if($sink.error !== $$none){
			throw $sink.error;
		}
		return $sink.value;
	}
	function pull($sink, source, ...args){
		$sink.nonce = { handlers: 0 };
		$sink.error = $$none; 
		let current = $$sink;
		$$sink = $sink;
		let value;
		try{
			value = source($$safe($sink), ...args); // immutability: $$safe($sink) ensures that the first argument passed to $sink.source is different from previous calls
		}
		catch(exception){
			$sink.error = exception;
		}
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
		if($sink.error !== $$none){
			if($$pulls > 0){
				throw $sink.error;
			}
		}
		return result;
	}
	function push(sink, value, force){
		let $sink = sink(nonce());
		let $sinks = [];
		if(value !== $sink.value || $sink.error !== $$none){
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
		$$pulls = 0;
		$$stack = [];
		let $sinks = [];
		for(let index in observers){
			let $sink = observers[index](nonce());
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
		if(!(event instanceof Event)){
			warning('3: invalid event argument in pullpush.event call');
		}
		if(event.eventPhase === 0){
			warning('4: stale event argument in pullpush.event call');
		}
		if(!event.isTrusted){ //todo check $$timeStamp even for trusted events
			if($$timeStamp === undefined || event.timeStamp < $$timeStamp){
				warning('5: stale programmatic event argument in pullpush.event call');
			}
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
					if($parent.sink.index === 0){
						if($parent.error !== $$none){
							throw $parent.error;
						}
						if($parent.value !== undefined){
							warning('14: caution: the root sink is never pushed: top level pullpush call with id "' + $parent.id + '" should always return undefined instead of ' + typeof $parent.value + ' "' + $parent.value + '"', $parent);
						}
						warning('24: pullpush internal error (the top level sink is nerver pushed)', $parent); // note: never should have landed here
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
		if(value === $sink.value && $sink.error === $$none){
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
	function generateSink($sink, id, options){
		let $parent = $sink;
		if($parent && $parent.index !== 0 && $parent.source === undefined){
			warning('16: invalid sink("' + $parent.id + '")("' + id + '"): only one level of id is allowed per pullpush call', $parent);
		}
		$sink = $parent? $parent.sources[id]: undefined;
		if(!$sink){
			let level = $parent? $parent.level + 1: 0;
			let overriden = overrideOptions($parent, options);
			$sink = {
				index: $$sinks++,
				level: level,
				sink: $parent,
				id: id,
				options: overriden,
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
				stack: overriden.stack? Error().stack: undefined,
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
	function nonce(){
		return $$nonce = {};
	}
	function $$safe($sink){
		if(!$sink.safe || $sink.sequence !== $$sequence){ // note: do not call pullpush with the same $sink.safe argument for different $$sequence values
			let name = "sink" + $sink.index;
			let named = {
				[name]: function(id, options){
					if(id === $$nonce){
						return $sink;
					}
					return generateSink($sink, id, options);
				},
			};
			$sink.safe = named[name]; 
		}
		return $sink.safe;
	}
	function overrideOption(options, overriden, name, value){
		if(options === overriden){
			overriden = {};
			for(let key in options){
				overriden[key] = options[key];
			}
		}
		overriden[name] = value;
		return overriden;
	}
	function overrideOptions($sink, override){
		let options = $sink? $sink.options: $$options;
		if(override === undefined || options.lock){
			return options;
		}
		let overriden = options;
		for(let name in override){
			if(override[name] !== options[name]){
				overriden = overrideOption(options, overriden, name, override[name]);
			}
		}
		return overriden;
	}
	function sink(){ // universal sink (top level)
		if($$sink0 == undefined){
			$$sink0 = generateSink(undefined, "")(nonce());
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
	function checkDuplicates($sink, declaration){
		let $parent = $sink.sink;
		if($parent){
			if($parent.duplicates === undefined){
				$parent.duplicates = {};
			}
			let duplicate = $parent.duplicates[$sink.id];
			if(declaration){
				if(duplicate === undefined && $sink.id){
					$parent.duplicates[$sink.id] = 1; // simple declaration
				}
			}
			else{
				if(duplicate === 2){
					if($sink.id){
						warning('1: pullpush should not be called twice with the same sink as first argument: consider specifying an explicite localy unique id argument in sink("' + $sink.id + '")', $sink);
					}
					else{
						warning('2: pullpush should not be called twice with the same sink as first argument and anonymous functions as second argument: consider specifying named functions as second argument to pullpush', $sink);
					}
				}
				else{
					$parent.duplicates[$sink.id] = 2;
				}
			}
		}
	}
	function handlerValue($nonce, value){
		if(typeof value === "function" && value.name === "pullpushreturnedvalue"){
			return value($nonce);
		} 
		return value;
	}
	function handlerChain($nonce, handler1, sink, ...args){
		// syntax #1 (head of the chain and any other link): handler1(sink, ...args) -> undefined, handlerChain($nonce, handler1, sink, ...args) -> handler, handler($nonce) -> undefined
		// syntax #2 (chaining two links in the middle of the chain): handler1($nonce) -> undefined, handler2($nonce) -> undefined, handlerChain($nonce, handler1, handler2) -> handler($nonce) -> undefined
		// syntax #3 (specifying a value at the tail of the chain): handler1($nonce) -> undefined, handlerChain($nonce, handler1, value) -> handler($nonce) -> value
		let handler = function pullpushreturnedvalue(value){
			if(value !== $nonce){
				return handlerChain($nonce, handler, value);
			}
			if(typeof handler1 === "function" && handler1.name === pullpushreturnedvalue.name){
				handler1(value);
				let handler2 = sink;
				if(typeof handler2 === "function" && handler2.name === pullpushreturnedvalue.name){
					return handler2(value);
				}
				return handler2;
			}
			$nonce.handlers--;
			return handler1($nonce, sink, ...args);
		};
		return handler;
	}
	function forcast(sink, value, delay, source, ...args){
		let $sink = sink(nonce());
		if(delay === undefined){
			delay = 0;
		}
		else{
			if(typeof delay !== "number"){
				warning('20: invalid delay argument ' + delay + ' in pullpush.forcast(sink, value, delay, source, ...args)', $sink);
			}
		}
		if(value !== undefined && source !== undefined){
			warning('19: value argument in pullpush.forcast(sink, value, delay, source, ...args) is ignored when the source argument is specified: consider calling either pullpush.forcast(sink, value, delay) or pullpush.forcast(sink, undefined, delay, source, ...args)', $sink);
		}
		if($$sink === $sink){ // sink locality
			let $nonce = $sink.nonce;
			$nonce.handlers++;
			return handlerChain($nonce, forcastHandler, sink, value, delay, source, args);
		}
		warning('6: incorrect sink argument in pullpush.forcast call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function forcastHandler($nonce, sink, value, delay, source, args){
		let $sink = sink(nonce());
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
		if(delay >= 0 && delay !==  Number.POSITIVE_INFINITY && delay <= Number.MAX_SAFE_INTEGER){
			$sink.timer = setTimeout(forcastCallback, delay, sink, value, source, args);
		}
		else{
			// forcast does nothing for negative or infinite delay
			$sink.timer = undefined;
		}
		return $nonce;
	}
	function forcastCallback(sink, value, source, args){
		$$time = Date.now();
		$$sequence++;
		$$timeStamp = (new Event("custom")).timeStamp;
		$$pulls = 0;
		$$stack = [];
		let $sink = sink(nonce());
		$sink.timer = undefined;
		if(source !== undefined){
			value = pull($sink, source, ...args);
		}
		if(value !== $sink.value || $sink.error !== $$none){
			push(sink, value, true);
		}
	}
	function broadcast(sink, observers, value){
		//todo check that the observers have not accessed the old value in the same javascript queue loop
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			let $nonce = $sink.nonce;
			$nonce.handlers++;
			return handlerChain($nonce, broadcastHandler, sink, observers, value);
		}
		warning('22: incorrect sink argument in pullpush.broadcast call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function broadcastHandler($nonce, sink, observers, value){
		//todo make sure that the broadcast and register handlers are always executed in the same order (note: forcast handler is always executed after all others because of setTimeout)
		if($$pulls === 0){ // note: only broadcast when pushing (not pulling)
			let $sink = sink(nonce());
			if(value !== $sink.value){
				let $sinks = [];
				for(let index in observers){
					let $observer = observers[index](nonce());
					if(value !== $observer.value){
						update($observer, value);
						$observer.sequence = $$sequence;
						$sinks.push($observer);
					}
				}
				pushSourcesInTopologicalOrder($sinks);
			}
		}
		return $nonce;
	}
	function register(sink, observers, register, unregister){
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			let $nonce = $sink.nonce;
			$nonce.handlers++;
			return handlerChain($nonce, registerHandler, sink, observers, register, unregister);
		}
		warning('7: incorrect sink argument in pullpush.register call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function registerHandler($nonce, sink, observers, register, unregister){
		if(observers[$$registers] === undefined){
			observers[$$registers] = 0;
			observers[$$register] = register;
			observers[$$unregister] = unregister;
			if(register && !unregister){
				register();
			}
		}
		let $sink = sink(nonce());
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
		return $nonce;
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
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return observers[$sink.index] !== undefined;
		}
		warning('8: incorrect sink argument in pullpush.registered call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function value(sink, defaultValue){
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			let currentValue = ($$sequence > $sink.currentSequence)? $sink.value: $sink.currentValue;
			return currentValue !== undefined? currentValue: defaultValue;
		}
		warning('9: incorrect sink argument in pullpush.value call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function id(sink){
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return $sink.id;
		}
		warning('10: incorrect sink argument in pullpush.id call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function time(sink){
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return $$time - $sink.time;
		}
		warning('11: incorrect sink argument in pullpush.time call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function sequence(sink1, sink2){
		let $sink1 = sink1(nonce());
		if($$sink === $sink1 || $$sink === $sink1.sink){ // sink locality extended to 1 level
			if(sink2 === undefined){
				return $sink1.sequence;
			}
			let $sink2 = sink2(nonce());
			if($$sink === $sink2 || $$sink === $sink2.sink){ // sink locality extended to 1 level
				return $sink1.sequence - $sink2.sequence;
			}
			warning('12: incorrect sink second argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink2);
		}
		warning('13: incorrect sink first argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink1);
	}
	function stack(sink, all, debug){
		let $sink = sink(nonce());
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
	let $$onwarning = undefined;
	function $$warning(message){
		if(typeof $$onwarning === "function"){
			$$pulls = 0;
			$$stack = [];
			$$onwarning(message);
		}
	}
	function warning(message, $sink){
		setTimeout($$warning, 0, message);
		if($sink){
			throw Error("pullpush warning " + message + "\n" + stack($sink.safe, true, true));
		}
		throw Error("pullpush warning " + message);
	}
	function onwarning(handler){
		if(typeof handler === "function"){
			if($$onwarning === undefined){
				$$onwarning = handler;
			}
			else{
				$$onwarning = (function(handler1, handler2){
					return function(message){
						handler1(message);
						handler2(message);
					};
				})($$onwarning, handler);
			}
		}
	};
	pullpush.onwarning = onwarning;
	pullpush.sink = sink;
	pullpush.forcast = forcast;
	pullpush.broadcast = broadcast;
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