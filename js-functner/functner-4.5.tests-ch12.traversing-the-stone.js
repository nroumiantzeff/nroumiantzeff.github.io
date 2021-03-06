"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch12.md

logger("***********************************************************************" + "\n" +
	"12. Traversing the Stone **********************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Types n' Types

(function(){

	// moke
	// Array -> Number -> Array
	const take = function(items){
		return array => array.slice(0, items);
	}

	// moke
	// Array -> String -> String
	const join = function(separator){
		return array => array.join(separator);
	}

	// moke
	// String -> String -> Array
	const split = function(separator){
		return string => string.split(separator);
	}

	// mock
	const fs = {
		readFileSync: function(filename, encoding){
			if(filename === 'file1'){
				return 'hail the monarchy hail the oligarchy a potential for anarchy and we pat ourselves firmly on the back';
			}
			if(filename === 'file2'){
				return 'smash the patriarchy 2018 is going to be a big year for feminist thought and action';
			}
		},
	};

	// readFile :: FileName -> Task Error String
	const readFile = filename => Task()(fs.readFileSync(filename, 'utf-8'));

	// firstWords :: String -> String
	const firstWords = compose(join(' '), take(3), split(' '));

	// tldr :: FileName -> Task Error String
	const tldr = compose(map(firstWords), readFile);

		assert("[Task('hail the monarchy'),Task('smash the patriarchy')]", "map(tldr, ['file1', 'file2'])", x => logger(x))(inspect(
	map(tldr, ['file1', 'file2'])
		));
	// [Task('hail the monarchy'),Task('smash the patriarchy')]

})();

(function(){

	// mock
	// getAttribute :: String -> Node -> Maybe String
	function getAttribute(name){
		if(name === 'aria-controls'){
			return function(node){
				return Maybe(of)(node[name]);
			};
		}
		return Maybe(of)();
	}

	// mock
	const document = {
		querySelector: function (selector){
			if(selector === '#aria-controls'){
				return { 'aria-controls': '.aria-controls' };
			}
			if(selector === '.aria-controls'){
				return { name: 'aria-control', value: '100' };
			}
		},
	};

	// $ :: Selector -> IO Node
	const $ = selector => IO()(document.querySelector(selector));

	// getControlNode :: Selector -> IO (Maybe (IO Node))
	const getControlNode = compose(map(map($)), map(getAttribute('aria-controls')), $);

	getControlNode('#aria-controls')
		(inspect)(assert("IO(Just(IO({'name':'aria-control','value':'100'})))", "getControlNode('#aria-controls')", x => logger(x)));
	// IO(Just(IO({'name':'aria-control','value':'100'})))
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Type Feng Shui

(function(){

/*
	// sequence :: (Traversable t, Applicative f) => (a -> f a) -> t (f a) -> f (t a)
	const sequence = curry((of, x) => x(sequence)(of));
*/

	//additional simple example
	sequence(Either(of), Maybe(of)(Either(of)('the facts')))
		(inspect)(assert("Right(Just('the facts'))", "sequence(Either(of), Maybe(of)(Either(of)('the facts')))", x => logger(x)));
	// Right(Just('the facts'))

		assert("[Just('the facts')]", "sequence(List(of), Maybe(of)(['the facts'])(map)(arrayToList))(toArray)()", x => logger(x))(inspect(
	sequence(List(of), Maybe(of)(['the facts'])(map)(arrayToList))(toArray)()
		));
	// [Just('the facts')]

	sequence(Task(of), Map()({ a: Task(of)(1), b: Task(of)(2) }))
			(inspect)(assert("Task(Map({'a':1,'b':2}))", "sequence(Task(of), Map()({ a: Task(of)(1), b: Task(of)(2) }))", x => logger(x)));
	// Task(Map({'a':1,'b':2}))

	sequence(IO(), Either(of)(IO()('buckle my shoe')))
		(inspect)(assert("IO(Right('buckle my shoe'))", "sequence(IO(), Either(of)(IO()('buckle my shoe')))", x => logger(x)));
	// IO(Right('buckle my shoe'))

	sequence(Either(of), arrayToList([Either(of)('wing')]))
		(map)(compose(apply(), apply(toArray)))
			(inspect)(assert("Right(['wing'])", "sequence(Either(of), arrayToList([Either(of)('wing')]))", x => logger(x)));
	// Right(['wing'])

	sequence(Task(of), left(Task(of)('wing')))
		(inspect)(assert("Task(Left('wing'))", "sequence(Task(of), left(Task(of)('wing'))", x => logger(x)));
	// Task(Left('wing'))
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Effect Assortment

(function(){

	// mock
	// a -> Bool
	const odd = x => ((x % 2) !== 0);

/*
	// List.traverse
	traverse(of, fn) {
		return this.$value.reduce(
			(f, a) => fn(a).map(b => bs => bs.concat(b)).ap(f),
			of(new List([])),
		);
  	}
*/

	// fromPredicate :: (a -> Bool) -> a -> Either e a
	//additional example
	const fromPredicate = function(f){
		return function(x){
			if(f(x)){
				return Either(of)(x);
			}
			return left('no');
		};
	};

	// partition :: (a -> Bool) -> [a] -> [Either e a]
	const partition = f => map(fromPredicate(f));

	//additional example
		assert("[Right(1),Right(3),Right(13),Right(1313),Right(13131313)]", "partition(odd, [1, 3, 13, 1313, 13131313])", x => logger(x))(inspect(
	partition(odd)([1, 3, 13, 1313, 13131313])
		));
	// [Right(1),Right(3),Right(13),Right(1313),Right(13131313)]

	//additional example
		assert("[Right(1),Left('no'),Right(3),Right(5),Left('no'),Right(13)]", "partition(odd, [1, 2, 3, 5, 8, 13])", x => logger(x))(inspect(
	partition(odd)([1, 2, 3, 5, 8, 13])
		));
	// [Right(1),Left('no'),Right(3),Right(5),Left('no'),Right(13)]

	// validate :: (a -> Bool) -> [a] -> Either e [a]
	const validate = f => traverse(Either(of), fromPredicate(f));

	//additional example
		assert("Right([1,3,13,1313,13131313])", "validate(odd)(arrayToList([1, 3, 13, 1313, 13131313]))", x => logger(x))(inspect(
	validate(odd)(arrayToList([1, 3, 13, 1313, 13131313]))
		(map)(compose(apply(), apply(toArray)))
		));
	// Right([1,3,13,1313,13131313])

	//additional example
		assert("Left('no')", "validate(odd)(arrayToList([1, 2, 3, 5, 8, 13]))", x => logger(x))(inspect(
	validate(odd)(arrayToList([1, 2, 3, 5, 8, 13]))
		));
	// Left('no')
})();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Waltz of the Types

(function(){

	// moke
	// Array -> Number -> Array
	const take = function(items){
		return array => array.slice(0, items);
	}

	// moke
	// Array -> String -> String
	const join = function(separator){
		return array => array.join(separator);
	}

	// moke
	// String -> String -> Array
	const split = function(separator){
		return string => string.split(separator);
	}

	// mock
	const fs = {
		readFileSync: function(filename, encoding){
			if(filename === 'file1'){
				return 'hail the monarchy hail the oligarchy a potential for anarchy and we pat ourselves firmly on the back';
			}
			if(filename === 'file2'){
				return 'smash the patriarchy 2018 is going to be a big year for feminist thought and action';
			}
		},
	};

	// readFile :: FileName -> Task Error String
	const readFile = filename => Task()(fs.readFileSync(filename, 'utf-8'));

	// firstWords :: String -> String
	const firstWords = compose(join(' '), take(3), split(' '));

	// tldr :: FileName -> Task Error String
	const tldr = compose(map(firstWords), readFile);

		assert("Task(['hail the monarchy','smash the patriarchy'])", "traverse(Task(of), tldr, arrayToList(['file1', 'file2']))(map)(compose(apply(), apply(toArray)))", x => logger(x))(inspect(
	traverse(Task(of), tldr, arrayToList(['file1', 'file2']))(map)(compose(apply(), apply(toArray)))
		));
	// Task(['hail the monarchy','smash the patriarchy'])
})();


(function(){
	// mock
	// getAttribute :: String -> Node -> Maybe String
	function getAttribute(name){
		if(name === 'aria-controls'){
			return function(node){
				return Maybe(of)(node[name]);
			};
		}
		return Maybe(of)();
	}

	// mock
	const document = {
		querySelector: function (selector){
			if(selector === '#aria-controls'){
				return { 'aria-controls': '.aria-controls' };
			}
			if(selector === '.aria-controls'){
				return { name: 'aria-control', value: '100' };
			}
		},
	};

	// $ :: Selector -> IO Node
	const $ = selector => IO()(document.querySelector(selector));

	// getAttribute :: String -> Node -> Maybe String
	// $ :: Selector -> IO Node

	// getControlNode :: Selector -> IO (Maybe Node)
	const getControlNode = compose(chain(traverse(IO(of), $)), map(getAttribute('aria-controls')), $);

	getControlNode('#aria-controls')
		(inspect)(assert("IO(Just({'name':'aria-control','value':'100'}))", "getControlNode('#aria-controls')", x => logger(x)));
	// IO(Just({'name':'aria-control','value':'100'}))
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// No Law and Order

(function(){

	// Identity

	const identity1 = compose(sequence(Identity(of)), map(Identity(of)));
	const identity2 = Identity(of);

	// test it out with Right
	identity1(Either(of)('stuff'))
		(inspect)(assert("Identity(Right('stuff'))", "identity1(Either(of)('stuff'))", x => logger(x)));
	// Identity(Right('stuff'))

	identity2(Either(of)('stuff'))
		(inspect)(assert("Identity(Right('stuff'))", "identity2(Either(of)('stuff'))", x => logger(x)));
	// Identity(Right('stuff'))
})();

(function(){

	// Composition
/*
	const comp1 = compose(sequence(Compose(of)), map(Compose(of)));
	const comp2 = (Fof, Gof) => compose(Compose(of), map(sequence(Gof)), sequence(Fof));

	// Test it out with some types we have lying around
	comp1(Identity(Right([true])));
	// Compose(Right([Identity(true)]))

	comp2(Either.of, Array)(Identity(Right([true])));
	// Compose(Right([Identity(true)]))
*/

	const x = Maybe(of)(List(of)(Either(of)(true)));
		x(inspect)(assert("Just(List(Right(true)))", "Maybe(of)(List(of)(Either(of)(true)))", x => logger(x)));
	// Just(List(Right(true)))

	const y1 = sequence(List(of), x);
		y1(inspect)(assert("List(Just(Right(true)))", "sequence(List(of), x)", x => logger(x)));
	// List(Just(Right(true)))

	const y2 = Compose(of)(y1);
		y2(inspect)(assert("Compose(List(Just(Right(true))))", "Compose(of)(y1)", x => logger(x)));
	// Compose(List(Just(Right(true))))

	const y3 = sequence(Either(of), y2);
		y3(inspect)(assert("Compose(Right(List(Just(true))))", "sequence(Either(of), y2)", x => logger(x)));
	// Compose(Right(List(Just(true))))

	const y4 = y3(getCompose);
		y4(inspect)(assert("Right(List(Just(true)))", "y3(getCompose)", x => logger(x)));
	// Right(List(Just(true)))

	const z1 = x(map)(Compose(of));
		z1(inspect)(assert("Just(Compose(List(Right(true))))", "x(map)(Compose(of))", x => logger(x)));
	// Just(Compose(List(Right(true))))

	const z2 = sequence(Compose(of), z1);
		z2(inspect)(assert("Compose(List(Right(Just(true))))", "sequence(Compose(of), z1)", x => logger(x)));
	// Compose(List(Right(Just(true))))

	const z3 = z2(getCompose);
		z3(inspect)(assert("List(Right(Just(true)))", "z2(getCompose)", x => logger(x)));
	// List(Right(Just(true)))

	const z4 = sequence(Either(of), z3);
		z4(inspect)(assert("Right(List(Just(true)))", "sequence(Either(of), z3)", x => logger(x)));
	// Right(List(Just(true)))

})();

(function(){

	// Naturality
	const natLaw1 = (of, nt) => compose(nt, sequence(of));
	const natLaw2 = (of, nt) => compose(sequence(of), map(nt));

	// test with a random natural transformation and our friendly Identity/Right functors.

	// maybeToEither :: Maybe a -> Either () a
	const maybeToEither = x => x(toEither)();

	natLaw1(Maybe(of), maybeToEither)(Identity(of)(Maybe(of)('barlow one')))
		(inspect)(assert("Right(Identity('barlow one'))", "natLaw1(Maybe(of), maybeToEither)(Identity(of)(Maybe(of)('barlow one')))", x => logger(x)));
	// Right(Identity('barlow one'))

	natLaw2(Either(of), maybeToEither)(Identity(of)(Maybe(of)('barlow one')))
		(inspect)(assert("Right(Identity('barlow one'))", "natLaw2(Either(of), maybeToEither)(Identity(of)(Maybe(of)('barlow one')))", x => logger(x)));
	// Right(Identity('barlow one'))

	// traverse(A(of), A(of)) === A(of);

	//additional example
	traverse(Maybe(of), Maybe(of))(Maybe(of)('barlow one'))
		(inspect)(assert("Just(Just('barlow one'))", "traverse(Maybe(of), Maybe(of))(Maybe(of)('barlow one'))", x => logger(x)));
	// Just(Just('barlow one'))

	//additional example
	traverse(Maybe(of), Maybe(of))(Maybe(of)(null))
		(inspect)(assert("Nothing", "traverse(Maybe(of), Maybe(of))(Maybe(of)(null))", x => logger(x)));
	// Nothing
})();

logger("***********************************************************************" + "\n");

