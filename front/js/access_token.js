token = {
	gen: function(access_token, callback) {
		$.ajax({
			type: "POST",
			url: SERVER + "gen",
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": access_token
			},
			error: function() {
				$.miniNoty("Ошибка проверки access_token", "error");
				return false;
			},
			success: function(data) {
				console.log(data);
				if (data["code"] != undefined) {
					if (!!callback) {
						callback(data["code"]);
					}
					return data["code"];
				}
				else {
					if (!!callback) {
						callback(false);
					}
					return false;
				}
			},
			timeout: TIMEOUT
		});
	},
	auth: function(email, password, callback) {
		$.ajax({
			type: "POST",
			url: SERVER + "auth",
			crossDomain: true,
			jsonp: "jsonp",
			data: {
				"email": email,
				"password": password
			},
			error: function() {
				if (!!callback) {
					callback(false);
				}
				return false;
			},
			success: function(data) {
				data["token"] = data["token"].replace(/(\r\n|\n|\r)/gm, " ");
				if (!!callback) {
					callback(data["token"]);
				}
				return data["token"];
			},
			timeout: TIMEOUT
		});
	}
}