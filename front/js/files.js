files = {
	loading: function(src) {
		// $(".folders").hide();
		$(".loader").show();
		$(".shade").show();
		if (src == undefined) src = "";
		$.ajax({
			type: "GET",
			url: SERVER + "list" + src,
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Снова ебучий амазон лежит", "error");
				console.log(0);
			},
			success: function(data) {
				console.log(data);
				files.printload(data, src);
			},
			timeout: TIMEOUT
		});
	},
	printload: function(data, src) {
		console.log(data);
		$(".folders").html("");
		if (!!src && src != "/") {
			var temp = src.split("/");
			if (temp.length > 1) {
				var temp = temp[temp.length - 2];
				var tempSrc = temp;
				if (temp.length == 0) {
					temp = "Cloud";
					tempSrc = "";
				}
				$(".folders").append('\
						<div class="folder-box" title="' + temp + '" format="" main="1" type="folder" src="/' + tempSrc + '" link="">\
							<img src="./images/folder-open.png">\
							' + temp + '\
						</div>');
			}
		}
		else {
			src = "";
		}
		for (var i = 0; i < data["folders"].length; i++) {
			var image = data["folders"][i]["size"] > 0 ? './images/folder-documents.png' : './images/folder528.png';
			$(".folders").append('\
						<div class="folder-box" title="' + data["folders"][i]["name"] + '" format="" type="folder" src="' + src + '/' + data["folders"][i]["name"] + '" link="">\
							<img src="' + image + '">\
							' + data["folders"][i]["name"] + '\
						</div>');
		}
		for (var i = 0; i < data["files"].length; i++) {
			if (data["files"][i]["name"].match(/./)) {
				var tmp = data["files"][i]["name"].split(".");
				var format = tmp[tmp.length - 1];
			}
			else {
				var format = "";
			}
			if (data["files"][i]["name"].length > 40) {
				var name = data["files"][i]["name"].substr(0, 37) + "..";
				name = format.length > 0 ? name + "" + format : name;
			}
			else {
				var name = data["files"][i]["name"];
			}
			// Форматы с иконками
			if (icoFile.indexOf(format) != -1) {
				var image = "./images/" + format + ".png";
			}
			// Аудио
			else if (audioFormat.indexOf(format) != -1) {
				var image = "./images/musical-notes.png";
			}
			// Видео
			else if (videoFormat.indexOf(format) != -1) {
				var image = "./images/video-file.png";
			}
			else {
				var image = "./images/file.png";
			}
			$(".folders").append('\
						<div class="folder-box" title="' + data["files"][i]["name"] + '" format="' + tmp[1] + '" type="file" size="' + data["files"][i]["size"] + '" src="' + src + '/' + data["files"][i]["name"] + '" link="">\
							<img src="./images/share.png" class="share-ico">\
							<img src="' + image + '">\
							' + name + '\
						</div>');
		}
		$.ajax({
			type: "GET",
			url: SERVER + "links",
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Чот с сервером", "error");
				console.log(0);
			},
			success: function(data) {
				console.log(data);
				for (var i = 0; i < data["message"].length; i++) {
					var tmp = "/" + data["message"][i]["key"];
					var file = $("[src='" + tmp + "']");
					if (file.length) {
						file.attr("public", data["message"][i]["link"]);
						file.attr("publicID", data["message"][i]["id"]);
						var tmp = file.find(".share-ico");
						tmp.show();
					}
				}
			},
			timeout: TIMEOUT
		});
		$(".loader").hide();
		$(".folders").show();
		$(".shade").hide();
		$(window).resize();
	},
	print: function() {},
	download: function(src, callback) {
		$.ajax({
			type: "GET",
			url: SERVER + "get" + src,
			crossDomain: true,
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Ошибка загрузки файла", "error");
				if (!!callback) {
					callback(false);
				}
				return false;
			},
			success: function(data) {
				console.log(data);
				if (!!data["code"]) {
					// window.location.href = SERVER + "download/" + data["code"];
					/* var download = $("#file-download-link");
					download.attr("href", SERVER + "download/" + data["code"]);
					download.attr("download", "filename");
					download.click(); */
					if (!!callback) {
						callback(SERVER + "download/" + data["code"]);
					}
					return SERVER + "download/" + data["code"];
				}
				else {
					$.miniNoty("Ошибка загрузки файла", "error");
					if (!!callback) {
						callback(false);
					}
					return false;
				}
				// window.location.href = data;
			},
			timeout: TIMEOUT
		});
	},
	delete: function(src, callback) {
		src = src.slice(1);
		$.ajax({
			type: "POST",
			url: SERVER + "delete",
			crossDomain: true,
			data: {
				source: src
			},
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				if (!!callback) {
					callback(false);
				}
				return false;
			},
			success: function(data) {
				console.log(data);
				if (!!callback) {
					callback(true);
				}
				return true;
			},
			timeout: TIMEOUT
		});
	},
	move: function(srcMove, srcNew, callback) {
		// Файл в подпапке 
		//if(file.match(/\./)) {
		/*
		if(type != "folder") {
			var srcMove = src + "/" + file;
			var srcNew = src + "/" + name;
		}
		else {
			var srcMove = src;
			var srcNew = file;
		}
		*/
		srcMove = srcMove.replace(/\/{1,}/g, "/").slice(1);
		srcNew = srcNew.replace(/\/{1,}/g, "/").slice(1);
		console.log(srcMove);
		console.log(srcNew);
		$.ajax({
			type: "POST",
			data: {
				"source": srcMove,
				"destination": srcNew
			},
			url: SERVER + "move",
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				if (!!callback) {
					callback(false);
				}
				return false;
			},
			success: function(data) {
				console.log(data);
				if (!!callback) {
					callback(true);
				}
				return true;
			},
			timeout: TIMEOUT
		});
	},
	folder: function(src, callback) {
		src = src.replace(/\/{1,}/g, "/");
		console.log(src);
		$.ajax({
			type: "PUT",
			url: SERVER + "mkdir" + src,
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				if (!!callback) {
					callback(false);
				}
				return false;
			},
			success: function(data) {
				console.log(data);
				if (!!callback) {
					callback(true);
				}
				return true;
			},
			timeout: TIMEOUT
		});
	},
	users: function(callback) {
		$.ajax({
			type: "GET",
			url: SERVER + "shareEnv",
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Ошибка подключения", "error");
				console.log(0);
			},
			success: function(data) {
				console.log(data);
				callback(data);
			},
			timeout: TIMEOUT
		});
	},
	post: function() {
		// создадим объект данных формы
		var data = new FormData();
		/*
		$.each( filesUpload, function( key, value ){
			data.append( key, value );
		});
		*/
		data.append("file", $('#sortpicture').prop('files')[0]);
		console.log($('#sortpicture').prop('files')[0]);
		// добавим переменную для идентификации запроса
		var dir = "/l-nanatsu-no-taizai-1q6ku.jpg";
		/*
				// alert(data);
				$.ajax({
					url: SERVER + "post" + dir,
					cache: false,
					headers: {
						"Authorization": AUTH_TOKEN
					},
					contentType: false,
					processData: false,
					data: data,
					method: "POST",
					type: "POST",
					success: function(data){
                    	alert(data);
					}
				});
				*/
	},
	sharedLink: function(src, callback) {
		$.ajax({
			type: "POST",
			url: SERVER + "links/" + src.slice(1),
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Ошибка генерации ссылки", "error");
				callback(false);
			},
			success: function(data) {
				console.log(data);
				callback(data["message"]);
			},
			timeout: TIMEOUT
		});
	},
	sharedLinkDelete: function(id, callback) {
		$.ajax({
			type: "DELETE",
			url: SERVER + "links/" + id,
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Ошибка", "error");
				callback(false);
			},
			success: function(data) {
				console.log(data);
				callback(true);
			},
			timeout: TIMEOUT
		});
	},
	getShared: function() {
		$.ajax({
			type: "GET",
			url: SERVER + "links",
			crossDomain: true,
			jsonp: "jsonp",
			headers: {
				"Authorization": AUTH_TOKEN
			},
			error: function() {
				$.miniNoty("Чот с сервером", "error");
				console.log(0);
			},
			success: function(data) {
				console.log(data);
				for (var i = 0; i < data["message"].length; i++) {
					var tmp = "/" + data["message"][i]["key"];
					var file = $("[src='" + tmp + "']");
					if (file.length) {
						file.attr("public", data["message"][i]["link"]);
						file.attr("publicID", data["message"][i]["id"]);
						var tmp = file.find(".share-ico");
						tmp.show();
					}
				}
			},
			timeout: TIMEOUT
		});
	}
}