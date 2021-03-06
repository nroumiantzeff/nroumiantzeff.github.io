"use strict";

// Copyright (c) 2019 nicolas.roumiantzeff@gmail.com licensed under a Creative Commons Attribution-ShareAlike 4.0 International License https://creativecommons.org/licenses/by-sa/4.0/
// Credit to Professor Frisby's Mostly Adequate Guide to Functional Programming https://github.com/MostlyAdequate/mostly-adequate-guide/blob/ch13.md/ch13.md

logger("***********************************************************************" + "\n" +
	"13. Monoids bring it all together *************************************" + "\n\n");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Wild combination

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Abstracting addition

(function(){

/*
	const Sum = x => ({
		x,
		concat: other => Sum(x + other.x)
	})
*/
	const Sum = Monoid(function Sum(x, y){ return x + y; });

	Sum(1)(concat)(Sum(3))
		(inspect)(assert("Sum(4)", "Sum(1)(concat)(Sum(3))", x => logger(x)));
	// Sum(4)

	Sum(4)(concat)(Sum(37))
		(inspect)(assert("Sum(41)", "Sum(4)(concat)(Sum(37))", x => logger(x)));
	// Sum(41)
})();

(function(){

/*
	const Product = x => ({ x, concat: other => Product(x * other.x) })
	const Min = x => ({ x, concat: other => Min(x < other.x ? x : other.x) })
	const Max = x => ({ x, concat: other => Max(x > other.x ? x : other.x) })
*/

	//additional example
	Product(2)(concat)(Product(3))
		(inspect)(assert("Product(6)", "Product(2)(concat)(Product(3))", x => logger(x)));
	// Product(6)

	//additional example
	Min(12)(concat)(Min(5))(concat)(Min(8))
		(inspect)(assert("Min(5)", "Min(12)(concat)(Min(5))(concat)(Min(8))", x => logger(x)));
	// Min(5)

	//additional example
	Max(12)(concat)(Max(15))(concat)(Max(8))
		(inspect)(assert("Max(15)", "Max(12)(concat)(Max(15))(concat)(Max(8))", x => logger(x)));
	// Max(15)
})();

(function(){

/*
	const Any = x => ({ x, concat: other => Any(x || other.x) })
	const All = x => ({ x, concat: other => All(x && other.x) })
*/
	const Any = Monoid(function Any(x, y){ return x || y; });
	const All = Monoid(function All(x, y){ return x && y; });

	Any(false)(concat)(Any(true))
		(inspect)(assert("Any(true)", "Any(false)(concat)(Any(true))", x => logger(x)));
	// Any(true)

	Any(false)(concat)(Any(false))
		(inspect)(assert("Any(false)", "Any(false)(concat)(Any(false))", x => logger(x)));
	// Any(false)

	All(false)(concat)(All(true))
		(inspect)(assert("All(false)", "All(false)(concat)(All(true))", x => logger(x)));
	// All(false)

	All(true)(concat)(All(true))
		(inspect)(assert("All(true)", "All(true)(concat)(All(true))", x => logger(x)));
	// All(true)

		assert("[1,2,3,4]", "[1,2].concat([3,4])", x => logger(x))(inspect(
	[1,2].concat([3,4])
		));
	// [1,2,3,4]

	Map()({day: 'night'})(concat)(Map()({white: 'nikes'}))
		(inspect)(assert("Map({'day':'night','white':'nikes'})", "Map()({day: 'night'})(concat)(Map()({white: 'nikes'}))", x => logger(x)));
	// Map({'day':'night','white':'nikes'})
})();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All my favourite functors are semigroups

(function(){

/*
	Identity.prototype.concat = function(other) {
		return new Identity(this.__value.concat(other.__value))
	}
*/

	Identity(of)(Sum(4))(concat)(Identity(of)(Sum(1)))
		(inspect)(assert("Identity(Sum(5))", "Identity(of)(Sum(4))(concat)(Identity(of)(Sum(1)))", x => logger(x)));
	// Identity(Sum(5))

/*
	// TypeError: this.__value.concat is not a function
*/
	//difference concat function also supports "+" operator
	Identity(of)(4)(concat)(Identity(of)(1))
		(inspect)(assert("Identity(5)", "Identity(of)(4)(concat)(Identity(of)(1))", x => logger(x)));
	// Identity(5)

})();

