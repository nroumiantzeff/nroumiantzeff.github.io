"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming  https://github.com/MostlyAdequate/mostly-adequate-guide

function isFunction(f){
	return typeof(f) === "function";
}

function functionLength(f){
	if(isFunction(f)){
		return f.length;
	} 
}

function functionName(f){
	if(isFunction(f)){
		return f.name;
	} 
}

function functionScript(f){
	if(isFunction(f)){
		return f.toString();
	} 
}

function inspectValue(value){
	if(isFunction(value)){
		return value.toString();
	}
	if(value === null){
		return "null";
	}
	if(typeof(value) === "undefined"){
		return "undefined";
	}
	if(typeof(value) === "string"){
		return "'" + value.replace(/\n/g, "\\n") + "'";
	}
	if(Array.isArray(value)){
		return "[" + value.map(inspect).join(",") + "]";
	}
	if(typeof(value) === "object"){
		const keys = [];
		for (var key in value){
			keys.push(key);
		}
		return "{" + keys.map(function(key){
			return "'" + key + "':" + inspect(value[key]);
		}).join(",") + "}";
	}
	return value.toString();
}

const logger = console.log.bind(console);
console.log = function(message){
	logger (`\t// ${inspect(message).replace(/\n/g, "\n\t")}`);
}

const assert = (function assert(){
	var asserts = 0;
	var errors = 0;
 	function status(expected, value){
		asserts++;
		const failure = (value !== expected);
		if (failure){
			errors++;
			return `'ERROR (errors: ${errors}, asserts: ${asserts}) // ${value} !== ${expected}`;

		}
		return `'ok (errors: ${errors}, asserts: ${asserts})'`;
	}
	return function assert(expected, message, logger){
		const script = `\t${message}\n`.replace(/\n/g, "\n\t");
		return function assert(value){
			logger(`${script}// ${expected}\n${status(expected, value)}\n\n`);
			return true;
		};
	};
})();

function prop(name){
	return x => x[name];
}

function append(suffix){
	return x => x + suffix;
}

function match(regex){
	return x => regex.test(x);
}

function add(value, x){
	if(x === undefined){
		return x => Number(value) + Number(x);
	}
	return Number(value) + Number(x);
}

function id(x){
	return x;
}

const map = (function(){
	function map2(f, mapper){
		if (f === id){
			return mapper;
		}
		if(typeof(mapper.map) === "function"){
			return mapper.map(f);
		}
		return mapper(map)(f);
	}
	function map(...mappers){
		if(mappers.length === 1){
			const f1 = mappers[0];
			return function(mapper1){
				return map(f1, mapper1);
			};
		}
		if(mappers.length === 2){
			const f2 = mappers[0];
			const mapper2 = mappers[1];
			return map2(f2, mapper2);
		}
		if(mappers.length > 2){
			const mapper = mappers[mappers.length - 1];
			const f = mappers[mappers.length - 2];
			return map(...mappers.slice(0, mappers.length - 2), map2(f, mapper));
		}
	};
	return map;
})();

const transmap = (function(){
	function transmap2(mapper, f){
		if (f === id){
			return mapper;
		}
		if(typeof(mapper.map) === "function"){
			return mapper.map(f);
		}
		return mapper(map)(f);
	}
	function transmap(...mappers){
		if(mappers.length === 1){
			const mapper1 = mappers[0];
			return function(f1){
				return transmap(mapper1, f1);
			};
		}
		if(mappers.length === 2){
			const mapper2 = mappers[0];
			const f2 = mappers[1];
			return transmap2(mapper2, f2);
		}
		if(mappers.length > 2){
			const mapper = mappers[0];
			const f = mappers[1];
			return transmap(transmap2(mapper, f), ...mappers.slice(2));
		}
	};
	return transmap;
})();

function define(...definers){
	const definer1 = definers[0];
	if(definers.length == 1){
		return definer1;
	}
	const definer2 = definers[1];
	if(definers.length == 2){
		return function definer(...args){
			const result1 = definer1.apply(null, args);
			if(typeof(result1) !== "undefined"){
				return result1;
			}
			return definer2.apply(null, args);
		};
	}
	if (definers.length > 2){
		return define(define(definer1, definer2), ...definers.slice(2));
	}
}

function functionPartial(f){
	return isFunction(f) && f.partial;
}

function resolve(resolving, resolver){
	const resolvers = (resolving.resolvers || []).concat(resolver);
	const resolution = (resolving.resolution || resolving);
	const resolved = function resolved(...args){
		return resolution(...resolvers.map(function(resolver){
			return resolver(...args);
		}));
	};
	resolved.resolution = resolution;
	resolved.resolvers = resolvers;
	resolved.partial = true;
	return resolved;
}

/*
// unit-tests
(function(){

	const curried = curry(function(x, y, z){
		return x + y + z;
	});

	const resolved1 = resolve(curried, function add10(){
		return 10;
	});

	const debug1 = resolved1();

	const resolved2 = resolve(resolved1, function add200(){
		return 200;
	});

	const debug2 = resolved2();

	const resolved3 = resolve(resolved2, function add3000(){
		return 3000;
	});

	const debug3 = resolved3();

})();
*/


