"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a><br>
// Credit to <a href="https://github.com/MostlyAdequate/mostly-adequate-guide">Professor Frisby's Mostly Adequate Guide to Functional Programming</a><br>


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Map

const insert = function(){};

const toObject = function(){};

const Map = DefineType('Map', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === of){
		// (Map)(of) :: Object -> Map
		return x => definition(x);
	}
	if(combinator === toObject){
		// (Map)(toObject) :: () -> Oject
		return () => implementation; 
	}
	if(combinator === insert){
		// (Map a)(insert) :: (a, String) -> Map a
		return function(x, key){
			const object1 = value(toObject)();
			const object2 = { [key]: x };
			const object = mergeObjects(object1, object2);
			return definition(object, subtype);
		}; 
	}
	if(combinator === concatenation){
		// (Map a)(concatenation) :: (a, a) -> a
		return function(x, y){
			return mergeObjects(x, y, true);
		}; 
	}
	if(combinator === map){
		// (Map a)(map) :: (a -> b) -> Map b
		return function(f){
			const keys = getOwnPropertyNames(implementation);
			const mapped = reduce(keys, function(accumulator, key){
				const x = implementation[key];
				const y = f(y);
				const z = { [key]: y };
				return mergeObjects(accumulator, z);
			}, {});
			return definition(mapped, subtype);
		};
	}
	if(combinator === sequence){
		// (Map (Traversable a))(sequence) :: Traversable -> Traversable (Map a)
		// (Map (Traversable a))(sequence) :: Traversable -> Traversable a
		// (Map a)(sequence) :: Traversable -> Map a
		return function(t){
			const keys = getOwnPropertyNames(implementation);
			return reduce(keys, function(accumulator, key){
				const x = implementation[key];
				if(checkValue(x, t)){
					return x(traverse)(accumulator, function(u, v){
						return v(insert)(u, key);
					});
				}
				return accumulator;
			}, t(of)(Map(of)({})));
		};
	}
}, Functor(shareCombinators), Concatenation(shareCombinators)));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// List

const next = function(){};

const empty = function(){};

const arrayToList = function (array){
	if(length(array) === 0){
		return List;
	}
	if(length(array) === 1){
		return List()(array[0]);
	}
	return (arrayToList(slice(array, 1)))(insert)(array[0]);
};

const toArray = function(){};

const List = DefineType('List', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
	if(combinator === insert){
		// List(insert) :: a -> List a
		// (List a)(insert) :: b -> List b (List a)
		// (List a (List b))(insert) :: c -> List c (List b (List a))
		return x => (value === type)? definition(x): definition(x, value);
	}
	if(combinator === next){
		// List(next) :: () -> List
		// (List a)(next) :: () -> List
		// (List a (List b))(next) :: () -> List a
		return () => subtype;
	}
	if(combinator === empty){
		// List(empty) :: () -> True
		// (List a)(empty) :: () -> False
		// (List a (List b))(empty) :: () -> False
		return () => (value === type);
	}
	if(combinator === toArray){
		// List(toArray) :: () -> []
		// (List a)(toArray) :: () -> [a]
		// (List a (List a))(toArray) :: () -> [a, a...]
		if(value === type){
			// List(toArray) :: () -> []
			return () => [];
		}
		if(subtype === undefined){
			return () => [implementation];
		}
		return () => concat([implementation], subtype(toArray)()); 
	}
	if(combinator === map){
		// List(map) :: (a -> b) -> List
		// (List a)(map) :: (a -> b) -> List b
		// (List a (List a))(map) :: (a -> b) -> List b (List b)
		return (f) => arrayToList(map(f, value(toArray)()));
	}
	if(combinator === sequence){
		// (List (Traversable a))(sequence) :: Traversable -> Traversable (List a)
		// (List (Traversable a))(sequence) :: Traversable -> Traversable a
		// (List a)(sequence) :: Traversable -> List a
		return function(t){
			if(checkValue(implementation)){
				const array = reverse(value(toArray)());
				return reduce(array, function(accumulator, x){
					if(checkValue(x, t)){
						return x(traverse)(accumulator, function(u, v){
							return v(insert)(u);
						});
					}
					return accumulator;
				}, t(of)(List));
			}
		};
	}
	if(combinator === inspect){
		// (List)(inspect) :: (string -> string) -> string
		if(value === type){
			return f => f(`Empty`);
		}
		if(subtype === undefined){
			return f => f(`${name}(${inspect(implementation)})`);
		}
		return f => f(`${name}(${inspect(implementation)},${inspect(subtype)})`);
	}
}, Functor(shareCombinators)));


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Sum

/*
	const Sum = x => ({
		x,
		concat: other => Sum(x + other.x)
	})
*/

const Sum = Monoid(function Sum(x, y){ return x + y; });
const Product = Monoid(function Product(x, y){ return x * y; });
const Min = Monoid(function Min(x, y){ return x < y? x: y; });
const Max = Monoid(function Max(x, y){ return x > y? x: y; });


