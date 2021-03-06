"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/master/ch11.md

logger("***********************************************************************" + "\n" +
	"11. Transform Again, Naturally ****************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Curse This Nest

(function(){

	Either(of)(Maybe(of)('b'))
		(inspect)(assert("Right(Just('b'))", "Either(of)(Maybe(of)('b'))", x => logger(x)));
	// Right(Just('b'))

	IO(of)(Task(of)(IO(of)(1000)))
		(inspect)(assert("IO(Task(IO(1000)))", "IO(of)(Task(of)(IO(of)(1000)))", x => logger(x)));
	// IO(Task(IO(1000)))

		assert("[Identity('bee thousand')]", "[Identity(of)('bee thousand')]", x => logger(x))(inspect(
	[Identity(of)('bee thousand')]
		));
	// [Identity('bee thousand')]

})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A Situational Comedy

(function(){

	// mock
/* //bug?
	// getValue :: Selector -> Task Error (Maybe String)
*/
	// getValue :: Selector -> () -> Task Error (Maybe String)
	function getValue(selector){
		if(selector === '#comment'){
			return () => Task(of)(Maybe(of)('my comment'));
		}
		return Task(of)('invalid selector');
	}

	// mock
	// postComment :: String -> Task Error Comment
	function postComment(text){
		if(text === 'my comment'){
			return Task(of)(text);
		}
		return Task(of)('cannot post comment');
	}

	// mock
	// validate :: String -> Either ValidationError String
	function validate(text){
		if(text === 'my comment'){
			return Either(of)(text);
		}
		return left('Incorrect comment');
	}

	// saveComment :: () -> Task Error (Maybe (Either ValidationError (Task Error Comment)))
	const saveComment = compose(
		map(map(map(postComment))),
		map(map(validate)),
		getValue('#comment'),
	);

	saveComment()
		(inspect)(assert("Task(Just(Right(Task('my comment'))))", "saveComment()", x => logger(x)));
	// Task(Just(Right(Task('my comment'))))
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All Natural

/*
	// nt :: (Functor f, Functor g) => f a -> g a
	compose(map(f), nt) === compose(nt, map(f));
*/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Principled Type Conversions

/*
	// idToMaybe :: Identity a -> Maybe a
	const idToMaybe = x => Maybe.of(x.$value);

	// idToIO :: Identity a -> IO a
	const idToIO = x => IO.of(x.$value);

	// eitherToTask :: Either a b -> Task a b
	const eitherToTask = either(Task.rejected, Task.of);

	// ioToTask :: IO a -> Task () a
	const ioToTask = x => new Task((reject, resolve) => resolve(x.unsafePerform()));

	// maybeToTask :: Maybe a -> Task () a
	const maybeToTask = x => (x.isNothing ? Task.rejected() : Task.of(x.$value));

	// arrayToMaybe :: [a] -> Maybe a
	const arrayToMaybe = x => Maybe.of(x[0]);
*/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Feature Envy

(function(){

/*
	// arrayToList :: [a] -> List a
	const arrayToList = List(of);
*/

	// mock
	const sortBy = function(h){
		return list => arrayToList(list(toArray)().sort(h));
	};

	// mock
	const filter = function(g){
		return list => arrayToList(list(toArray)().filter(g));
	};

	// mock
	const f = x => x * x;
	const g = x => (x % 2)? true: false;
	const h = (x, y) => (x === y)? 0: (x < y)? 1: -1;

	const doListyThings = compose(sortBy(h), filter(g), arrayToList, map(f));
	const doListyThings_ = compose(sortBy(h), filter(g), map(f), arrayToList); // law applied

	const array = [ 4, 3, -2, 5, -1, 7, -12, ];

	doListyThings(array)
		(inspect)(assert("List(49,List(25,List(9,List(1))))", "doListyThings(array)", x => logger(x)));
	// List(49,List(25,List(9,List(1))))

	doListyThings_(array)
		(inspect)(assert("List(49,List(25,List(9,List(1))))", "doListyThings_(array)", x => logger(x)));
	// List(49,List(25,List(9,List(1))))

})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Isomorphic JavaScript

(function(){

/*
	// promiseToTask :: Promise a b -> Task a b
	const promiseToTask = x => new Task((reject, resolve) => x.then(resolve).catch(reject));

	// taskToPromise :: Task a b -> Promise a b
	const taskToPromise = x => new Promise((resolve, reject) => x.fork(reject, resolve));

	const x = Promise.resolve('ring');
	taskToPromise(promiseToTask(x)) === x;

	const y = Task.of('rabbit');
	promiseToTask(taskToPromise(y)) === y;
*/

	// Q.E.D. Promise and Task are isomorphic.
	// We can also write a listToArray to complement our arrayToList and show that they are too.
	// As a counter example, arrayToMaybe is not an isomorphism since it loses information:

	// maybeToArray :: Maybe a -> [a]
/*
	const maybeToArray = x => (x.isNothing ? [] : [x.$value]);
*/
	const maybeToArray =  x => x(toArray)();

	// mock
	function toArray(){
	}

	// mock
	const MaybeEx = DefineType('MaybeEx', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === toArray){
			// (Nothing)(toArray) :: () -> []
			// (Just a)(toArray) :: () -> [a]
			return () => (implementation == null)? []: [implementation];
		}
	}, Maybe(shareCombinators)));

	// arrayToMaybe :: [a] -> Maybe a
	const arrayToMaybe = x => MaybeEx(of)(x[0]);

	// mock
	const replace = (x, y) => string => string.replace(x, y);

	const x = ['elvis costello', 'the attractions'];

	// not isomorphic
		assert("['elvis costello']", "maybeToArray(arrayToMaybe(x))", x => logger(x))(inspect(
	maybeToArray(arrayToMaybe(x))
		));
	// ['elvis costello']

	// but is a natural transformation
	compose(arrayToMaybe, map(replace('elvis', 'lou')))(x)
		(inspect)(assert("Just('lou costello')", "compose(arrayToMaybe, map(replace('elvis', 'lou')))(x)", x => logger(x)));
	// Just('lou costello')

	// ==

/* //bug?
	compose(map(replace('elvis', 'lou'), arrayToMaybe))(x)
*/
	compose(map(replace('elvis', 'lou')), arrayToMaybe)(x)
		(inspect)(assert("Just('lou costello')", "compose(map(replace('elvis', 'lou'), arrayToMaybe))(x)", x => logger(x)));
	// Just('lou costello')
})();


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A Broader Definition

