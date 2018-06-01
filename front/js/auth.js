var Auth = function(access_token) {
	if(access_token == false) {
		$.miniNoty("Ошибка авторизации", "error");
	}
	else {
		deleteCookie("access_token");
		setCookie("access_token", access_token, 31536000);
		location.replace("./cloud.html");
	}
}


$(document).ready(function() {
	$("title").text(TITLE + " - Авторизация");
	if(getCookie("access_token") != undefined){
		var Tokengen = function(code) {
			if(code == false) {
				deleteCookie("access_token");
			}
			else {
				location.replace("./cloud.html");
			}
		}

		token.gen(getCookie("access_token"), Tokengen);
	}

	$("body").on("click", "#login-btn", function() {
		var data = new Array();
		data["email"] = $("#email").val();
		data["password"] = $("#password").val();

		var access_token = token.auth(data["email"], data["password"], Auth);
	});

	$("body").on("click", ".signup-link", function() {
		$(".shade").show();
		$(".signup-box").show();
		$("#signup-email").focus();
	});

	$("body").on("click", ".shade", function() {
		$(".shade").hide();
		$(".signup-box").hide();
	});

	// Регистрация
	$("body").on("click", "#signup-btn", function() {
		var email = $("#signup-email").val();
		var password = new Array();
		password[0] = $("#signup-password").val();
		password[1] = $("#signup-password-repeat").val();

		if(!email.match(/[A-Z0-9.-_]{1,}@[A-Z0-9.-_]{1,}/i)) {
			$.miniNoty("Неправильно заполнено поле E-Mail", "error");
			$("#signup-email").focus();
			return false;
		}

		if(password[0].length <= 0) {
			$.miniNoty("Пароль не может быть менее 4 символов", "error");
			$("#signup-password").focus();
			return false;
		}

		if(password[0] != password[1]) {
			$.miniNoty("Пароли не совпадают", "error");
			return false;
		}

		$.ajax({
			type: "POST",
			url: SERVER + "reg",
			crossDomain : true,
			jsonp: "jsonp",
			data: {
				"email" : email,
				"password" : password[0]
			},
			error: function(data) {
				var message = jQuery.parseJSON(data["responseText"]);
				console.log(message["message"]);
				$.miniNoty(message["message"], "error");
			},
			success: function(data) { 
				if(data["message"] == "Created") {
					token.auth(email, password[0], Auth);
				}
				else {
					$.miniNoty(data["message"], "error");
				}
			},
			timeout: 10000
		});

	});
});