(function(){

	// combine with error handling
	Right(Sum(2))(concat)(Right(Sum(3)))
		(inspect)(assert("Right(Sum(5))", "Right(Sum(2))(concat)(Right(Sum(3)))", x => logger(x)));
	// Right(Sum(5))

	Right(Sum(2))(concat)(Left('some error'))
		(inspect)(assert("Left('some error')", "Right(Sum(2))(concat)(Left('some error'))", x => logger(x)));
	// Left('some error')

	//additional example
	Left('some error')(concat)(Right(Sum(3)))
		(inspect)(assert("Left('some error')", "Left('some error')(concat)(Right(Sum(3)))", x => logger(x)));
	// Left('some error')

	//additional example
	Left('some error')(concat)(Left('some other error'))
		(inspect)(assert("Left('some error')", "Left('some error')(concat)(Left('some other error'))", x => logger(x)));
	// Left('some error')

	//additional example
	Maybe(of)(Sum(2))(concat)(Maybe(of)(Sum(3)))
		(inspect)(assert("Just(Sum(5))", "Maybe(of)(Sum(2))(concat)(Maybe(of)(Sum(3)))", x => logger(x)));
	// Just(Sum(5))

	//additional example
	Maybe(of)(Sum(2))(concat)(Maybe(of)(null))
		(inspect)(assert("Just(Sum(2))", "Maybe(of)(Sum(2))(concat)(Maybe(of)(null))", x => logger(x)));
	// Just(Sum(2))

	//additional example
	Maybe(of)(null)(concat)(Maybe(of)(Sum(3)))
		(inspect)(assert("Just(Sum(3))", "Maybe(of)(null)(concat)(Maybe(of)(Sum(3)))", x => logger(x)));
	// Just(Sum(3))

	//additional example
	Maybe(of)(null)(concat)(Maybe(of)(undefined))
		(inspect)(assert("Nothing", "Maybe(of)(null)(concat)(Maybe(of)(undefined))", x => logger(x)));
	// Nothing

	// combine async
	Task(of)([1,2])(concat)(Task(of)([3,4]))
		(inspect)(assert("Task([1,2,3,4])", "Task(of)([1,2])(concat)(Task(of)([3,4]))", x => logger(x)));
	// Task([1,2,3,4])
})();

(function(){

	//mock
	// formValues :: Selector -> IO (Map String String)
	const formValues = function(selector){
		if(selector === "#signup"){
			return IO(of)(Map(of)({ username: 'andre3000' }));
		}
		if(selector === "#terms"){
			return IO(of)(Map(of)({ accepted: true }));
		}
		return IO(of)(Map);
	};

	//mock
	// validate :: Map String String -> Either Error (Map String String)
	const validate = function(m){
		if(m(toObject)() != null){
			return Right(m);
		}
		return Left('one must accept our totalitarian agreement');
	};

	formValues('#signup')(map)(validate)(concat)(formValues('#terms')(map)(validate))
		(inspect)(assert("IO(Right(Map({'username':'andre3000','accepted':true})))", "formValues('#signup')(map)(validate)(concat)(formValues('#terms')(map)(validate))", x => logger(x)));
	// IO(Right(Map({'username':'andre3000','accepted':true})))
})();

(function(){

	//mock
	// formValues :: Selector -> IO (Map String String)
	const formValues = function(selector){
		if(selector === "#signup"){
			return IO(of)(Map(of)({ username: 'andre3000' }));
		}
		// no terms
		return IO(of)(Map);
	};

	//mock
	// validate :: Map String String -> Either Error (Map String String)
	const validate = function(map){
		if(map(toObject)() != null){
			return Right(map);
		}
		return Left('one must accept our totalitarian agreement');
	};

	formValues('#signup')(map)(validate)(concat)(formValues('#terms')(map)(validate))
		(inspect)(assert("IO(Left('one must accept our totalitarian agreement'))", "formValues('#signup')(map)(validate)(concat)(formValues('#terms')(map)(validate))", x => logger(x)));
	// IO(Left('one must accept our totalitarian agreement'))
})();

(function(){

	//mock
	const serverA = {
		get: function(path){
			if(path === "/friends"){
				return Task(of)(['friend1']);
			}
			return Task(of)([]);
		},
	};
	const serverB = {
		get: function(path){
			if(path === "/friends"){
				return Task(of)(['friend2']);
			}
			return Task(of)([]);
		},
	};

	serverA.get('/friends')(concat)(serverB.get('/friends'))
		(inspect)(assert("Task(['friend1','friend2'])", "serverA.get('/friends')(concat)(serverB.get('/friends'))", x => logger(x)));
	// Task(['friend1','friend2'])

})();

(function(){

	//mock
	// loadSetting :: String -> Task Error (Maybe (Map String Boolean))
	const loadSetting = function(setting){
		if(setting === "general"){
			return Task(of)(Maybe(of)(Map(of)({ autoSave: false })));
		}
		if(setting === "email"){
			return Task(of)(Maybe(of)(Map(of)({ backgroundColor: true })));
		}
	}
/*
	//bug
	// Task(Maybe(Map({'backgroundColor':true,'autoSave':false})))
*/
	loadSetting('email')(concat)(loadSetting('general'))
		(inspect)(assert("Task(Just(Map({'backgroundColor':true,'autoSave':false})))", "loadSetting('email')(concat)(loadSetting('general'))", x => logger(x)));
	// Task(Just(Map({'backgroundColor':true,'autoSave':false})))
})();

