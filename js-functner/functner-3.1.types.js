"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a><br>
// Credit to <a href="https://github.com/MostlyAdequate/mostly-adequate-guide">Professor Frisby's Mostly Adequate Guide to Functional Programming</a><br>


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Type

/*
class Container {
	constructor(x) {
		this.$value = x;
	}
	static of(x) {
		return new Container(x);
	}
}
*/

function of(){
}

function join(value){
	return value(join)();
}

function checked(){
}

function checkValue(value1, value2){
	return functionScript(value1) === functionScript(Type) && value1(checkValue)(value2) === checked;
}

function checkType(value, type){
	return functionScript(value) === functionScript(Type) && value(checkType)(type) === checked;
}

function checkSubtype(value, type, subtype){
	return functionScript(value) === functionScript(Type) && value(checkSubtype)(type, subtype) === checked;
}

function checkCombinator(value, combinator){
	return functionScript(value) === functionScript(Type) && value(checkCombinator)(combinator) === checked;
}

function inspect(value){
	if (checkValue(value)){
		return value(inspect)(id);
	}
	return inspectValue(value);
}

function shareCombinators(){
}

function recombinator(recombinators, combinator, self){
	if(self === undefined){
		return true; //foolproof
	}
	if(recombinators === undefined){
		return false;
	}
	return recombinators(combinator, self);
}

const Type = (function(){
	function registerCombinators(combinator, recombinator, recombinators){
		return function checkCombinators(x, y){
			return x === combinator && y === recombinator || recombinators && recombinators(x, y) || false;
		};
	}
	const Type = DefineType('Type', define(function anyCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === undefined){
			// (Type)() :: a -> Type a
			return x => (x === undefined)? type: definition(x, subtype);
		}
		if (combinator === checkSubtype){
			// (Type)(checkSubtype) :: (Type, Subtype) -> Checked
			return (t, s) => (t === type && s === subtype) && checked;
		}
		if (combinator === checkType){
			// (Type)(checkType) :: Type -> Checked
			return t => (t === type) && checked;
		}
		if (combinator === checkValue){
			// (Type)(checkValue) :: Type -> Checked
			// (Type)(checkValue) :: () -> Checked
			return v => ((v === undefined) || checkType(v, type)) && checked;
		}
		if (combinator === shareCombinators){
			// (Type)(shareCombinators) :: (Name, Combinators, Type, Definition, Combinator, a, Impementation) -> Type a
			return combinators;
		}
		if (combinator === recombinator){
			// (Type a)(recombinator) :: Recombinator -> Combinator -> Value
			return function(y){
				return function(x){
					return value(x, (y === undefined)? recombinators: registerCombinators(x, y, recombinators));
				};
			};
		}
		if(combinator === inspect){
			// (Type)(inspect) :: (String -> String) -> String
			return f => f(`${functionName(subtype)||name}(${inspect(implementation)})`);
		}
	}, function(){}));
	return Type;
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pointed

const Pointed = DefineType('Pointed', define(function pointedCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === of){
		// (Pointed)(of) :: a -> Pointed a
		return x => definition(x, subtype);
	}
}, Type(shareCombinators))); //todo: is it useful to have non-pointed types?


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Concatenation

function concat(...args){
	if(length(args) === 1){
		const y = args[0];
		return function(x){
			return concat(x, y);
		};
	}
	if(length(args) === 2){
		const x = args[0];
		const y = args[1];
		if(x == null){
			return y;
		}
		if(y == null){
			return x;
		}
		if(checkValue(x)){
			if(checkValue(x, y)){
				return x(concat)(y);
			}
			return x;
		}
		if(supportsMethod(x, "concat")){
			return callMethod(x, "concat", y);
		}
		return x + y;
	}
	return concat(args[0], concat(...slice(args, 1)));
}

function concatenation(){}

