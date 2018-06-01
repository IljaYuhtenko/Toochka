var constFile = new Array();
constFile["dir"] = "/";
var dir = "/";
var moveFile = new Array();
var filesUpload;

var fileUpload;

// Токен
if (getCookie("access_token") == undefined) {
	location.replace("./auth.html");
}
else {
	var Tokengen = function(code) {
		if (code == false) {
			deleteCookie("access_token");
			location.reload();
		}
	}

	token.gen(getCookie("access_token"), Tokengen);
}

var Loading = function(load) {
	if (load == true) {
		$(".loader").show();
		$(".shade").show();
	}
	else {
		$(".loader").hide();
		$(".shade").hide();
	}
}

$(document).ready(function() {
	var Userprint = function(data) {
		$(".file-share-users").html("");

		for (var i = 0; i < data["users"].length; i++) {
			$(".sidebar-users").append('<div class="family" email="' + data["users"][i]["email"] + '" uID=' + data["users"][i]["uID"] + '>\
				<img src="./images/time-user.png">\
				<div class="title">' + data["users"][i]["email"] + '</div>\
			</div>');

			$(".file-share-users").append('<div class="family" email="' + data["users"][i]["email"] + '" uID=' + data["users"][i]["uID"] + '>\
				<img src="./images/time-user.png">\
				<div class="title">' + data["users"][i]["email"] + '</div>\
			</div>')
		}
	}

	files.users(Userprint);

	$("#search-full").focus(function() {
		$(".header-box").css("opacity", 1);
	});

	$("body").on("click", ".ff_fileupload_start_upload", function() {
		alert(1);
		alert($(this).parent().index());
	})

	// Закрытие меню
	$("body").on("click", ".shade", function() {
		if ($(".loader").css("display") != "block") {
			var hideForm = [".file-rename", ".file-share", ".folder-create", ".loading-box"];
			$(".shade").hide();

			for (var i = 0; i < hideForm.length; i++) {
				if ($(hideForm[i]).css("display") != "none") {
					$(hideForm[i]).hide();
				}
			}
		}
	});

	// Мобильное меню
	$("body").on("click", ".buttons-mobile", function() {
		$(".buttons").show();
	});

	// Открытие папки | файла
	$("body").on("click", ".folder-box", function() {
		// Адрес файла | папки
		var src = $(this).attr("src");

		if($(window).width() <= 860) {
			var m = 1;
		}
		else {
			var m = 0;
		}

		if(m == 1) {
			$(".buttons").hide();
		}
		else {
			$(".buttons").show();
		}

		if ($(this).attr("class") == "folder-box active folder" && $(this).attr("type") == "folder" || $(this).attr("main") == "1") {
			// Закрытие вехрнего меню
			$("#file-close").click();
			$("#file-share:eq(" + m + ")").hide();

			// Загрузка новой папки
			files.loading(src);

			// Название текущей директории
			$("#title-dir").html($(this).attr("title"));

			constFile["src"] = $(this).attr("src");
			constFile["dir"] = $(this).attr("src");
			constFile["title"] = $(this).attr("title");
			constFile["format"] = "folder";
			constFile["type"] = $(this).attr("type");

			$("title").text(constFile["title"]);

			if (constFile["dir"] != "/") {
				$(".now-dir").html(constFile["dir"]);
				dir = constFile["dir"];
			}
			else
				$(".now-dir").html("");

			// Скроллинг
			$(document).scrollTop(0);
		}
		else {
			$(".folder-box").attr("class", "folder-box");
			$(".header-box").css("opacity", "1");

			// $(".search").hide();
			$(".file-select").show();
			$(".open").remove();

			if ($(this).attr("type") == "folder") {
				$(this).attr("class", "folder-box active folder");
				$("#file-download").hide();
				$("#file-share").hide();
			}
			else {
				$(this).attr("class", "folder-box active");
				$("#file-download").show();
				$("#file-share").show();
			}

			/*
			if(this.attr("src") == "/shared") {
				$("#file-delete").hide();
			}
			else {
				$("#file-delete").show();
			}
			*/

			$(this).prepend('<div class="open"></div>');

			if (!!$(this).attr("size")) {
				$("#file-name").html($(this).attr("title"));
			}
			else {
				$("#file-name").html($(this).attr("title"));
			}

			constFile["src"] = $(this).attr("src");
			constFile["title"] = $(this).attr("title");
			constFile["format"] = $(this).attr("format");
			constFile["type"] = $(this).attr("type");

			if (audioFormat.indexOf(constFile["format"]) != -1 && m == 0) {
				$("#file-play").show();
			}
			else {
				$("#file-play").hide();
			}

			if (constFile["src"] == "/shared") {
				$("#file-move").hide();
				$("#file-delete").hide();
			}
			else {
				$("#file-move").show();
				$("#file-delete").show();
			}

			$("#user-image").hide();
		}
	});

	$("body").on("click", "#upload-file-btn", function() {
		if ($(".loading-box").css("display") == "none") {
			$(".shade").show();
			$(".loading-box").show();
		}
		else {
			$(".shade").hide();
			$(".loading-box").hide();
		}
	})

	// Воспроизведение файла
	$("body").on("click", "#file-play", function() {
		var player = $("#audioplayer");
		player.show();

		var Audiourl = function(link) {
			if (link != false) {
				player.attr("src", link);

				$("#audioplayer").animate({
					"bottom": "0"
				}, 0);

				$("#audioplayer").get(0).play();
			}
		}

		files.download(constFile["src"], Audiourl);
	});

	$("#upload").on("click", function() {
		files.post();
	});

	// заполняем переменную данными, при изменении значения поля file 
	$('input[type=file]').on('change', function() {
		filesUpload = this.filesUpload;
		alert(filesUpload);
	});

	// Смена имени
	$("body").on("click", "#file-name", function() {
		/*
		if(!$(this).html().match(/<input/)) {
			var name = $(this).html();
			$(this).html('<input id="file-name-new" type="text" value="' + name + '">\
				<button id="file-rename" class="btn width fs-12 fb">Сохранить</button>');
		}
		*/
		if (constFile["src"] != "/shared") {
			$(".shade").show();
			$(".file-rename").show();
			var name = constFile["title"].replace(/\..*/, "");
			$(".file-rename input").val("").focus().val(name);
		}
	});

	$("body").on("click", "#file-rename-cancel", function() {
		$(".shade").hide();
		$(".file-rename").hide();
	})

	// Поделиться
	$("body").on("click", "#file-share", function() {
		var file = $("[src='" + constFile["src"] + "']");
		// Публичная действующая ссылка
		if (!!file.attr("public")) {
			$(".shade").show();
			$(".file-share").show();

			$("#file-share-copy").show();
			$("#file-share-input").show();
			$("#file-share-delete-link").show();
			$("#file-share-shared-family").show();

			$("#file-share-gen-link").hide();

			$(".file-share").find("input").val(file.attr("public")).focus().select();
		}
		// Отсутсвией ссылки
		else {
			/*
			$("#file-share-copy").hide();
			$("#file-share-input").hide();
			$("#file-share-delete-link").hide();
			$("#file-share-shared-family").hide();

			$("#file-share-gen-link").show();
			*/

			var Sharedlink = function(link) {
				Loading(false);
				if (link != false) {
					var file = $("[src='" + constFile["src"] + "']");
					file.attr("public", link);

					var tmp = file.find(".share-ico");
					tmp.show();

					files.getShared();

					$("#file-share").click();
				}
			}

			Loading(true);
			files.sharedLink(constFile["src"], Sharedlink);
			// alert("Noup");
		}
	});

	// Удаление публичной ссылки
	$("body").on("click", "#file-share-delete-link", function() {
		var file = $("[src='" + constFile["src"] + "']");
		var linkID = file.attr("publicID");

		var Sharedlink = function(status) {
			Loading(false);
			if (status != false) {
				var file = $("[src='" + constFile["src"] + "']");
				file.removeAttr("public");

				var tmp = file.find(".share-ico");
				tmp.hide();
			}
		}

		$(".file-share").hide();
		Loading(true);
		files.sharedLinkDelete(linkID, Sharedlink);
	});

	// Кнопка скопировать
	$("body").on("click", "#file-share-copy", function() {
		var tmp = $("#file-share-input-tmp");
		tmp.html($(".file-share").find("input").val());
		tmp.show();
		var containerid = "file-share-input-tmp";
		if (document.selection) {
			var range = document.body.createTextRange();
			range.moveToElementText(document.getElementById(containerid));
			range.select().createTextRange();
			document.execCommand("Copy");
		}
		else if (window.getSelection) {
			var range = document.createRange();
			range.selectNode(document.getElementById(containerid));
			window.getSelection().addRange(range);
			document.execCommand("Copy");
		}

		$.miniNoty("Ссылка скопирована в буфер", "success");

		tmp.hide();
		$(".file-share").find("input").focus().select();

	})

	// Перенос файла
	$("body").on("click", "#file-move", function() {
		// Закрытие вехрнего меню
		$("#file-close").click();

		moveFile["src"] = constFile["src"];
		moveFile["title"] = constFile["title"];
		moveFile["type"] = constFile["type"];
		$(".filemove").show();
	});

	$("body").on("click", "#filemove-cancel", function() {
		moveFile["src"] = "";
		moveFile["title"] = "";
		$(".filemove").hide();
	});

	$("body").on("click", "#filemove", function() {
		var Filemove = function(result) {
			Loading(false);

			if (result != false) {
				$(".filemove").hide();
				files.loading(constFile["dir"]);
			}
			else {
				$.miniNoty("Ошибка перемещения", "error");
			}
		}

		if (moveFile["type"] == "folder") {
			var dirFile = moveFile["src"] + "/";
			var move = constFile["dir"] + "/" + moveFile["title"] + "/";
		}
		else {
			var dirFile = moveFile["src"];
			var move = constFile["dir"] + "/" + moveFile["title"];
		}

		//console.log(dirFile);
		//console.log(move);

		Loading(true);
		files.move(dirFile, move, Filemove)
	});

	// Создание новой папки
	$("body").on("click", "#folder-create-cancel", function() {
		$(".folder-create").hide();
		$(".shade").hide();
	});

	$("body").on("click", "#folder-create-box", function() {
		$(".folder-create").show();
		$(".shade").show();

		// Поле ввода имени
		$("#folder-create-input").val("");
		$("#folder-create-input").focus();
	});

	$("body").on("click", "#folder-create", function() {
		$("#folder-create-cancel").click();

		var name = $("#folder-create-input").val();

		Loading(true);

		var Foldercreate = function(result) {
			Loading(false);

			if (result != false) {
				files.loading(constFile["dir"]);
			}
			else {
				$.miniNoty("Ошибка создания папки", "error");
			}
		}

		files.folder(constFile["dir"] + "/" + name, Foldercreate);
	});

	// Смена имени
	$("body").on("click", "#file-rename", function() {
		var name = $(".file-rename input").val();

		if (!!constFile["format"]) {
			if (constFile["format"].length > 0 && constFile["type"] != "folder") {
				name += "." + constFile["format"];
			}
		}

		$(".file-rename").hide();

		if (constFile["type"] == "folder") {
			var dirFile = constFile["dir"] + "/" + constFile["title"] + "/";
			var rename = constFile["dir"] + "/" + name + "/";
		}
		else {
			var dirFile = constFile["dir"] + "/" + constFile["title"];
			var rename = constFile["dir"] + "/" + name;
		}

		//console.log(dirFile);
		//console.log(rename);

		Loading(true);

		var RenameFile = function(code) {
			if (code == false) {
				$.miniNoty("Ошибка смены имени", "error");
				Loading(false);
			}
			else {
				$("#file-name").html(name);
				files.loading(constFile["dir"]);
			}
		}

		files.move(dirFile, rename, RenameFile);
	})

	// Удаление файла
	$("body").on("click", "#file-delete", function() {
		/*
		var temp = constFile["src"].split("/");
		var src = "";
		if(temp.length > 1) {
			for(var i = 0; i < temp.length - 1; i++) {
				if(src.length == 0) {
					src = "/" + temp[i]; 
				}
				else {
					src = src + "/" + temp[i]; 
				}
			}
		}

		src = src.replace(/\/{1,}/g, "/");

		console.log(constFile["src"]);
		*/

		$("#file-close").click();

		var UpdateFiles = function(code) {
			// alert(code);
			if (code == false) {
				$.miniNoty("Ошибка удаления файла", "error");
			}
			else {
				files.loading(dir);
			}
		}

		files.delete(constFile["src"], UpdateFiles);
	});

	// Скачка файла
	$("body").on("click", "#file-download", function() {
		var DownloadFiles = function(link) {
			// alert(code);
			if (link == false) {
				$.miniNoty("Ошибка загрузки файла", "error");
			}
			else {
				window.location = link;
			}
		}

		if (!!constFile["src"]) {
			files.download(constFile["src"], DownloadFiles);
		}
	});

	// Деавторизация
	$("body").on("click", "#user-image", function() {
		deleteCookie("access_token");
		location.reload();
	});

	// Мобильное меню
	$("body").on("click", ".mobile-menu-href", function() {
		$(".sidebar-left").animate({
			"margin-left": "0"
		}, 300);
	});

	// Закрытие мобильного меню
	$("body").on("blick", ".container", function() {
		if ($(document).width() <= 800 && $(".sidebar-left").css("margin-left") == "0px") {
			$(".sidebar-left").animate({
				"margin-left": "-100%"
			}, 300);
		}
	});

	// Закрытие файла
	$("body").on("click", "#file-close", function() {
		$(".header-box").css("opacity", "0.9");
		$("#user-image").show();
		// $(".search").show();
		$(".file-select").hide();
		$(".folder-box").attr("class", "folder-box");
		$(".open").remove();
		$("#file-download").show();
	});

	/*
	// Создание аудиоплеера
	$("body").on("click", "#audio-new", function() {
		var file = $(".folder-box").filter(".active");
		$("#sound").attr("src", file.attr("src"));
		var audio = $("#sound")[0];
		audioPlay = true;

		setTimeout(function() {
			var audio = $("#sound")[0];
			var minutes = (audio.duration / 60).toFixed(0);
			var seconds = (audio.duration % 60).toFixed(0);

			minutes = (minutes < 10) ? "0" + minutes : minutes;
			seconds = (seconds < 10) ? "0" + seconds : seconds;

			$("#audio-stop").html(minutes + ":" +seconds);
			audio.play()
		}, 500);
		
		$("#audio-play").hide();
		$("#audio-pause").css("display", "inline-block");

		$(".bottom-audio-box").animate({
			"bottom": "0"
		}, 0);

	});

	// Кнопки управления аудио
	$("body").on("click", "#audio-play", function() {
		var audio = $("#sound")[0];
		
		$("#audio-play").hide();
		$("#audio-pause").css("display", "inline-block");
		
		var minutes = (audio.duration / 60).toFixed(0);
		var seconds = (audio.duration % 60).toFixed(0);

		minutes = (minutes < 10) ? "0" + minutes : minutes;
		seconds = (seconds < 10) ? "0" + seconds : seconds;

		$("#audio-stop").html(minutes + ":" +seconds);

		audio.play();
		audioPlay = true;
	});

	$("body").on("click", "#audio-pause", function() {
		var audio = $("#sound")[0];
		audio.pause();
		$("#audio-play").css("display", "inline-block");
		$("#audio-pause").hide();

		audioPlay = false;
	});

	*/

	// обработчик ссылок
	$("body").on("click", "a", function() {
		/*
		if(!!$(this).attr("src")) {
			var timeHref = $(this).attr("src").replace(/\./g, "");
		}
		else {
		*/
		var timeHref = $(this).attr("href").replace(/\./g, "");
		//}

		if (timeHref.substr(0, 1) == "/") {
			if (window.history && history.pushState || $(this).attr("download").length > 0) {

				var link = $(this).attr("href");

				if (!!link) {
					history.pushState(null, document.title, link);
					loadLink(link);
				}
			}
			else {
				alert(1);
				window.location.hash = $(this).attr("href");
			}

			return false;
		}

		return false;
	});
});

