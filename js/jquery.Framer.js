/* ------------------------------------------------------------------------
	jQuery Framer Plugin

	Author: Hirohisa Nagai
	Copyright: eternity design ( http://eternitydesign.net/ )
	Version: 0.60
	License: MIT License
	
	include spin.js
	fgnass.github.com/spin.js#v2.0.1

------------------------------------------------------------------------- */

(function($) {
	var FRM = $.Framer = {};
	
	
	$.fn.Framer = function(settings) {
		settings = $.extend({
			loadingColor: '#fff',
			opacity: 0.8,
			overlayTime: 500,
			isOverlayClose: true,
			isAutoResize: true,
			isScroll: true,
			resizeRatio: 0.9,
			speed: 500,
			title: '<div id="frmTitle"></div>',
			description: '<div id="frm_description">{description}</div>',
			closeBtn: '<div class="close_btn"></div>',
			inner: {},
			width: 640,
			height: 360,
			iframe: '<iframe name="framer-iframe" frameborder="0" id="framer-iframe"></iframe>',
			ajaxDataType: 'html',
			isPushState: false,
			isCSSAnim: false
		}, settings);


		FRM.target;
		FRM.body;
		FRM.contents;
		FRM.indicator;
		FRM.box;
		FRM.type;
		FRM.title;
		FRM.description;
		FRM.closeBtn;
		FRM.container = null;

		var loading;
		var overlay;
		var scrollTimer;
		var isMove = false;
		var baseURL = location.href;


		FRM.open = function(e) {
			FRM.body = $('body');

			//console.log('$.Framer.open');
			overlay = $('<div id="frm_overlay"></div>');
			overlay.css('opacity', 0);
			overlay.height($(document).height()).width($(window).width());


			loading = $('<div id="loading"></div>').css({
				width: $(window).width(),
				height: $(window).height(),
				top: $(window).scrollTop(),
				left: 0
			});
			
			var loading_options = {
				lines: 12,
				width: 4,
				color: settings.loadingColor,
				top: $(window).height() * 0.5,
				left: $(window).width() * 0.5
			};

			FRM.indicator = new Spinner(loading_options).spin(loading[0]);
			FRM.body.append(loading);
			
			FRM.body.append(overlay);
			overlay.fadeTo(settings.overlayTime, settings.opacity);
			
			FRM.box = $('<div id="framer"></div>');

			if(arguments.length > 1) {
				// API call
				// console.log("API!!!", arguments[0]);
				FRM.target = $("<a />");
				FRM.target.attr("href", arguments[0]);
				FRM.target.attr("data-framer-type", arguments[1]);

				if($.isPlainObject(arguments[2])) {
					settings = $.extend(settings, arguments[2]);
				}
			}
			else {
				FRM.target = $(this);
			}
			
			if(!$.isEmptyObject(settings.inner)) {
				FRM.box.append(settings.inner);
			}
			
			if(FRM.target.attr('title')) {
				if(settings.title != '') {
					if(settings.title.search(/{title}/)) {
						FRM.title = $(settings.title.replace(/{title}/, FRM.target.attr('title')));
					}
					else {
						FRM.title = $(settings.title).text(FRM.target.attr('title'));
					}

					FRM.box.append(FRM.title);
				}
			}

			if(FRM.target.attr('data-framer-description')) {
				if(settings.description != '') {
					if(settings.description.search(/{description}/)) {
						FRM.description = $(settings.description.replace(/{description}/, FRM.target.attr('data-framer-description')));
					}
					else {
						FRM.description = $(settings.description).text(FRM.target.attr('data-framer-description'));
					}

					FRM.box.append(FRM.description);
				}
			}

			FRM.type = getType(FRM.target.attr('href'), FRM.target.attr('data-framer-type'));

			if(FRM.type == 'image') {
				FRM.contents = $("<img />").on("load", function() {
					showContents();
				}).on("error", function() {
					//console.log("error", settings.resources[key][0]);
				});
				FRM.contents.attr("src", FRM.target.attr('href'));
			}
			else if(FRM.type == 'inline') {
				FRM.contents = getInlineContents();
			}
			else if(FRM.type == 'video') {
				FRM.contents = getVideoJSContents();
			}
			else if(FRM.type == 'youtube') {
				FRM.contents = getYoutubeContents();
			}
			else if(FRM.type == 'vimeo') {
				FRM.contents = getVimeoContents();
			}
			else if(FRM.type == 'soundcloud') {
				FRM.contents = getSCContents();
			}
			else if(FRM.type == 'iframe') {
				FRM.contents = getiFrameContents();
			}
			else if(FRM.type == 'ajax') {
				getAjaxContents.apply(this);
			}

			if(FRM.type != 'image' && FRM.type != 'ajax') {
				showContents();
			}
			
			FRM.box.addClass(FRM.type);
			
			$(window).on('resize.Framer', FramerResize);
			
			if(settings.isScroll) {
				$(window).on('scroll.Framer', scrollEvent);
				$(window).on('scrollComplete.Framer', scrollCompleteEvent);
			}

			return false;
		}
		
		
		FRM.close = function() {
			$(window).off('resize.Framer', FramerResize);
			
			if(settings.isScroll) {
				$(window).off('scroll.Framer', scrollEvent);
				$(window).off('scrollComplete.Framer', scrollCompleteEvent);
			}
			
			if(settings.isOverlayClose) {
				overlay.off("click", $.Framer.close);
			}
			FRM.closeBtn.off("click", $.Framer.close);

			if(settings.closeBtn != '') {
				FRM.closeBtn.fadeOut(settings.speed);
			}
			overlay.fadeOut(settings.overlayTime);

			if(settings.isCSSAnim) {
				FRM.box.removeClass('show');
				setTimeout(destroyBox, settings.speed);
			}
			else {
				FRM.box.fadeOut(settings.speed, destroyBox);
			}
		}


		var destroyBox = function() {
			if(FRM.type == 'inline') {
				FRM.contents.hide();
				FRM.body.append(FRM.contents);
			}
			else if(FRM.type == 'video') {
				FramerVideo.destroy();
			}
			
			if(!$.isEmptyObject(settings.inner)) {
				$(settings.inner).remove();
			}
			
			if(FRM.title) {
				FRM.title.remove();
			}
			if(FRM.description) {
				FRM.description.remove();
			}

			FRM.closeBtn.remove();
			if(FRM.type != 'inline') {
				FRM.contents.remove();
			}

			if(settings.isCSSAnim) {
				FRM.container.remove();
			}

			FRM.box.remove();
			overlay.remove();

			if(settings.isPushState && isMove) {
				window.history.back();
			}
			
			FRM.body.trigger('close.Framer');
		}
		
		
		var showContents = function() {
			setBoxSize();
			getPosition();
			
			FRM.indicator.stop();
			loading.remove();
			delete FRM.indicator;
			
			if(settings.closeBtn != '') {
				FRM.closeBtn = $(settings.closeBtn);
			}
			
			if(isIE8()) {
				// console.log('isIE8');
				FRM.box.show();
				showContentsComplete();
			}
			else {
				if(settings.isCSSAnim) {
					FRM.box.css({
						"display": "block"
					}).addClass('show').delay(settings.speed, showContentsComplete);
				}
				else {
					FRM.box.fadeIn(settings.speed, function() {
						showContentsComplete();
					});
				}
			}
		}
		
		
		var showContentsComplete = function() {
			if(FRM.type == 'video') {
				FramerVideo = _V_("Framer_video", $.parseJSON(FRM.target.attr('data-framer-video-setup')));

				if(isIE()) {
					//console.log('noCloneEvent');
					var source = FRM.target.attr('href');
					if(!source.match(/\.webm$/i) && !source.match(/\.webm$/i) && !source.match(/\.mp4$/i)) {
						FramerVideo.src(source + '.mp4');
					}
					else if(source.match(/\.mp4$/i)) {
						FramerVideo.src(source);
					}
					//console.log('video: ', FRM.contents.width(), FRM.contents.height());
					FramerVideo.width(FRM.contents.width() || FRM.target.attr('data-framer-width') || settings.width);
					FramerVideo.height(FRM.contents.height() || FRM.target.attr('data-framer-height') || settings.height);
				}
			}
			
			if(settings.isOverlayClose) {
				overlay.on("click", $.Framer.close);
			}
			
			if(settings.closeBtn != '') {
				FRM.box.append(FRM.closeBtn);
				FRM.closeBtn.fadeIn(settings.speed);
				FRM.closeBtn.on("click", $.Framer.close);
			}

			// pushState
			if(settings.isPushState) {
				if(FRM.target.attr('data-framer-ps') != null) {
					// window.history.pushState(FRM.target.attr('data-framer-ps'), "", "#" + FRM.target.attr('data-framer-ps'));
					window.history.pushState(FRM.target.attr('data-framer-ps'), "", FRM.target.attr('data-framer-ps'));
					isMove = true;
				}
			}

			FRM.body.trigger('open.Framer');
		}
		
		
		var getPosition = function() {
			// $(window).height();

			if(settings.isCSSAnim) {
				FRM.container.css({
					top: Math.floor(($(window).height() - FRM.box.outerHeight()) * 0.5) + $(window).scrollTop(),
					left: Math.floor(($(window).width() - FRM.box.outerWidth()) * 0.5)
				});
			}
			else {
				FRM.box.css({
					top: Math.floor(($(window).height() - FRM.box.outerHeight()) * 0.5) + $(window).scrollTop(),
					left: Math.floor(($(window).width() - FRM.box.outerWidth()) * 0.5)
				});
			}
		}


		var setBoxSize = function() {
			var cw, ch;
			if(FRM.type == 'image') {
				var is = getImageSize(FRM.contents[0]);

				cw = FRM.target.attr('data-framer-width') || is.width;
				ch = FRM.target.attr('data-framer-height') || is.height;
				
				if(FRM.target.attr('data-framer-width')) {
					FRM.contents.width(FRM.target.attr('data-framer-width'));
				}
				if(FRM.target.attr('data-framer-height')) {
					FRM.contents.height(FRM.target.attr('data-framer-height'));
				}
			}
			else if (FRM.type == 'video' && !$.support.opacity) {
				cw = FRM.target.attr('data-framer-width') || settings.width,
				ch = FRM.target.attr('data-framer-height') || settings.height
			}
			else {
				cw = FRM.target.attr('data-framer-width') || FRM.contents.outerWidth();
				ch = FRM.target.attr('data-framer-height') || FRM.contents.outerHeight();
			}

			FRM.box.append(FRM.contents);

			if(settings.isCSSAnim) {
				FRM.container = $('<div id="framerContainer" />');
				FRM.container.append(FRM.box);
				FRM.body.append(FRM.container);
			}
			else {
				FRM.body.append(FRM.box);
			}

			var edbw = FRM.box.outerWidth();
			var edbh = FRM.box.outerHeight();

			var ww = $(window).width();
			var wh = $(window).height();

			var emw = edbw - FRM.box.width();
			var emh = edbh - FRM.box.height();

			var mw = ww - cw;
			var mh = wh - ch;
			
			var innerHeight = FRM.box.height() - ch;
			
			//console.log(cw + ' : ', ch + ' : ', edbw + ' : ', edbh + ' : ', ww + ' : ', wh + ' : ', emw + ' : ', emh + ' : ', mw + ' : ', mh);
			
			var ratio;
			
			if(mw > mh) {	// 縦スペースが横スペースより小さい
				if(wh * settings.resizeRatio < edbh) {
					// リサイズ処理
					if(settings.isAutoResize) {
						FRM.box.height(wh * settings.resizeRatio - emh);	// Framerへのpaddingを考慮に入れた数値
						ratio = (FRM.box.height() - innerHeight) / ch;
						FRM.box.width(cw * ratio);
					
						if(FRM.type != 'image' && cw != FRM.contents.width()) {
							FRM.contents.width(FRM.box.width() - (cw - FRM.contents.width()));
						}
						else {
							FRM.contents.width(FRM.box.width());
						}

						if(FRM.type != 'image' && ch != FRM.contents.height()) {
							FRM.contents.height(FRM.box.height() - (ch - FRM.contents.height()) - innerHeight);
						}
						else {
							FRM.contents.height(FRM.box.height() - innerHeight);
						}
					}
				}
				else {
					if(FRM.type == 'image') {
						FRM.contents.width(cw).height(ch);
					}

					if(FRM.box.width() < cw) {
						if(FRM.box.width() > 0) {
							FRM.box.width(parseInt(cw) + parseInt(FRM.box.width()));
						}
						else {
							FRM.box.width(cw);
						}
					}
					
					if(FRM.box.height() < ch) {
						if(FRM.box.height() > 0) {
							// Framer以下の要素の高さを考慮
							FRM.box.height(parseInt(ch) + parseInt(FRM.box.height()));
						}
						else {
							FRM.box.height(ch);
						}
					}
				}
			}
			else {	// 横スペースが縦より小さい
				if(ww * settings.resizeRatio < edbw) {
					// リサイズ処理
					if(settings.isAutoResize) {
						FRM.box.width(ww * settings.resizeRatio - emw);
						ratio = FRM.box.width() / cw;
						FRM.box.height((ch * ratio) + innerHeight);
					
					
						if(FRM.type != 'image' && cw != FRM.contents.width()) {
							FRM.contents.width(FRM.box.width() - (cw - FRM.contents.width()));
						}
						else {
							FRM.contents.width(FRM.box.width());
						}

						if(FRM.type != 'image' && ch != FRM.contents.height()) {
							FRM.contents.height(FRM.box.height() - (ch - FRM.contents.height()) - innerHeight);
						}
						else {
							FRM.contents.height(FRM.box.height() - innerHeight);
						}
						
					}
				}
				else {
					if(FRM.type == 'image') {
						FRM.contents.width(cw).height(ch);
					}

					if(FRM.box.width() < cw) {
						if(FRM.box.width() > 0) {
							FRM.box.width(parseInt(cw) + parseInt(FRM.box.width()));
						}
						else {
							FRM.box.width(cw);
						}
					}
					
					if(FRM.box.height() < ch) {
						if(FRM.box.height() > 0) {
							FRM.box.height(parseInt(ch) + parseInt(FRM.box.height()));
						}
						else {
							FRM.box.height(ch);
						}
					}
				}
			}
			
			if(FRM.type == 'video') {
				FRM.contents.attr({
					width: FRM.target.attr('data-framer-width') || settings.width,
					height: FRM.target.attr('data-framer-height') || settings.height
				});
			}

			if(settings.isCSSAnim) {
				FRM.container.width(FRM.box.outerWidth()).height(FRM.box.outerHeight());
			}
		}
		
		
		var FramerResize = function(e) {
			overlay.height($(window).height());
			overlay.width($(window).width());
			
			scrollCompleteEvent();
		}
		
		
		var scrollEvent = function() {
			if(scrollTimer) {
				clearTimeout(scrollTimer);
			}
			scrollTimer = setTimeout(function() {
				scrollTimer = null;
				$(window).trigger('scrollComplete.Framer');
			}, 500);
		}
		
		var scrollCompleteEvent = function() {
			var moveTarget;

			if(settings.isCSSAnim) {
				moveTarget = FRM.container;
			}
			else {
				moveTarget = FRM.box;
			}

			moveTarget.stop().animate({
				top: Math.floor(($(window).height() - FRM.box.outerHeight()) * 0.5) + $(window).scrollTop(),
				left: Math.floor(($(window).width() - FRM.box.outerWidth()) * 0.5)
			},
			settings.speed);
		}
		
		
		var getType = function(url, type) {
			if(url.match(/youtube\.com\/watch/i) || url.match(/youtu\.be/i) || type == 'youtube') {
				return "youtube";
			}
			else if(url.match(/vimeo\.com/i) || type == 'vimeo') {
				return "vimeo";
			}
			else if(url.match(/soundcloud\.com/i) || type == 'soundcloud') {
				return "soundcloud";
			}
			else if(url.substr(0, 1) == '#' || type == 'inline') {
				return "inline";
			}
			else if(type == 'video') {
				return 'video';
			}
			else if(type == 'iframe') {
				return 'iframe';
			}
			else if(type =='ajax') {
				return 'ajax';
			}
			else if(url.match(/\.(gif|jpg|jpeg|png)$/i) || type == 'image') {
				return "image";
			}
		}
		
		
		var getInlineContents = function() {
			return $(FRM.target.attr('href')).show();
		}
		
		
		var getVideoJSContents = function() {
			var video = $('<video id="Framer_video"></video>');
			video.attr({
				width: FRM.target.attr('data-framer-width') || settings.width,
				height: FRM.target.attr('data-framer-height') || settings.height
			});
			video.addClass(FRM.target.attr('data-framer-video-class'));
			
			var source = FRM.target.attr('href');
			if(source.match(/\.mp4$/i)) {
				video.append('<source src="' + source + '" type="video/mp4" />');
			}
			else if(source.match(/\.webm$/i)) {
				video.append('<source src="' + source + '" type="video/webm" />');
			}
			else if(source.match(/\.ogv$/i)) {
				video.append('<source src="' + source + '" type="video/ogv" />');
			}
			else {
				video.append('<source src="' + source + '.mp4" type="video/mp4" />');
				video.append('<source src="' + source + '.webm" type="video/webm" />');
				video.append('<source src="' + source + '.ogv" type="video/ogv" />');
			}

			return video;
		}


		var getYoutubeContents = function() {
			var regx = FRM.target.attr('href').match(/(youtube\.com|youtu\.be)\/(v\/|u\/|embed\/|watch\?v=)?([^#\&\?]*).*/i);
			var movieId = regx[3];
			
			var youtube = $('<iframe frameborder="0"></iframe>');
			youtube.attr({
				src: "http://www.youtube.com/embed/" + movieId + '?wmode=opaque',
				width: FRM.target.attr('data-framer-width') || settings.width,
				height: FRM.target.attr('data-framer-height') || settings.height
			});
			
			return youtube;
		}


		var getVimeoContents = function() {
			var regx = FRM.target.attr('href').match(/vimeo\.com\/([^#\&\?]*).*/i);
			var movieId = regx[1];
			
			var vimeo = $('<iframe frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>');
			
			// <iframe src="http://player.vimeo.com/video/VIDEO_ID" width="WIDTH" height="HEIGHT" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>
			vimeo.attr({
				src: "http://player.vimeo.com/video/" + movieId,
				width: FRM.target.attr('data-framer-width') || settings.width,
				height: FRM.target.attr('data-framer-height') || settings.height
			});
			
			return vimeo;
		}


		var getSCContents = function() {
			//<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F34019569"></iframe>

			var soundcloud = $('<iframe frameborder="0"></iframe>');
			soundcloud.attr({
				src: "https://w.soundcloud.com/player/?url=" + FRM.target.attr('href'),
				width: FRM.target.attr('data-framer-width') || settings.width,
				height: "166"
			});
			
			return soundcloud;
		}


		var getiFrameContents = function() {
			var iframe = $(settings.iframe);
			iframe.attr({
				src: FRM.target.attr('href'),
				width: FRM.target.attr('data-framer-width') || settings.width,
				height: FRM.target.attr('data-framer-height') || settings.height
			});
			
			return iframe;
		}


		var getAjaxContents = function() {
			$.ajax({
				type: "GET",
				url: FRM.target.attr('href'),
				dataType: FRM.target.attr('data-framer-ajax-type') || settings.ajaxDataType,
				success: function(data) {
					FRM.contents = $(data);
					showContents();
				},
				error: function(XMLHttpRequest, textStatus) {
					FRM.contents = $('<span>' + textStatus + '</span>');
					showContents();
				}
			});
		}


		var getUrlParams = function(src) {
			var vars = [], hash;
			var hashes = src.slice(src.indexOf('?') + 1).split('&');
			for(var i = 0; i < hashes.length; i++) {
				hash = hashes[i].split('=');
				vars.push(hash[0]);
				vars[hash[0]] = hash[1];
			}

			return vars;
		}

		var getState = function() {
			var url = location.href;
			var ary = url.split("/");

			var str = ary[ary.length - 1];

			if(str.match(/.html$/)) {
				return ary[ary.length - 2];
			}
			else {
				return str;
			}
		}


		var getImageSize = function(img) {
			var w, h;
			if(typeof img.naturalWidth != 'undefined') {
				w = img.naturalWidth;
				h = img.naturalHeight;
			}
			else if(typeof img.runtimeStyle !== 'undefined') {
				//var run = img.runtimeStyle;
				// run.width  = "auto";
				// run.height = "auto";
				w = img.width;
				h = img.height;
			}
			else {
				w = img.width;
				h = img.height;
			}

			return {width: w, height: h};
		}


		var isIE = function() {
			if($.support.checkOn && $.support.noCloneEvent && !$.support.noCloneChecked && !$.support.cors) {
				return true;
			}
			else if(!$.support.opacity) {
				return true;
			}
			else {
				return false;
			}
		}


		var isIE8 = function() {
			if(!$.support.opacity) {
				if(!$.support.hrefNormalized) {
					return false;
				}
				else {
					return true;
				}
			}
			else {
				return false;
			}
		}

		var changeStateEvent = function(e) {
			// console.log("changeStateEvent", e);
			var state = e.originalEvent.state;
			// console.log("popstate : ", e.originalEvent.state, isMove);
			if(state == null && isMove == true) {
				// console.log("ismove");
				$.Framer.close();
			}
		}

		if(settings.isPushState) {
			// console.log("isPushState");
			$(window).on("popstate", $.proxy(changeStateEvent, this));
		}
		
		this.on('click.Framer', $.Framer.open);
		
		return this;
	}
})(jQuery);



//fgnass.github.com/spin.js#v2.0.1
!function(a,b){"object"==typeof exports?module.exports=b():"function"==typeof define&&define.amd?define(b):a.Spinner=b()}(this,function(){"use strict";function a(a,b){var c,d=document.createElement(a||"div");for(c in b)d[c]=b[c];return d}function b(a){for(var b=1,c=arguments.length;c>b;b++)a.appendChild(arguments[b]);return a}function c(a,b,c,d){var e=["opacity",b,~~(100*a),c,d].join("-"),f=.01+c/d*100,g=Math.max(1-(1-a)/b*(100-f),a),h=j.substring(0,j.indexOf("Animation")).toLowerCase(),i=h&&"-"+h+"-"||"";return l[e]||(m.insertRule("@"+i+"keyframes "+e+"{0%{opacity:"+g+"}"+f+"%{opacity:"+a+"}"+(f+.01)+"%{opacity:1}"+(f+b)%100+"%{opacity:"+a+"}100%{opacity:"+g+"}}",m.cssRules.length),l[e]=1),e}function d(a,b){var c,d,e=a.style;for(b=b.charAt(0).toUpperCase()+b.slice(1),d=0;d<k.length;d++)if(c=k[d]+b,void 0!==e[c])return c;return void 0!==e[b]?b:void 0}function e(a,b){for(var c in b)a.style[d(a,c)||c]=b[c];return a}function f(a){for(var b=1;b<arguments.length;b++){var c=arguments[b];for(var d in c)void 0===a[d]&&(a[d]=c[d])}return a}function g(a,b){return"string"==typeof a?a:a[b%a.length]}function h(a){this.opts=f(a||{},h.defaults,n)}function i(){function c(b,c){return a("<"+b+' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">',c)}m.addRule(".spin-vml","behavior:url(#default#VML)"),h.prototype.lines=function(a,d){function f(){return e(c("group",{coordsize:k+" "+k,coordorigin:-j+" "+-j}),{width:k,height:k})}function h(a,h,i){b(m,b(e(f(),{rotation:360/d.lines*a+"deg",left:~~h}),b(e(c("roundrect",{arcsize:d.corners}),{width:j,height:d.width,left:d.radius,top:-d.width>>1,filter:i}),c("fill",{color:g(d.color,a),opacity:d.opacity}),c("stroke",{opacity:0}))))}var i,j=d.length+d.width,k=2*j,l=2*-(d.width+d.length)+"px",m=e(f(),{position:"absolute",top:l,left:l});if(d.shadow)for(i=1;i<=d.lines;i++)h(i,-2,"progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");for(i=1;i<=d.lines;i++)h(i);return b(a,m)},h.prototype.opacity=function(a,b,c,d){var e=a.firstChild;d=d.shadow&&d.lines||0,e&&b+d<e.childNodes.length&&(e=e.childNodes[b+d],e=e&&e.firstChild,e=e&&e.firstChild,e&&(e.opacity=c))}}var j,k=["webkit","Moz","ms","O"],l={},m=function(){var c=a("style",{type:"text/css"});return b(document.getElementsByTagName("head")[0],c),c.sheet||c.styleSheet}(),n={lines:12,length:7,width:5,radius:10,rotate:0,corners:1,color:"#000",direction:1,speed:1,trail:100,opacity:.25,fps:20,zIndex:2e9,className:"spinner",top:"50%",left:"50%",position:"absolute"};h.defaults={},f(h.prototype,{spin:function(b){this.stop();{var c=this,d=c.opts,f=c.el=e(a(0,{className:d.className}),{position:d.position,width:0,zIndex:d.zIndex});d.radius+d.length+d.width}if(e(f,{left:d.left,top:d.top}),b&&b.insertBefore(f,b.firstChild||null),f.setAttribute("role","progressbar"),c.lines(f,c.opts),!j){var g,h=0,i=(d.lines-1)*(1-d.direction)/2,k=d.fps,l=k/d.speed,m=(1-d.opacity)/(l*d.trail/100),n=l/d.lines;!function o(){h++;for(var a=0;a<d.lines;a++)g=Math.max(1-(h+(d.lines-a)*n)%l*m,d.opacity),c.opacity(f,a*d.direction+i,g,d);c.timeout=c.el&&setTimeout(o,~~(1e3/k))}()}return c},stop:function(){var a=this.el;return a&&(clearTimeout(this.timeout),a.parentNode&&a.parentNode.removeChild(a),this.el=void 0),this},lines:function(d,f){function h(b,c){return e(a(),{position:"absolute",width:f.length+f.width+"px",height:f.width+"px",background:b,boxShadow:c,transformOrigin:"left",transform:"rotate("+~~(360/f.lines*k+f.rotate)+"deg) translate("+f.radius+"px,0)",borderRadius:(f.corners*f.width>>1)+"px"})}for(var i,k=0,l=(f.lines-1)*(1-f.direction)/2;k<f.lines;k++)i=e(a(),{position:"absolute",top:1+~(f.width/2)+"px",transform:f.hwaccel?"translate3d(0,0,0)":"",opacity:f.opacity,animation:j&&c(f.opacity,f.trail,l+k*f.direction,f.lines)+" "+1/f.speed+"s linear infinite"}),f.shadow&&b(i,e(h("#000","0 0 4px #000"),{top:"2px"})),b(d,b(i,h(g(f.color,k),"0 0 1px rgba(0,0,0,.1)")));return d},opacity:function(a,b,c){b<a.childNodes.length&&(a.childNodes[b].style.opacity=c)}});var o=e(a("group"),{behavior:"url(#default#VML)"});return!d(o,"transform")&&o.adj?i():j=d(o,"animation"),h});