const Concatenation = (function(){
	const safe = function(){};
	const Concatenation = DefineType('Concatenation', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === concat){
			// (Concatenation a)(concat) :: Concatenation a -> Concatenation a
			return function(other){
				if (checkType(other, type)){
					const y = other(safe)();
					const f = value(concatenation);
					const z = f(implementation, y); 
					if(z === implementation){
						return value;
					}
					if(z === y){
						return other;
					}
					return definition(z, subtype);
				}
				return value;
			}
		}
		if(combinator === safe){
			// (Concatenation a)(safe) :: () -> a
			return () => implementation; 
		}
		if(combinator === concatenation){
			// (Concatenation)(concatenation) :: (a, a) -> a
			return (x, y) => x; 
		}
	}, Type(shareCombinators)));
	return Concatenation;
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Sequenceable

/*
	// sequence :: (Sequenceable t, Applicative f) => (a -> f a) -> t (f a) -> f (t a)
	const sequence = curry((of, x) => x(sequence)(of));
*/

const sequence = curry(function(of, x){
	return x(sequence)(of());
});

const Sequenceable = DefineType('Sequenceable', define(function pointedCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === sequence){
		// (Sequenceable (Traversable a))(sequence) :: Traversable -> Traversable (Sequenceable a)
		// (Sequenceable (Traversable a))(sequence) :: () -> Traversable (Sequenceable a)
		// (Sequenceable (Traversable a))(sequence) :: Traversable -> Traversable a
		// (Sequenceable (Traversable a))(sequence) :: () -> Traversable a
		// (Sequenceable a)(sequence) :: Traversable -> Sequenceable a
		// (Sequenceable a)(sequence) :: () -> Sequenceable a
		return function(t){
			if(checkValue(implementation, t)){
				return implementation(traverse)(implementation, value(of));
			}
			return value;
		};
	}
}, Pointed(shareCombinators))); //todo: is it useful to have non-sequenceable types? is it a problem that Functor and (map) are not defined yet?

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Traversable

/*
	traverse(of, fn) {
		return this.$value.reduce(
			(f, a) => fn(a).map(b => bs => bs.concat(b)).ap(f),
			of(new List([]))
		);
	}
*/

const traverse = function(of, f, x){
	if(x === undefined){
		return function(x){
			return x(map)(f)(sequence)(of());
		};
	}
	return x(map)(f)(sequence)(of());
};

const Traversable = DefineType('Traversable', define(function pointedCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === traverse){
		// (Traversable (Type a))(traverse) :: Type b -> (a -> Type b) -> Type (Traversable b)
		// (Traversable (Type a))(traverse) :: Type b -> ((a -> Type b) -> Type c) -> Type (Traversable c)
		// (Traversable a)(sequence) :: b -> c -> Traversable a
		return function(x, f){
			function traverser(x, f){
				if(checkType(x, type)){
					if(functionLength(f) === 1){
						return value(map)(f);
					}
					if(functionLength(f) === 2){
						const y = value(map)(function(u){
							return function(v){
								return f(u, v);
							};
						});
						if(checkType(y, type)){
							return y(ap)(x);
						}
						return value;
					}
					return value;
				}
				return value;
			}
			if(f === undefined){
				return function(f){
					return traverser(x, f);
				};
			}
			return traverser(x, f);
		};
	}
}, Pointed(shareCombinators))); //todo: is it useful to have non-traversable types? is it a problem that Functor and (map) are not defined yet?


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Joinable

const Joinable = (function(){
	function safe(){
	}
	return DefineType('Joinable', define(function joinableCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === join){
			// (Joinable (Joinable a))(join) :: () -> Joinable a
			return function(){
				if(checkSubtype(implementation, type, subtype)){
					return implementation;
				}
				// join failed
				return value;
			};
		}
		if(combinator === safe){
			// (Joinable a)(safe) :: () => a
			return () => implementation;
		}
	}, Pointed(shareCombinators)));
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Functor

function chain(f, x){
	if (x == null){
		return x => chain(f, x);
	}
	return x(chain)(f);
}

