angular.module("fishmograph", ["ui.router", "ui-notification"])

// --- FISHMOGRAPH API ---
// Host address
.constant("FH_HOST", "http://192.168.1.200")

// Login/Logout
.constant("FH_API_LOGIN", "/login")
.constant("FH_API_LOGOUT", "/logout")


.config(function ($urlRouterProvider, $locationProvider, $urlMatcherFactoryProvider, $stateProvider, $httpProvider, NotificationProvider) {

	// --- ROUTES ---
	// ui-router non strict mode and case insensitive
	$urlMatcherFactoryProvider.caseInsensitive(true);
	$urlMatcherFactoryProvider.strictMode(false); 

	// Index state (redirect to earthquakes)
	$stateProvider.state("index", {
		redirectTo: "login",
		url: "/"
	});

	// Login state
	$stateProvider.state("login", {
		controller: "loginCtrl",
		templateUrl: "login.htm",
		url: "/login"
	});

	// Container logged area
	$stateProvider.state("page", {
		controller: "pageCtrl",
		templateUrl: "cntr.htm",
		data: {
			requireLogin: true // every child state require login
		},
		redirectTo: "page.earthquakes"
	});

	// Earthquakes
	$stateProvider.state("page.earthquakes", {
		controller: "earthquakesCtrl",
		templateUrl: "earthqks.htm",
		url: "/earthquakes"
	});

	// D7S readings
	$stateProvider.state("page.d7s", {
		controller: "d7sCtrl",
		templateUrl: "d7s.htm",
		url: "/d7s"
	});

	// Alerts
	// Container
	$stateProvider.state("page.alerts", {
		controller: "alertsCtrl",
		template: "<ui-view></ui-view>",
		url: "/alerts"
	});
	$stateProvider.state("page.alerts.list", {
		controller: "alertsListCtrl",
		templateUrl: "alerts.htm",
		url: "/list"
	});
	$stateProvider.state("page.alerts.new", {
		controller: "alertsNewCtrl",
		templateUrl: "alert_nw.htm",
		url: "/new"
	});

	// Settings
	$stateProvider.state("page.settings", {
		controller: "settingsCtrl",
		templateUrl: "settings.htm",
		url: "/settings"
	});

	// Credits and license
	$stateProvider.state("page.credits", {
		controller: "creditsCtrl",
		templateUrl: "credits.htm",
		url: "/credits"
	});


	$urlRouterProvider.when("", function ($state) {
		$state.go("index");
	});

	//error404 main routes
	$urlRouterProvider.otherwise(function ($injector) {
		//getting $state service from $injector
		$state = $injector.get("$state");
		//transition to the error404 state
		//$state.go("index");

		alert("ERRORE 404");
	});

	// --- HTTP CONFIG ---
	$httpProvider.defaults.withCredentials = true;
	//$httpProvider.defaults.headers.common["Content-Type"] = "text/plain";

	// --- NOTIFICATIONS ---
	NotificationProvider.setOptions({
        delay: 10000,
        startTop: 20,
        startRight: 10,
        verticalSpacing: 10,
        horizontalSpacing: 10,
        positionX: 'center',
        positionY: 'top'
    });

})

.run(function ($state, $transitions, LoginService) {
	// If the user is already logged in (session is valid) redirect him to the logged page (only performed once at app startup)
	// Check if the user is already logged in
	LoginService.login().then(function () {
		$state.go("page.earthquakes");
	}, function () {
		$state.go("login");
	}).finally(function () {
		// Check if the user is autenticated, otherwise redirect him to the login page
		$transitions.onStart({ }, function(transition) {
			//if the state require the login and the user is not logged
			if (transition.to().name != "login" && transition.to().data !== undefined && transition.to().data.requireLogin && !LoginService.isUserLogged()) {
				alert(transition.to().name);
				return transition.router.stateService.target('login');
			}
		});
	})
})

// --- SERVICES ---
// Login service
.factory("LoginService", function ($q, $http, FH_HOST, FH_API_LOGIN, FH_API_LOGOUT) {
	// User status
	var isLogged = false;

	// Function to log in a user
	function login(password) {
		var deferred = $q.defer();
		
		$http({
			method: 'POST',
			url: FH_HOST + FH_API_LOGIN,
			headers: {
   				'Content-Type': undefined
 			},
			data: {
				password: password
			}
		// Success
		}).then(function () {
			// Saving the success login status
			isLogged = true;
			// Resolving the promise
			deferred.resolve();
		// Error
		}, function () {
			// Resolving the promise
			deferred.reject();
		});

		return deferred.promise;
	}
		
	// Function to logout a user
	function logout(request = true) {
		var deferred = $q.defer();
		// If the logout need to be sent to the server
		if (request) {
			$http({
				method: 'POST',
				url: FH_HOST + FH_API_LOGOUT,
				headers: {
	   				'Content-Type': undefined
	 			}
			// Success
			}).then(function () {
				// Saving the success logout status
				isLogged = false;
				// Resolving the promise
				deferred.resolve();
			// Error
			}, function () {
				// Resolving the promise
				deferred.reject();
			});
		} else {
			isLogged = false;
		}
		
		return deferred.promise;
	}

	// Function to check if a user is logged
	function isUserLogged() {
		return isLogged;
	}

	// Return the service object
	return {
		login: login, //login function
		logout: logout, //logout function
		isUserLogged: isUserLogged, //check if the user is logged
	};

})