// reverse :: [a] -> [a]

// join :: (Monad m) => m (m a) -> m a

// head :: [a] -> a

// of :: a -> f a


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// One Nesting Solution

(function(){

	// mock
	const eitherToTask = x => x(toTask)();
	const maybeToTask = x => x(toTask)();

	// mock
/* //bug?
	// getValue :: Selector -> Task Error (Maybe String)
*/
	// getValue :: Selector -> () -> Task Error (Maybe String)
	function getValue(selector){
		if(selector === '#comment'){
			return () => Task(of)(Maybe(of)('my comment'));
		}
		return Task(of)('invalid selector');
	}

	// mock
	// postComment :: String -> Task Error Comment
	function postComment(text){
		if(text === 'my comment'){
			return Task(of)(text);
		}
		return Task(of)('cannot post comment');
	}

	// mock
	// validate :: String -> Either ValidationError String
	function validate(text){
		if(text === 'my comment'){
			return Either(of)(text);
		}
		return left('Incorrect comment');
	}

/*
	// saveComment :: () -> Task Error (Maybe (Either ValidationError (Task Error Comment)))
	const saveComment = compose(
		map(map(map(postComment))),
		map(map(validate)),
		getValue('#comment'),
	);
*/
	// saveComment :: () -> Task Error Comment
	const saveComment = compose(
		chain(postComment),
		chain(eitherToTask),
		map(validate),
		chain(maybeToTask),
		getValue('#comment'),
	);

/*
	saveComment()
		(inspect)(assert("Task(Just(Right(Task('my comment'))))", "saveComment()", x => logger(x)));
	// Task(Just(Right(Task('my comment'))))
*/
		const reject = error => assert('null', "saveComment()(fork)(reject, result)", x => logger(x))(inspect(error));
		const result = data => assert("'my comment'", "saveComment()(fork)(reject, result)", x => logger(x))(inspect(data));
	saveComment()
		(fork)(reject, result);
	// Task(Just(Right(Task('my comment'))))
})();

logger("***********************************************************************" + "\n");