/*
Container.prototype.ap = function (otherContainer) {
 	return otherContainer.map(this.$value);
};
*/

function ap(){
}

const Functor = DefineType('Functor', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === map){
		// (Functor a)(map) :: (a -> b) -> Functor b
		return f => definition(f(implementation), subtype);
	}
	if(combinator === chain){
		// (Functor)(chain) :: f => (Functor)(chain)(f)(join)()
		return function(f){
			return value(map)(f)(join)();
		};
	}
	if(combinator === ap){
		// (Functor (a -> b))(ap) :: Functor a -> Functor b
		return function(x){
			if(isFunction(implementation) && !checkValue(implementation) && checkSubtype(x, type, subtype)){
				return x(map)(implementation);
			}
			// ap failed
			return value;
		};
	}
	if(combinator === concatenation){
		// (Functor a)(concatenation) :: (a, a) -> a
		return function(x, y){
			return concat(x, y);
		};
	}
}, Joinable(shareCombinators), Sequenceable(shareCombinators), Traversable(shareCombinators), Concatenation(shareCombinators)));


/*
const liftA2 = curry((g, f1, f2) => f1.map(g).ap(f2));

const liftA3 = curry((g, f1, f2, f3) => f1.map(g).ap(f2).ap(f3));

// liftA4, etc
*/

const liftA2 = curry((g, f1, f2) => f1(map)(g)(ap)(f2));

const liftA3 = curry((g, f1, f2, f3) => f1(map)(g)(ap)(f2)(ap)(f3));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Identity

/*
	// idToMaybe :: Identity a -> Maybe a
	const idToMaybe = x => Maybe.of(x.$value);

	// idToIO :: Identity a -> IO a
	const idToIO = x => IO.of(x.$value);
*/

function toMaybe(x){
	return x(toMaybe)();
}

function toIO(x){
	return x(toIO)();
}

const Identity = DefineType('Identity', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === toMaybe){
		// (Identity a)(toMaybe) :: () -> Maybe a
		return f => Maybe()(implementation);
	}
	if(combinator === toIO){
		// (Identity a)(toIO) :: () -> IO a
		return f => IO()(implementation);
	}
}, Functor(shareCombinators)));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Container

const Container = DefineType('Container', Functor(shareCombinators));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Maybe

/*
class Maybe {
	static of(x) {
		return new Maybe(x);
	}
	get isNothing() {
		return this.$value === null || this.$value === undefined;
	}
	constructor(x) {
		this.$value = x;
	}
	map(fn) {
		return this.isNothing ? this : Maybe.of(fn(this.$value));
	}
	inspect() {
		return this.isNothing ? 'Nothing' : `Just(${inspect(this.$value)})`;
	}
}
*/

function Nothing(){
}

function Just(){
}

/*
	// maybeToTask :: Maybe a -> Task () a
	const maybeToTask = x => (x.isNothing ? Task.rejected() : Task.of(x.$value));
*/

function toTask(x){
	return x(toTask)();
}

function toEither(x){
	return x(toEither)();
}

const Maybe = DefineType('Maybe', define(function maybeCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === of){
	// (Maybe a)(of) :: a ->  Maybe a
		return x => definition(x, (x == null)? Nothing: Just);
	}
	if(combinator === maybe){
		// (Functor a)(maybe) :: (a -> b) -> Functor b
		return (nothing, just) => (implementation == null)? nothing: just(implementation);
	}
	if(combinator === map){
		// (Maybe)(map) :: (a -> b) ->  Maybe b
		if(subtype === Nothing){
			return () => value;
		}
		return f => {
			const x = f(implementation);
			return definition(x, (x == null)? Nothing: Just);
		};
	}
	if(subtype === Nothing){
		if(combinator === inspect){
			// (Nothing)(inspect) :: (String -> String) -> String
			return f => f(`${functionName(subtype)||name}`);
		}
	}
	if(combinator === toTask){
		// (Maybe a)(toTask) :: () -> Task ((() -> a) (()-> a))
		if(implementation == null){
			return () => Task()(function(reject, result){
				reject(implementation);
			});
		}
		return () => Task()(function(reject, result){
			result(implementation);
		});
	}
	if(combinator === toEither){
		// (Just a)(toEither) :: () -> Right a
		// (Nothing a)(toEither) :: () -> Left a
		if(implementation == null){
			return () => Left(implementation);
		}
		return () => Right(implementation);
	}
}, Functor(shareCombinators)));