function loadLink(href) {
	$.ajax({
		type: "GET",
		cache: false,
		dataType: "html",
		url: href,
		success: function(html) {
			// Скроллинг
			$(document).scrollTop(0);

			// Замена контейнера 
			var html = jQuery('<div>').html(html);
			var container = html.find("div.container").html();
			$(".container").html(container);
		},
		error: function(request, error) {
			console.log(request);
		}
	});
}

$(document).ready(function() {

	$("form[name='uploader']").submit(function(e) {
		var formData = new FormData($(this)[0]);
		console.log(formData);
		$.ajax({
			url: SERVER + "post/",
			type: "POST",
			data: formData,
			async: false,
			headers: {
				"Authorization": " Bear eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IkpTbWl0aEBnbWFpbC5jb20iLCJpYXQiOjE1MjM3MDc3NTYsImV4cCI6MTU1NTI0Mzc1Nn0.LN2oY1HU5kR8E2nyheRrkh7GqVlth7o7kRSGdSjHc3Q"
			},
			success: function(msg) {
				alert(msg);
			},
			error: function(msg) {
				alert('Ошибка!');
			},
			cache: false,
			contentType: false,
			processData: false
		});

		return false;
	});

	$(window).resize(function() {
		// Кнопки меню
		var buttons = $(".buttons");
		var header_box = $(".header-box");

		if(header_box.width() < 1240) {
			console.log(buttons.width());
		}

		// Папки и файлы
		var size = 104;
		var container = $(".container").width();

		var whole = parseInt(container / size);
		var temp = (container - whole * size) / whole;
		var remainder = container % size;

		$(".folders").css("margin-left", -temp);
		$(".folder-box").css("margin-left", temp);

		var folders = $(".folder-box");
		folders.css("height", "");
		var sizeBlock = $(".folder-box:eq(0)").height();
		for (var i = 0; i < folders.length; i++) {
			if (i % whole == 0) {
				var start = i;
				var stop = i + whole - 1;

				var sizeBlock = $(".folder-box:eq(" + i + ")").height();
			}

			var temp = $(".folder-box:eq(" + i + ")");

			if (temp.height() > sizeBlock) {
				var sizeBlock = temp.height();

				for (var a = start; a < i; a++) {
					$(".folder-box:eq(" + a + ")").css("height", sizeBlock);
				}

				temp.css("height", sizeBlock);
			}
			else {
				temp.css("height", sizeBlock);
			}
		}
	});
});

window.onpopstate = function(event) {
	// document.location
	// state: JSON.stringify(event.state)
	loadLink(document.location);
};