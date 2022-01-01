"use strict";

function AnteScript38bcbbba54324bf388d8c776e9b184f3(error){
	function applicationType(){
	}
	function definitionType(){
	}
	function specificationType(){
	}
	function implementationType(){
	}
	function declarationType(){
	}
	function extensionType(){
	}
	function errorType(){
	}
	function TYPE(value, type){
		if (type !== undefined){
			return value !== null && typeof(value) === "object" && value.type === type;
		}
		if (typeof(value) ===  "function"){
			return value(TYPE);
		}
	}
	let memoization = new(Map)();
	function APPLICATION(application, definition){
		if (definition === TYPE){
			return applicationType;
		}
		if (definition === undefined){
			return [application];
		}
		switch (TYPE(definition)){
			case applicationType: return APPLICATIONS(definition, application);
			case definitionType: return definition(application);
		}
		return error && error("applications applied to an invalid definition or invalid application", [application]);
	}
	function APPLICATIONS(application, ...applications){
		return function(definition){
			if (definition === TYPE){
				return applicationType;
			}
			if (definition === undefined){
				return  [application, ...applications];
			}
			switch (TYPE(definition)){
				case applicationType: return APPLICATIONS(definition, application, ...applications);
				case definitionType: {
					return [application, ...applications].reduce(function(definition, application){
						if (typeof(definition) === "function"){	
							return application(definition);
						}
					}, definition);
				}
			}
			return error && error("applications applied to an invalid definition or invalid application", [application, ...applications]);
		};
	}
	function DEFINITIONS(applications, specifications, implementations, values, delegation, definition){
		return function DEFINITION(application){
			if (application === TYPE){
				return definitionType;
			}
			if (application === undefined){
				return specifications;
			}
			if (TYPE(application) === applicationType){
				const implementation = implementations === undefined? undefined: implementations(application, true);
				if (implementation !== undefined){
					if(!TYPE(implementation, implementationType)){
						if (typeof(implementation) === "function"){
							const encapsulation = implementation(definition?? DEFINITION);
							if (typeof(encapsulation) === "function"){
								return encapsulation(...values);
							}
						}
						return error && error("applications applied to an invalid function", [...applications, application]);
					}
				}
				const specification = specifications === undefined? undefined: specifications(application, true);
				if (implementation === undefined){
					if(!TYPE(specification, specificationType)){
						if (specification !== undefined && typeof(specification) === "function"){
							return specification(definition?? DEFINITION);
						}
						if (delegation){
							const delegate = (typeof(delegation) === "function"? delegation: DELEGATION)(definition?? DEFINITION, [...applications, application].reduce((applications, application) => application(applications)));
							if (typeof(delegate) === "function"){
								return delegate(...values);
							}
						}
						return error && error("unexpected applications", [...applications, application]);
					}
				}
				return DEFINITIONS([...applications, application], specification === undefined? undefined: specification.mapping, implementation === undefined? undefined: implementation.mapping, values, delegation, definition?? DEFINITION);
			}
			return error && error("incorrect application", [...applications, application]);
		};
	}
	function OVERSUPPLY(implementations, specifications, ...applications){
		return implementations().reduce(function(oversupply, application){
			if (oversupply !== undefined){
				return oversupply;
			}
			const implementation = implementations(application);
			const specification = specifications(application);
			if (specification === errorType){
				return [application, ...applications];
			}
			if (TYPE(implementation, implementationType)){
				if (TYPE(specification, specificationType)){
					return OVERSUPPLY(implementation.mapping, specification.mapping, application, ...applications);
				}
				return [application, ...applications];
			}
			if (specification !== undefined){
				return [application, ...applications];
			}
		}, undefined);
	}
	function UNDERSUPPLY(implementations, specifications, ...applications){
		return specifications().reduce(function(undersupply, application){
			if (undersupply !== undefined){
				return undersupply;
			}
			const implementation = implementations === undefined? undefined: implementations(application);
			const specification = specifications(application);
			if (TYPE(specification, specificationType)){
				if (implementation === errorType){
					return UNDERSUPPLY(undefined, specification.mapping, application, ...applications);
				}
				if (TYPE(implementation, implementationType)){
					return UNDERSUPPLY(implementation.mapping, specification.mapping, application, ...applications);
				}
				return [application, ...applications];
			}
			if (specification === undefined){
				if (implementation === undefined){
					return [application, ...applications];
				}
			}
		}, undefined);
	}
	function DUPLICATION(type, specificationsOrImplementations0, specificationsOrImplementations, ...applications){
		return specificationsOrImplementations().reduce(function(duplication, application){
			if (duplication !== undefined){
				return duplication;
			}
			const specificationOrImplementation0 = specificationsOrImplementations0(application);
			if (specificationOrImplementation0 !== errorType){
				const specificationOrImplementation = specificationsOrImplementations(application);
				if (!TYPE(specificationOrImplementation0, type) || !TYPE(specificationOrImplementation, type)){
					return [application, ...applications];
				}
				return DUPLICATION(type, specificationOrImplementation0.mapping, specificationOrImplementation.mapping, application, ...applications);
			}
		}, undefined);
	}
	function SPECIFICATIONS(specifications0, specifications){
		const entries0 = specifications0.mapping().reduce(function(entries, application){
			const specification0 = specifications0.mapping(application);
			const specification = specifications === errorType? errorType: specifications.mapping(application);
			if (specification === errorType){
				return [...entries, [application, specification0]];
			}
			if (!TYPE(specification, specificationType)){
				return [...entries, [application, specification0]];
			}
			return [...entries, [application, SPECIFICATIONS(specification0, specification)]];
		}, []);
		const entries1 = specifications.mapping().reduce(function(entries, application){
			const specification = specifications.mapping(application);
			const specification0 = specifications0 === errorType? errorType: specifications0.mapping(application);
			if (specification0 === errorType){
				return [...entries, [application, specification]];
			}
			if (!TYPE(specification0, specificationType)){
				return [...entries, [application, specification]];
			}
			return entries;
		}, entries0);
		return SPECIFICATION(entries1);
	}
	function IMPLEMENTATIONS(implementations0, implementations){
		const entries0 = implementations0.mapping().reduce(function(entries, application){
			const implementation0 = implementations0.mapping(application);
			const implementation = implementations === errorType? errorType: implementations.mapping(application);
			if (implementation === errorType){
				return [...entries, [application, implementation0]];
			}
			if (!TYPE(implementation, implementationType)){
				return [...entries, [application, implementation0]];
			}
			return [...entries, [application, IMPLEMENTATIONS(implementation0, implementation)]];
		}, []);
		const entries1 = implementations.mapping().reduce(function(entries, application){
			const implementation = implementations.mapping(application);
			const implementation0 = implementations0 === errorType? errorType: implementations0.mapping(application);
			if (implementation0 === errorType){
				return [...entries, [application, implementation]];
			}
			if (!TYPE(implementation0, implementationType)){
				return [...entries, [application, implementation]];
			}
			return entries;
		}, entries0);
		return IMPLEMENTATION(entries1);
	}
	function EXTENSION(specification, implementation){
		return function(extension){
			if (TYPE(extension, specificationType)){
				const duplication1 = DUPLICATION(specificationType, specification.mapping, extension.mapping);
				if (duplication1 !== undefined){
					return error && error("extension specification duplication", duplication1);
				}
				return SPECIFICATIONS(specification, extension);
			}
			if (TYPE(extension, implementationType)){
				const duplication2 = DUPLICATION(implementationType, implementation.mapping, extension.mapping);
				if (duplication2 !== undefined){
					return error && error("extension implementation duplication", duplication2);
				}
				return IMPLEMENTATIONS(implementation, extension);
			}
			return error && error("invalid specification or implementation extension");
		};
	}
	function EXTENSIONS(specifications0){
		return function(specifications){
			if (!TYPE(specifications, specificationType)){
				return error && error("invalid extension specifications");
			}
			const duplication = DUPLICATION(specificationType, specifications0.mapping, specifications.mapping);
			if (duplication !== undefined){
				return error && error("specification duplication", duplication);
			}
			const specifications1 = SPECIFICATIONS(specifications0, specifications);
			return specifications1;
		};
	}
	function DELEGATION(definition, applications){
		return function(delegation){
			return applications(delegation);
		};
	}
	return {
		APPLICATION: function(name){
			const memoized = memoization.get(name);
			if (memoized !== undefined){
				return memoized;
			}
			const naming = {
				[name]: function(definition){
					return APPLICATION(application, definition);
				},
			};
			const application = naming[name];
			memoization.set(name, application);
			return application;
		},
		SPECIFICATION: function SPECIFICATION(specifications){
			const map = new(WeakMap)(specifications);
			return {
				mapping: function(application, runtime){
					if (application === TYPE){
						return specificationType;
					}
					if (application === extensionType){
						return EXTENSIONS(SPECIFICATION(specifications));
					}
					if (application === undefined){
						return specifications.map(item => item[0]);
					}
					const value = map.get(application);
					if (runtime || value !== undefined || map.has(application)){
						return value;
					}
					return errorType;
				},
				type: specificationType,
			}; 
		},
		IMPLEMENTATION: function IMPLEMENTATION(implementations){
			const map = new(WeakMap)(implementations);
			return {
				mapping: function(application, runtime){
					if (application === TYPE){
						return implementationType;
					}
					if (application === extensionType){
						return EXTENSIONS(IMPLEMENTATION(implementations));
					}
					if (application === undefined){
						return implementations.map(item => item[0]);
					}
					const value = map.get(application);
					if (runtime || value !== undefined || map.has(application)){
						return value;
					}
					return errorType;
				},
				type: implementationType,
			}; 
		},
		DECLARATION: function(specification, implementation, delegation){
			if (specification !== undefined || delegation === undefined){
				if (!TYPE(specification, specificationType)){
					return error && error("invalid specification");
				}
				if (implementation !== undefined){
					if (!TYPE(implementation, implementationType)){
						return error && error("invalid implementation");
					}
					const oversupply = OVERSUPPLY(implementation.mapping, specification.mapping);
					if (oversupply !== undefined){
						return error && error("unexpected implementation", oversupply);
					}
					if (delegation === undefined){
						const undersupply = UNDERSUPPLY(implementation.mapping, specification.mapping);
						if (undersupply !== undefined){
							return error && error("missing implementation", undersupply);
						}
					}
				}
			}
			return function(...values){
				switch(values[0]){
					case TYPE: return declarationType;
					case extensionType: return EXTENSION(specification, implementation);
				}
				return DEFINITIONS([], specification === undefined? undefined: specification.mapping, implementation === undefined? undefined: implementation.mapping, values, delegation);
			}
		},
		EXTENSION: function(declaration){
			if (declaration === undefined){
				return x => x;
			}
			if (TYPE(declaration) === declarationType){
				return declaration(extensionType);
			}
			if (TYPE(declaration, specificationType)){
				return declaration.mapping(extensionType);
			}
			return error && error("invalid declaration");
		},
	};
}