/*
// maybe :: b -> (a -> b) -> Maybe a -> b
const maybe = curry((v, f, m) => {
	if (m.isNothing) {
		return v;
	}
	return f(m.$value);
});
*/

// maybe :: b -> (a -> b) -> Maybe a -> b
function maybe(nothing, just){
	return maybeA => maybeA(maybe)(nothing, just);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Either

/*
class Either {
	static of(x) {
		return new Right(x);
	}
	constructor(x) {
		this.$value = x;
	}
}
class Left extends Either {
	map(f) {
		return this;
	}
	inspect() {
		return `Left(${inspect(this.$value)})`;
	}
}
class Right extends Either {
	map(f) {
		return Either.of(f(this.$value));
	}
	inspect() {
		return `Right(${inspect(this.$value)})`;
	}
}
const left = x => new Left(x);
*/

const left = x => Either(left)(x);
const right = x => Either(right)(x);

const Left = x => left(x);
const Right = x => right(x);

/*
	// eitherToTask :: Either a b -> Task a b
	const eitherToTask = either(Task.rejected, Task.of);
*/

const Either = (function(){
	function self(){}
	const Either = DefineType('Either', define(function eitherCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === left){
			// (Either)(left) :: a -> Left a
			return x => definition(x, Left);
		}
		if(combinator === right){
			// (Either)(right) :: a -> Right a
			return x => definition(x, Right);
		}
		if(combinator === of){
			// (Either)(of) :: a -> Either a
			return (x) => definition(x, subtype || Right);
		}
		if(subtype === Right){
			if(combinator === map){
				// (Right b)(map) :: (b -> c) -> Right c
				return f => definition(f(implementation), subtype);
			}
			if(combinator === ap){
				// (Right (a -> b))(ap) :: Right a -> Right b
				// (Right (a -> b))(ap) :: Left c -> Left c
				return function(x){
					if(isFunction(implementation) && !checkValue(implementation) && checkType(x, type)){
						if(checkSubtype(x, type, Left)){
							return x;
						}
						return x(map)(implementation);
					}
					// ap failed
					return value;
				};
			}
			if(combinator === either){
				// (Right b)(either) :: (a -> c) -> (b -> c) -> c
				return (left, right) => right(implementation);
			}
			if(combinator === concat && !recombinator(recombinators, combinator, self)){
				// (Right a)(concat) :: Right a -> Right a
				// (Right a)(concat) :: Left b -> Left b
				return function(other){
					if(checkSubtype(other, type, Left)){
						return other;
					}
					return value(recombinator)(self)(concat)(other);
				};
			}
			if(combinator === toTask){
				// (Right a)(map) :: (toTask) ->  () -> Task ((() -> a) (()-> a))
				return () => Task()(function(reject, result){
					result(implementation);
				});
			}
		}
		if(subtype === Left){
			if(combinator === map){
				// (Left a)(map) :: (a -> c) -> Left a
				return f => value;
			}
			if(combinator === either){
				// (Left a)(either) :: (a -> c) -> (b -> c) -> c
				return (left, right) => left(implementation);
			}
			if(combinator === concat){
				// (Left a)(concat) :: Either b -> Left a
				return function(other){
					return value;
				};
			}
			if(combinator === toTask){
				// (Left a)(map) :: (toTask) ->  () -> Task ((() -> a) (()-> a))
				return () => Task()(function(reject, result){
					reject(implementation);
				});
			}
		}
	}, Functor(shareCombinators)));
	return Either;
})();

