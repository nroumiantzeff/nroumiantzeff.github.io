//todo rename to pullpushEngine.js (more distinguishing whensearching the web than pullpush.js)
//todo point to the documentation
//todo copyright 
let pullpush = (function(){
	"use strict";
	let $$time = undefined;
	let $$ticking = false;
	let $$ticks = 0;
	let $$warnings = 0;
	let $$sinks = 0;
	let $$sink0 = undefined; // universal sink (top level) 
	let $$sink = undefined; // currently processed sink
	let $$nonce = undefined; // safe access to the private properties of a sink
	let $$pushing = false;
	let $$pulls = 0; // levels of pulling
	let $$options = { stack: true, lock: false, }; // default sink options
	let $$none = Symbol("none");
	let $$all = Symbol("all");
	let $$keepalive = Symbol("keepalive"); // prevent reclaiming the shink when unused
	let $$reclaimable = Symbol("cleanup"); // allow reclaiming the sink when unused
	let $$registers = Symbol("pullpushregisters");
	let $$register = Symbol("pullpushregister");
	let $$unregister = Symbol("pullpushunregister");
	function pullpush(sink, source, ...args){
		// note: the source argument may be of a type other than "function" for declaration purpose, in that case it is a boolean (true/false to keepalive/cleanup the corresponding sub-sink in case it is not used during the current javascript event queue tick)
		let $sink = pullpushProlog1(sink, source);
		if($sink !== undefined && ($sink.source === undefined || !equals(args, $sink.args))){
			pullpushProlog2($sink, source, args);
			try{
				let value = pull($sink, $sink.source, ...$sink.args);
				update($sink, value);
			}
			finally{
				pullpushEpilog2($sink);
			}
		}
		return pullpushEpilog1($sink);
	}
	function pull($sink, source, ...args){
		let variables = pullProlog($sink); // variables[0]: safe sink, variables[1]: value, variables[2]: exception, ... 
		try{
			variables[1] = source(variables[0], ...args);
		}
		catch(exception){
			variables[2]= exception;
		}
		return pullEpilog($sink, variables);
	}
	function push(sink, value, force){
		let $sink = sink(nonce());
		let $sinks = [];
		if(value !== $sink.value || $sink.error !== $$none){
			update($sink, value);
			if(force){
				$sink.currentValue = $sink.value;
			}
			$sink.tick = $$ticks;
			$sinks.push($sink);
		}
		pushSourcesInTopologicalOrder($sinks);
		return value;
	}
	function pullpushProlog1(sink, source){
		tick();
		let $sink = sink(nonce());
		let declaration = source === true? $$keepalive: source === false? $$reclaimable: false;
		if(declaration){
			if($sink === $$sink){
				// generic declaration for all sub-sinks
				if($sink.keepalives[$$all] !== undefined && $sink.keepalives[$$all] !== declaration){
					warning('28: keepalive declaration pullpush(sink,' + (declaration === $$keepalive? 'true': 'false') + ') is insconsistent with the previous keepalive declaration pullpush(sink,' + ($sink.keepalives[$$all] === $$keepalive? 'true': 'false') + '): consider removing the conflicting declaration', $sink);
				}
				$sink.keepalives[$$all] = declaration;
			}
			else{
				if($sink.sink === undefined || $sink.sink !== $$sink){
					warning('21: pullpush keepalive declaration called with an invalid sink argument (with id "' + $sink.id + '"): the sink argument should either be the the sink passed by the caller (with id "' + $$sink.id + '") or an explicit sub-sink of it such as sink("' + $sink.id  + '")', $sink);
				}
				if($sink.sink.keepalives[$sink.id] !== true){ // the source has not been call yet
					if($sink.sink.keepalives[$sink.id] !== undefined && $sink.sink.keepalives[$sink.id] !== declaration){
						warning('27: keepalive declaration pullpush(sink("' + $sink.id + '"),' + (declaration === $$keepalive? 'true': 'false') + ') is insconsistent with the previous keepalive declaration pullpush(sink("' + $sink.id + '"),' + ($sink.keepalives[$sink.id] === $$keepalive? 'true': 'false') + '): consider removing the conflicting declaration', $sink);
					}
					$sink.sink.keepalives[$sink.id] = declaration;
				}
			}
			return;
		}
		if(typeof source !== "function"){
			warning('29: pullpush called with an invalid source argument of type "' + (typeof source) + '": the source argument should either be of type "function" (or "boolean" for a keepalive declaration)', $sink);
		}
		if($sink === $$sink || $sink.sink === undefined && $$sink === undefined){
			// implicit sink: generate a sub-sink automatically (using the source name)
			$sink = $sink.safe(source.name)(nonce());
		}
		else if($sink.sink === undefined && $$sink !== undefined){
			warning('30: non-top level pullpush (with source name "' + source.name + '") should not be called with an invalid top level sink (with id "' + $sink.id + '")', $sink);
		}
		else if($sink.sink !== $$sink){
			if($$sink !== undefined){
				warning('23: pullpush called with an invalid sink argument (with id "' + $sink.id + '"): the sink argument should either be the the sink passed by the caller (with id "' + $$sink.id + '") or an explicit sub-sink of it such as sink("' + $sink.id  + '")', $sink);
			}
			else{
				warning('31: top level pullpush called with an invalid non-top level sink argument (with id "' + $sink.id + '")', $sink);
			}
		}
		if($sink.sink){
			$sink.sink.keepalives[$sink.id] = true;
		}
		checkDuplicates($sink);
		return $sink;
	}
	function pullpushProlog2($sink, source, args){
		if($sink.source === undefined){
			// note: use the source specified first ignoring sources specified afterwards (theoriticaly, functions could be laysily evaluated by an optimized javascript implementation)
			$sink.source = source;
		}
		$sink.args = args;
		$sink.tick = $$ticks;
		$$pulls++;
		$sink.duplicates = undefined;
	}
	function pullpushEpilog1($sink){
		if($sink !== undefined){
			if($sink.error !== $$none){
				throw $sink.error;
			}
			return $sink.value;
		}
	}
	function pullpushEpilog2($sink){
		$sink.duplicates = undefined;
		$$pulls--;
	}
	function pullProlog($sink){
		let value;
		let exception;
		$sink.nonce = { handlers: 0 };
		$sink.error = $$none; 
		let current = $$sink;
		$$sink = $sink;
		let $safe = $$safe($sink); // immutability: $$safe($sink) ensures that the first argument passed to $sink.source is different from previous calls
		return [ $safe, value, exception, current ]; // returning an array so that stepping over pullProlog under the debugger takes only one click
	}
	function pullEpilog($sink, variables){
		let value = variables[1];
		let exception = variables[2];
		let current = variables[3];
		$$sink = current;
		if(exception){
			$sink.error = exception;
			if($$pulls > 0){
				throw $sink.error;
			}
		}
		else{
			if($sink.error === $$none){
				reclaimSources($sink); // do not reclaim resource when an exception occured
			}
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
	}
	function event(event, observers, value){
		// observers is an object (maybe a static function) registered using pullpush.register (a keys is a sink index and the associated value is the corresponding sink)
		if(!(event instanceof Event)){
			warning('3: invalid event argument in pullpush.event call');
		}
		if(tick()){
			// new javascript event queue tick: synchronous handling is OK
			return eventCallback(event, observers, value);
		}
		// same javascript event queue tick: asynchronous handling is necessary
		setTimeout(eventCallback, 0, event, observers, value);
		return value;
	}
	function eventCallback(event, observers, value){
		tick();
		let $sinks = [];
		for(let index in observers){
			let $sink = observers[index](nonce());
			if(value !== $sink.value){
				update($sink, value);
				$sink.tick = $$ticks;
				$sinks.push($sink);
			}
		}
		pushSourcesInTopologicalOrder($sinks);
		return value;
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
			let skip = false;
			while($parent){
				let sourcesCount = sourcesCounts[$parent.index];
				if(sourcesCount > 1){
					sourcesCounts[$parent.index] = sourcesCount - 1;
					break;
				}
				else{
					if(!skip){
						if(!pushSource($parent))
						{
							skip = true;
						}
					}
					if(!skip){
						if($parent.sink.index === 0){
							if($parent.error !== $$none){
								throw $parent.error;
							}
							if($parent.value !== undefined){
								warning('14: caution: the root sink is never pushed: top level pullpush call with id "' + $parent.id + '" should always return undefined instead of ' + typeof $parent.value + ' "' + $parent.value + '"', $parent);
							}
							warning('24: pullpush internal error (the top level sink is nerver pushed)', $parent); // note: never should have landed here
						}
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
		$sink.tick = $$ticks;
		return true;
	}
	function update($sink, value){
		if($sink.currentTick === undefined || $$ticks > $sink.currentTick){
			$sink.currentValue = $sink.value;
			$sink.currentTick = $$ticks;
		}
		$sink.value = value;
		return value;
	}
	function generateSink($sink, id, options){
		tick();
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
				tick: $$ticks,
				currentTick: undefined,
				timer: undefined,
				skips: 0,
				sources: {},
				keepalives: {},
				registers: {},
				debug: overriden.stack? Error(): undefined,
			};
			$$safe($sink);
			if($parent){
				$parent.sources[id] = $sink;
			}
		}
		return $sink.safe;
	}
	function nonce(){
		return $$nonce = {};
	}
	function $$safe($sink){
		if(!$sink.safe || $sink.tick !== $$ticks){ // note: do not call pullpush with the same $sink.safe argument for different $$ticks values
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
	function reclaimSources($sink){
		for(let id in $sink.sources){
			let keepalive = $sink.keepalives[id];
			if(keepalive !== true){
				// the source has not been called
				if(keepalive !== $$keepalive && (keepalive !== undefined || $sink.keepalives[$$all] !== $$keepalive)){
					// the source is not declared as keepalive
					let $source = $sink.sources[id];
					if(keepalive !== $$reclaimable && (keepalive !== undefined || $sink.keepalives[$$all] !== $$reclaimable)){
						// the source is not declared as reclaimable
						warning('25: missing declaration for reclaiming sink("' + id + '") which is no longer used by sink("' + $sink.id + '"): consider calling either pullpush(sink("' + id + '"),true) for keepalive or pullpush(sink("' + id + '"),false) for cleanup', $source);
					}
					else{
						// reclaim the unused source
						unregister($source);
						delete $sink.sources[id];
					}
				}
			}
		}
		$sink.keepalives = {};
	}
	function checkDuplicates($sink){
		let $parent = $sink.sink;
		if($parent){
			if($parent.duplicates === undefined){
				$parent.duplicates = {};
			}
			let duplicate = $parent.duplicates[$sink.id];
			if(duplicate === 1){
				if($sink.id){
					warning('1: pullpush should not be called twice with the same sink as first argument: consider specifying an explicite localy unique id argument in sink("' + $sink.id + '")', $sink);
				}
				else{
					warning('2: pullpush should not be called twice with the same sink as first argument and anonymous functions as second argument: consider specifying named functions as second argument to pullpush', $sink);
				}
			}
			else{
				$parent.duplicates[$sink.id] = 1;
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
		tick();
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
		tick(); //todo remove: tick() should only be called in the public API functions to limit the numbers of setTimeout to the minimum
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
		//todo check that the observers have not accessed the old value in the same javascript event queue tick
		tick();
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
						$observer.tick = $$ticks;
						$sinks.push($observer);
					}
				}
				pushSourcesInTopologicalOrder($sinks);
			}
		}
		return $nonce;
	}
	function register(sink, observers, register, unregister){
		tick();
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
		tick();
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return observers[$sink.index] !== undefined;
		}
		warning('8: incorrect sink argument in pullpush.registered call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function value(sink, defaultValue){
		tick();
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			let currentValue = ($$ticks > $sink.currentTick)? $sink.value: $sink.currentValue;
			return currentValue !== undefined? currentValue: defaultValue;
		}
		warning('9: incorrect sink argument in pullpush.value call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function id(sink){
		tick();
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return $sink.id;
		}
		warning('10: incorrect sink argument in pullpush.id call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function time(sink){
		tick();
		let $sink = sink(nonce());
		if($$sink === $sink){ // sink locality
			return $$time - $sink.time;
		}
		warning('11: incorrect sink argument in pullpush.time call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink);
	}
	function sequence(sink1, sink2){
		tick();
		let $sink1 = sink1(nonce());
		if($$sink === $sink1 || $$sink === $sink1.sink){ // sink locality extended to 1 level
			if(sink2 === undefined){
				return $sink1.tick;
			}
			let $sink2 = sink2(nonce());
			if($$sink === $sink2 || $$sink === $sink2.sink){ // sink locality extended to 1 level
				return $sink1.tick - $sink2.tick;
			}
			warning('12: incorrect sink second argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink2);
		}
		warning('13: incorrect sink first argument in pullpush.sequence call: pullpush sink argument should not be passed as argument except as source first argument to inner pullpush API calls', $sink1);
	}
	function stack(sink, all, debug){
		let $sink = sink(nonce());
		let levels = [];
		while($sink){
			if(debug && $sink.debug){
				// note: we need to throw the Error object to get its stack buit (at least on chrome V8)
				try{
					throw $sink.debug;
				}
				catch(exception){
				}
				levels.push($sink.id + ": " + ($sink.debug.stack).replace(/^.*\n/, "\n"));
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
			tick();
			$$onwarning(message);
		}
	}
	function warning(message, $sink){
		let offlimit = $$warnings++ - 50;
		if(offlimit > 0){
			// too many warnings
			return;
		}
		if(offlimit === 0){
			message = '26: too many pullpush warnings (no more pullpush warnings will be raised): consider removing all pullpush warnings';
			$sink = undefined;
		}
		setTimeout($$warning, 0, message);
		let error = Error($sink? message + "\n" + stack($sink.safe, true, true): message);
		error.name = "pullpush";
		throw error;
	}
	function onwarning(handler){
		tick();
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
	function ticked(){
		$$ticking = false;
	}
	function tick(){
		if(!$$ticking){
			$$time = Date.now();
			$$ticks++;
			$$ticking = true;
			$$pulls = 0;
			Promise.resolve().then(ticked); // use a Promise (microtask) to detect javascript event queue tick (macrotask)
			return true; // new javascript event queue tick
		}
		return false; // same javascript event queue tick
	}
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