// Notification service
.factory("AlertService", function (Notification) {
	// Show a success alert
	function success(message) {
		Notification({templateUrl: "alert-success.html", message: message});
	}

	// Show a warning alert
	function warning(message) {
		Notification({templateUrl: "alert-warning.html", message: message});
	}

	// Show a danger alert
	function danger(message) {
		Notification({templateUrl: "alert-danger.html", message: message});
	}

	// Return the service object
	return {
		success: success, // Show a success alert
		warning: warning, // Show a warning alert
		danger: danger // Show a danger alert
	};
})

// Authorized http service
// It will send the request using $http service, if the response is 401 (Unauthorized) the user is redirected to login
.factory("AuthorizedHttp", function($http, $state, LoginService, AlertService) {

	function request(request) {
		var deferred = $q.defer();
		
		$http(request).then(function (response) {
			// Resolving the promise
			deferred.resolve(response);
		// Error
		}, function (response) {
			// If the user is not autorized
			if (response.status == 401) {
				// Logout the user and redirect him to the login page
				LoginService.logout(false).then(function () {
					$state.go("login");
				}, function () {
					AlertService.danger("The server has encountered some problems. Try again later!");
				});
			}
			// Resolving the promise
			deferred.reject(response);
		});

		return deferred.promise;
	}

	return {
		request: request
	};
})


// --- CONTROLLERS ---
// Earthquakes page controller
.controller("loginCtrl", function ($scope, $state, LoginService, AlertService, AuthorizedHttp) {
	// If the user is already logged in redirect him to the logged page
	// Check if the user is already logged in
	if (LoginService.isUserLogged()) {
		$state.go("page.earthquakes");
	}

	// Login the user
	$scope.login = function (password) {
		// If password is undefined put an empty string
		if (password == undefined) {
			password = "";
		}

		LoginService.login(password).then(function () {
			$state.go("page.earthquakes");
		}, function () {
			AlertService.danger("The password is wrong!");
		});
	}
})

// Menu controller
.controller("pageCtrl", function ($scope, $state, LoginService, AlertService) {
	var pageTitle = "";
	var menuItemHighlighted = -1;
	
	// Set the page title
	$scope.setPageTitle = function (title) {
		pageTitle = title;
	};
	// Set the menu item to highlight
	$scope.setMenuItemHighlighted = function (item) {
		menuItemHighlighted = item;
	};

	// Get the page title
	$scope.getPageTitle = function (item) {
		return pageTitle;
	};

	// Check if the current menu item is active
	$scope.isMenuItemHighlighted = function (item) {
		return item == menuItemHighlighted;
	};

	// Logout
	$scope.logout = function () {
		LoginService.logout(true).then(function () {
			$state.go("login");
		}, function () {
			AlertService.danger("The server has encountered some problems. Try again later!");
		});
	}
})

// Earthquakes page controller
.controller("earthquakesCtrl", function ($scope) {
	// Set page title and highlight the menu item
	$scope.setPageTitle("Earthquakes Registered");
	$scope.setMenuItemHighlighted(0);
})

// D7S Readings page controller
.controller("d7sCtrl", function ($scope) {
	// Set page title and highlight the menu item
	$scope.setPageTitle("D7S Readings");
	$scope.setMenuItemHighlighted(1);
})

// Alerts container page controller
.controller("alertsCtrl", function ($scope) {
	// Set page title and highlight the menu item
	$scope.setPageTitle("Email Alerts");
	$scope.setMenuItemHighlighted(2);
})

// Alerts list page controller
.controller("alertsListCtrl", function ($scope) {
	
})

// New alert page controller
.controller("alertsNewCtrl", function ($scope) {
	
})

// Settings page controller
.controller("settingsCtrl", function ($scope, Notification) {
	var activePanel = 0;

	// Set page title and highlight the menu item
	$scope.setPageTitle("Fishmograph Settings");
	$scope.setMenuItemHighlighted(3);

	// Set the active panel
	$scope.setActivePanel = function (item) {
		activePanel = item;
	};

	// Check if the current panel is active
	$scope.isPanelActive = function (item) {
		return item == activePanel;
	};
})

// Credits page controller
.controller("creditsCtrl", function ($scope) {
	var activePanel = 0;

	// Set page title and highlight the menu item
	$scope.setPageTitle("Credits & License");
	$scope.setMenuItemHighlighted(4);

	// Set the active panel
	$scope.setActivePanel = function (item) {
		activePanel = item;
	};

	// Check if the current panel is active
	$scope.isPanelActive = function (item) {
		return item == activePanel;
	};
});