/*
// either :: (a -> c) -> (b -> c) -> Either a b -> c
const either = curry((f, g, e) => {
	let result;
	switch (e.constructor) {
		case Left:
			result = f(e.$value);
		break;
		case Right:
			result = g(e.$value);
		break;
		// No Default
	}
	return result;
});
*/

// either :: (a -> c) -> (b -> c) -> Either a b -> c
function either(left, right){
	return eitherAB => eitherAB(either)(left, right);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Monad

/*
class IO {
	constructor(io) {
		this.unsafePerformIO = io;
	}
	map(fn) {
		return new IO(compose(fn, this.unsafePerformIO));
	}
}
*/

/*
	// ioToTask :: IO a -> Task () a
	const ioToTask = x => new Task((reject, resolve) => resolve(x.unsafePerform()));
*/

const Monad = (function(){
	function safe(){
	}
	return DefineType('Monad', define(function monadCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === of){
			// (Monad)(of) :: (a -> b) -> Monad (a -> b)
			// (Monad)(of) :: a -> Monad (() -> a)
			return x => isFunction(x) && !checkValue(x)? definition(x, subtype): definition(() => x, subtype);
		}
		if(combinator === join){
			// (Monad (Monad a))(join) :: () -> Monad a
			return function(f){ // (join) derived from (chain)
				const chained = value(chain)(id);
				if(isFunction(chained)){
					return chained;
				}
				return (function(){});
			};
		}
		if(combinator === map){
			// (Monad (a -> b))(map) :: (b -> Monad c) -> Monad (a -> c)
			if(isFunction(implementation) && !checkValue(implementation)){
				return function(f){
					if(functionPartial(f)){ //todo use subtype instead of testing the function type
						return definition(resolve(f, implementation), subtype);
					}
					return definition(compose(f, implementation), subtype);
				};
			}
			return f => definition(f(implementation), subtype);
		}
		if(combinator === chain){
			// (Monad (a -> b))(chain) :: (b -> Monad c) -> Monad (a -> c)
			if(isFunction(implementation) && !checkValue(implementation)){
				function runtimeSafeJoin1(y){
					const check = checkType(y, type);
					if(check){
						return y(safe)()();
					}
					//chain failed
					return y;
				}
				return function(f){
					return definition(compose(runtimeSafeJoin1, f, implementation), subtype);
				};
			}
			function runtimeSafeJoin2(y){
				const check = checkType(y, type);
				if(check){
					return y(safe)();
				}
				//chain failed
				return y;
			}
			return function(f){
				return definition(runtimeSafeJoin2(f(implementation)), subtype);
			};
		}
		if(combinator === ap){
			// (Monad (a -> b))(ap) :: Monad a -> Monad b
			// (Monad (b -> c))(ap) :: Monad (a -> b) -> Monad (a -> c)
			return function(x){
				if(isFunction(implementation) && !checkValue(implementation) && checkSubtype(x, type, subtype)){
					const y = x(safe)();
					if(isFunction(y) && !checkValue(y)){
						if(functionPartial(implementation)){ //todo use subtype instead of testing the function type
							return definition(resolve(implementation, y), subtype);
						}
						return definition(compose(implementation, y), subtype);
					}
					return definition(implementation(y), subtype);
				}
				// ap failed
				return value;
			};
		}
		if(combinator === concatenation){
			// (Monad (a -> b))(concatenation) :: ((a -> b), (a -> b)) -> (a -> b)
			return function(f, g){
				return function(x){
					return concat(f(x), g(x));
				};
			};
		}
		if(combinator === safe){
			// (Monad a)(safe) :: () -> a
			return () => implementation;
		}
		if(combinator === inspect){
			// (Monad)(inspect) :: (string -> string) -> string
			return f => f(`${concat(functionName(subtype))(name)}(${inspect((checkValue(implementation) || !isFunction(implementation))? implementation: implementation())})`);
		}
		if(combinator === toTask){
			// (Monad (a -> b))(map) :: (toTask) ->  () -> Task ((() -> b) (()-> b))
			return () => Task()(function(reject, result){
				result(implementation());
			});
		}
	}, Functor(shareCombinators)));
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IO

function unsafePerformIO(){
}

const IO =  DefineType('IO', define(function ioCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === unsafePerformIO){
		// (IO (a -> b))(unsafePerformIO) :: a -> b
		return isFunction(implementation) && !checkValue(implementation)? implementation: (() => implementation);
	}
}, Monad(shareCombinators)));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Lift

