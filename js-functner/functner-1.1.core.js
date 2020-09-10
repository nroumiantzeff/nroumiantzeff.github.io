// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
(function(){
	this.DefineType = function Type(name, combinators){
		const type = (function definition(implementation, subtype){
			return function value(combinator, recombinators){
				return combinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype);
			};
		})();
		return type;
	};
}).call(null);