(function(){

	//mock
	const fs = {
		readFile: function(filename, callback){
			if(filename === 'metamorphosis'){
				setTimeout(function(){
					return callback(null, 'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.\n...');
				}, 1000);
			}
			if(filename === 'genesis'){
				setTimeout(function(){
					return callback(null, 'In the beginning God created the heaven and the earth.\nAnd the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.');
				}, 1000);
			}
		},
	};

	// readFile :: String -> Task Error String
	const readFile = filename => Task()((reject, result) => {
		fs.readFile(filename, (err, data) => (err ? reject(err) : result(data)));
	});

	//additional example
		const result = function(data){
			if(data === "In the beginning God created the heaven and the earth."){
				result1(data);
			}
			else if(data === "One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug."){
				result2(data);
			}
			else{
				return reject(data);
			}
		};
		const result1 = data => assert("'In the beginning God created the heaven and the earth.'", "readFile('genesis')(map)(split('\n'))(map)(head)(concat)(readFile('metamorphosis')(map)(split('\n'))(map)(head))(fork)(reject, result)", x => logger(x))(inspect(data));
		const result2 = data => assert("'One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.'", "readFile('genesis')(map)(split('\n'))(map)(head)(concat)(readFile('metamorphosis')(map)(split('\n'))(map)(head))(fork)(reject, result)", x => logger(x))(inspect(data));
		const reject = error => assert('null', "readFile('genesis')(map)(split('\n'))(map)(head)(concat)(readFile('metamorphosis')(map)(split('\n'))(map)(head))(fork)(reject, result)", x => logger(x))(inspect(error));
	readFile('genesis')(map)(split('\n'))(map)(head)(concat)(readFile('metamorphosis')(map)(split('\n'))(map)(head))(fork)(reject, result)
	// 'In the beginning God created the heaven and the earth.One morning, as Gregor Samsa was waking up from anxious dreams, he discovered that in bed he had been changed into a monstrous verminous bug.'
})();


(function(){

/*
	const Analytics = (clicks, path, idleTime) => ({
		clicks,
		path,
		idleTime,
		concat: other =>
			Analytics(clicks.concat(other.clicks), path.concat(other.path), idleTime.concat(other.idleTime))
	})
*/

	//mock
	const Analytics = DefineType('Analytics', define(function functorCombinators(name, combinators, type, definition, combinator, recombinators, value, implementation, subtype){
		if(combinator === undefined){
			// (Analytics)() :: (Clicks, Path, IdleTime) -> Analytics (Clicks, Path, IdleTime)
			return (clicks, path, idleTime) => definition({ clicks, path, idleTime, });
		}
		if(combinator === concatenation){
			// (Analytics (Clicks, Path, IdleTime))(concatenation) :: ((Clicks, Path, IdleTime), (Clicks, Path, IdleTime)) -> (Clicks, Path, IdleTime)
			return function(x, y){
				return {
					clicks: concat(x.clicks, y.clicks),
					path: concat(x.path, y.path),
					idleTime: concat(x.idleTime, y.idleTime),
				};
			}; 
		}
		if(combinator === inspect){
			// (Analytics)(inspect) :: (String -> String) -> String
			return f => f(`${functionName(subtype)||name}(${inspect(implementation.clicks)},${inspect(implementation.path)},${inspect(implementation.idleTime)})`);
		}
	}, Concatenation(shareCombinators)))();

	Analytics(Sum(2), ['/home', '/about'], Right(Max(2000)))(concat)(Analytics(Sum(1), ['/contact'], Right(Max(1000))))
		(inspect)(assert("Analytics(Sum(3),['/home','/about','/contact'],Right(Max(2000)))", "Analytics(Sum(2), ['/home', '/about'], Right(Max(2000)))(concat)(Analytics(Sum(1), ['/contact'], Right(Max(1000))))", x => logger(x)));
	// Analytics(Sum(3),['/home','/about','/contact'],Right(Max(2000)))
})();


(function(){

	Map()({clicks: Sum(2), path: ['/home', '/about'], idleTime: Right(Max(2000))})(concat)(Map()({clicks: Sum(1), path: ['/contact'], idleTime: Right(Max(1000))}))
		(inspect)(assert("Map({'clicks':Sum(3),'path':['/home','/about','/contact'],'idleTime':Right(Max(2000))})", "Map()({clicks: Sum(2), path: ['/home', '/about'], idleTime: Right(Max(2000))})(concat)(Map()({clicks: Sum(1), path: ['/contact'], idleTime: Right(Max(1000))}))", x => logger(x)));
	// Map({'clicks':Sum(3),'path':['/home','/about','/contact'],'idleTime':Right(Max(2000))})

})();

logger("***********************************************************************" + "\n");