function lift(){
}

function unlift(){
}

const Lift = (function(){
	function Lifted(){
	}
	function safe(){
	}
	function self(){
	}
	return DefineType('Lift', define(function liftCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === map && subtype === Lifted && !recombinator(recombinators, combinator, self)){
			// (Lifted (a -> b))(map) :: Lifted (b -> c) -> Lifted (a -> c)
			const remap = value(recombinator)(self)(map);
			return function(f){
				const lifted = checkSubtype(f, type, Lifted);
				if (lifted){
					return remap(f(safe)());
				};
				return remap(f);
			};
		}
		if(combinator === lift){
			// (Lift)(lift) :: (a -> b) -> Lifted (a -> b)
			return x => isFunction(x) && !checkValue(x)? definition(x, Lifted): definition(() => x, Lifted);
		}
		if(combinator === unlift && subtype === Lifted){
			// (Lifted (a -> b))(unlift) :: a -> Lift (() -> b)
			return x => definition(() => implementation(x)); 
		}
		if(combinator === safe){
			// (Lift a)(safe) :: () -> a
			return () => implementation;
		}
	}, Type(shareCombinators)));
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IOLift

const IOLift =  DefineType('IOLift', define(Lift(shareCombinators), IO(shareCombinators)));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Task

/*

*/

function fork(task){
	return task(fork);
}

const Task = (function(){
	function safe(){
	}
	function runtimeSafeJoin(f, type){
		return function g(x){
			const y = f(x);
			const check = checkType(y, type);
			if(check){
				const z = y(safe)();
				return z;
			}
			// chain failed
			return y;
		};
	}
	function runtimeApply(h, implementation){
		return function apply2(x1, x2){
			return implementation(x1, function(x){
				const y = h(x);
				if(isFunction(y) && !checkValue(y)){
					return y(x1, x2);
				}
				return x2(y);
			});
		};
	}
	return DefineType('Task', define(function taskCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === map){
			// (Task (a -> (c -> d) -> (e -> f)))(map) :: (b -> c) -> Task (a -> (b -> d) -> (e -> f))
			// (Task (a -> c -> d))(map) :: (b -> c) -> Task (a -> b -> d)
			// (Task a)(map) :: (a -> b) -> Task b
			if(checkValue(implementation) || !isFunction(implementation) || functionLength(implementation) === 1){
				return f => definition(f(implementation), subtype);
			}
			if(functionLength(implementation) === 2){
				return function(f){
					return definition(runtimeApply(f, implementation), subtype);
				};
			}
			return (function(){}); //todo "Not supported: Task(f(x1,x2,x3)=>{})";
		}
		if(combinator === chain){
			// (Task (a -> (c -> d) -> (e -> f)))(chain) :: (b -> Task c) -> Task (a -> (b -> d) -> (e -> f))
			// (Task (a -> c -> d)(chain) :: (b -> Task c) -> Task (a -> b -> d)
			// (Task a)(chain) :: (a -> Task b) -> Task b
			if(checkValue(implementation) || !isFunction(implementation) || functionLength(implementation) === 1){
				return function(f){
					const g = runtimeSafeJoin(f, type);
					return definition(g(implementation), subtype);
				};
			}
			if(functionLength(implementation) === 2){
				return function(f){
					const g = runtimeSafeJoin(f, type);
					return definition(runtimeApply(g, implementation), subtype);
				};
			}
			return (function(){}); //todo "Not supported: Task(f(x1,x2,x3)=>{})";
		}
		if(combinator === fork){
			// (Task (a -> b))(fork) :: a -> b
			// (Task a)(fork) :: () -> a
			if(isFunction(implementation) && !checkValue(implementation)){
				//debug return (...x) => setTimeout(implementation, 0, ...x);
				return function(...x){
					setTimeout(function(){
						implementation(...x);
					}, 0);
				};
			}
			return () => implementation;
		}
		if(combinator === concatenation){
			// (Task (a -> (c -> d) -> (e -> f)))(concatenation) :: ((a -> (c -> d) -> (e -> f)), (a -> (c -> d) -> (e -> f))) -> ((a -> (c -> d) -> (e -> f)))
			// (Task (a -> c -> d))(concatenation) :: (a -> c -> d, a -> c -> d) -> (a -> c -> d)
			// (Task a)(concatenation) :: (a, a) -> a
			if(checkValue(implementation) || !isFunction(implementation)){
				return function(x, y){
					return concat(x, y);
				};
			}
			if(functionLength(implementation) === 1){
				return function(f1, g1){
					return function(x){
						f1(x);
						if(functionLength(g1) === 1 && !checkValue(g1)){
							g1(x);
						}
					};
				};
			}
			if(functionLength(implementation) === 2){
				return function(f2, g2){
					return function(reject, result){
						f2(reject, result);
						if(functionLength(g2) === 2 && !checkValue(g2)){
							g2(reject, result);
						}
					};
				};
			}
			return (function(){}); //todo "Not supported: Task(f(x1,x2,x3)=>{})";
		}
		if(combinator === safe){
			// (Task a)(safe) :: () -> a
			return () => implementation;
		}
	}, Functor(shareCombinators)));
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Compose