function curry(f, n, ...params){
	const length = (typeof(n) === 'number')? n: f.length;
	if(length <= 1){
		return f;
	}
	const curried = function curried(...args){
		if(params.length + args.length >= length){
			return f(...params, ...args);
		}
		if(args.length === 0){
			return curry(f, length, ...params, args[0]);
		}
		return curry(f, length, ...params, ...args);
	};
	curried.partial = true;
	return curried;
}

/*
// unit-tests
(function(){

	function test1(x){
		return 1000 * x;
	}
	const debug11 = curry(test1)(3);

	function test2(x, y){
		return 1000 * x + 100 * y;
	}
	const debug22 = curry(test2)(3, 2);
	const debug211 = curry(test2)(3)(2);
	const debug2011 = curry(test2)()(3)(2);
	const debug2101 = curry(test2)(3)()(2);
	const debug20101 = curry(test2)()(3)()(2);
	const debug200101 = curry(test2)()()(3)()(2);
	const debug2001001 = curry(test2)()()(3)()()(2);

	function test3(x, y, z){
		return 1000 * x + 100 * y + 10 * z;
	}
	const debug33 = curry(test3)(3, 2, 1);
	const debug3111 = curry(test3)(3)(2)(1);
	const debug30111 = curry(test3)()(3)(2)(1);
	const debug31011 = curry(test3)(3)()(2)(1);
	const debug301011 = curry(test3)()(3)()(2)(1);
	const debug3001011 = curry(test3)()()(3)()(2)(1);
	const debug30010011 = curry(test3)()()(3)()()(2)(1);
	const debug321 = curry(test3)(3, 2)(1);
	const debug312 = curry(test3)(3)(2, 1);
	const debug3021 = curry(test3)()(3, 2)(1);
	const debug3012 = curry(test3)()(3)(2, 1);
	const debug3201 = curry(test3)(3, 2)()(1);
	const debug3102 = curry(test3)(3)()(2, 1);
	const debug30201 = curry(test3)()(3, 2)()(1);
	const debug30102 = curry(test3)()(3)()(2, 1);
})();
*/

const compose = (function(){
	function compose2(f, g){
		if (f === id || f === undefined){
			return g || id;
		}
		if(g === id || g === undefined){
			return f || id;
		}
		//debug return x => f(g(x));
		return function(x){
			const y = g(x);
			const z = f(y);
			return z;
		};
	}
	function compose(...morphisms){
		if(morphisms.length === 1){
			const f1 = morphisms[0];
			return g1 => compose2(f1, g1);
		}
		if(morphisms.length === 2){
			const f2 = morphisms[0];
			const g2 = morphisms[1];
			return compose2(f2, g2);
		}
		const f = morphisms[morphisms.length - 2];
		const g = morphisms[morphisms.length - 1];
		return compose(...morphisms.slice(0, morphisms.length - 2), compose2(f, g));
	}
	return compose;
})();

function toString(value){
	return value.toString();
}

function split(separator){
	return x => x.split(separator);
}

function head(x){
	return x[0];
}

function last(x){
	return x[x.length - 1];
}

function filter(condition){
	return x => x.filter(condition);
}

function eq(x){
	return y => (x === y);
}

function compare(x, y){
	if(x > y){
		return 1;
	}
	if(x < y){
		return -1;
	}
	return 0;
}

function sortBy(comparer){
	return function(array){
		const sortedArray = array.slice().sort(function(item1, item2){
			return compare(comparer(item1) > comparer(item2));
		});
		return sortedArray;
	};
}

function apply(...x){
	return function apply(f){
		return f(...x);
	};
}

function interpose(f, x){
	return function interpose(g){
		return (f(g))(x);
	};
}

function reverse(x){
	if (typeof(x) === "string"){
		var array = x.split("");
		return array.reverse().join("");
	}
	const y = x.slice(); // duplicate to prevent mutation of the source 
	return y.reverse();
}

function toUpperCase(x){
	return x.toUpperCase();
}

function concat(y){
	if (y == null){
		return function (x){
			return x;
		};
	}
	return function (x){
		if(x == null){
			return y;
		}
		if(typeof(x.concat) === "function"){
			return x.concat(y);
		}
		return x + y;
	};
}

/* //debug
function mergeObjects(object1, object2){
	const properties1 = Object.entries(object1);
	const properties2 = Object.entries(object2);
	const properties = properties1.concat(properties2);
	const object = Object.fromEntries(properties);
	return object;
}
*/ //debug

//debug
function mergeObjects(object1, object2, deep){
	if(!deep){
		const properties1 = Object.entries(object1);
		const properties2 = Object.entries(object2);
		const properties = properties1.concat(properties2);
		const object = Object.fromEntries(properties);
		return object;
	}
	const keys = Object.getOwnPropertyNames(mergeObjects(object1, object2));
	const concatenated = reduce(keys, function(accumulator, key){
		const x = object1[key];
		const y = object2[key];
		const z = { [key]: concat(x, y) };
		return mergeObjects(accumulator, z);
	}, {});
	return concatenated;
}

function length(x){
	return x.length;
}

function supportsMethod(x, y){
	return x != null && typeof(x[y]) === "function";
}

function callMethod(x, y, ...args){
	return x[y](...args);
}

function slice(array, n, m){
	return array.slice(n, m);
}

const getOwnPropertyNames = Object.getOwnPropertyNames;

function reduce(array, f, accumulator){
	return array.reduce(f, accumulator);
}