/*
class Compose {
	constructor(fgx) {
		this.getCompose = fgx;
	}
	static of(fgx) {
		return new Compose(fgx);
	}
	map(fn) {
		return new Compose(map(map(fn), this.getCompose));
	}
}
*/

function getCompose(){
}

const Compose = DefineType('Compose', define(function composeCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === map){
		// (Compose (Functor (Functor a)))(map) :: (a -> b) -> Compose (Functor (Functor b))
		return fn => definition(map(map(fn), implementation), subtype);
	}
	if(combinator === getCompose){
		// (Compose (Functor a))(getCompose) :: Functor a
		return isFunction(implementation)? implementation: (function(){});
	}
	if(combinator === sequence){
		// (Compose (U (V (Traversable a))))(sequence) :: Traversable -> Traversable (Compose (U (V a)))
		// (Compose (A (B (Traversable a))))(sequence) :: Traversable -> Traversable a
		// (Compose (U (V a)))(sequence) :: Traversable -> Compose a
		return function(t){
			const utv = implementation(map)(function(x){
				if(checkValue(x)){
					return x(sequence)(t);
				}
				return x;
			});
			const tuv = utv(sequence)(t);
			return definition(tuv, subtype);
		};
	}
}, Functor(shareCombinators)));

const mcompose = (f, g) => compose(chain(f), g);


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Monoid

const Monoid = (function(){
	const specialize = function(){};
	const Monoid = DefineType('Monoid', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === concatenation){
			// (Monoid)(concatenation) :: (a, a) -> a
			if (subtype !== undefined){
				return subtype;
			}
		}
		if(combinator === specialize){
			// (Monoid)(specialize) :: ((a, a) -> a) -> (a -> Monoid a)
			return f => ((f === subtype)? value: definition(implementation, f))(); 
		}
		if(combinator === inspect){
			// (Monoid)(inspect) :: (string -> string) -> string
			return f => f(`${functionName(subtype) || name}(${!isFunction(implementation)? implementation: implementation()})`);
		}
	}, Concatenation(shareCombinators)));
	return Monoid(specialize);
})();
