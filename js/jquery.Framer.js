/* ------------------------------------------------------------------------
	jQuery Framer Plugin

	Author: Hirohisa Nagai
	Copyright: eternity design ( http://eternitydesign.net/ )
	Version: 0.55
	License: MIT License
	
	include spin.js
	fgnass.github.com/spin.js#v1.3

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
			description: '<div id="frmDescription"></div>',
			closeBtn: '<div class="close_btn"></div>',
			inner: {},
			width: 640,
			height: 360,
			iframe: '<iframe name="framer-iframe" frameborder="0" id="framer-iframe"></iframe>',
			ajaxDataType: 'html'
		}, settings);


		FRM.target;
		FRM.body;
		FRM.contents;
		FRM.loading;
		FRM.indicator;
		FRM.box;
		FRM.type;
		FRM.title;
		FRM.description;
		FRM.closeBtn;

		var overlay;
		var scrollTimer;


		FRM.open = function() {
			FRM.target = $(this);
			FRM.body = $('body');

			//console.log('$.Framer.open');
			overlay = $('<div id="frm_overlay"></div>');
			overlay.css('opacity', 0);
			overlay.height($(document).height()).width($(window).width());


			FRM.loading = $('<div id="loading"></div>').css({
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

			FRM.indicator = new Spinner(loading_options).spin(FRM.loading[0]);
			FRM.body.append(FRM.loading);
			
			FRM.body.append(overlay);
			overlay.fadeTo(settings.overlayTime, settings.opacity);
			
			FRM.box = $('<div id="framer"></div>');
			
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
			FRM.box.fadeOut(settings.speed, function() {
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
				FRM.box.remove();
				overlay.remove();
				
				FRM.body.trigger('close.Framer');
			});
		}
		
		
		var showContents = function() {
			setBoxSize();
			getPosition();
			
			FRM.indicator.stop();
			FRM.loading.remove();
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
				FRM.box.fadeIn(settings.speed, function() {
					showContentsComplete();
				});
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

			FRM.body.trigger('open.Framer');
		}
		
		
		var getPosition = function() {
			$(window).height()
			FRM.box.css({
				top: Math.floor(($(window).height() - FRM.box.outerHeight()) * 0.5) + $(window).scrollTop(),
				left: Math.floor(($(window).width() - FRM.box.outerWidth()) * 0.5)
			})
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
			FRM.body.append(FRM.box);

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
		}
		
		
		var FramerResize = function(e) {
			overlay.height($(window).height())
			overlay.height($(document).height()).width($(window).width());
			
			FRM.box.stop().animate({
				top: Math.floor(($(window).height() - FRM.box.outerHeight()) * 0.5) + $(window).scrollTop(),
				left: Math.floor(($(window).width() - FRM.box.outerWidth()) * 0.5)
			},
			settings.speed);
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
			FRM.box.stop().animate({
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
				src: "http://www.youtube.com/embed/" + movieId,
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
		
		this.on('click.Framer', $.Framer.open);
		
		return this;
	}
})(jQuery);



//fgnass.github.com/spin.js#v1.3

/**
* Copyright (c) 2011-2013 Felix Gnass
* Licensed under the MIT license
*/
(function(t,e){if(typeof exports=="object")module.exports=e();else if(typeof define=="function"&&define.amd)define(e);else t.Spinner=e()})(this,function(){"use strict";var t=["webkit","Moz","ms","O"],e={},i;function o(t,e){var i=document.createElement(t||"div"),o;for(o in e)i[o]=e[o];return i}function n(t){for(var e=1,i=arguments.length;e<i;e++)t.appendChild(arguments[e]);return t}var r=function(){var t=o("style",{type:"text/css"});n(document.getElementsByTagName("head")[0],t);return t.sheet||t.styleSheet}();function s(t,o,n,s){var a=["opacity",o,~~(t*100),n,s].join("-"),f=.01+n/s*100,l=Math.max(1-(1-t)/o*(100-f),t),d=i.substring(0,i.indexOf("Animation")).toLowerCase(),u=d&&"-"+d+"-"||"";if(!e[a]){r.insertRule("@"+u+"keyframes "+a+"{"+"0%{opacity:"+l+"}"+f+"%{opacity:"+t+"}"+(f+.01)+"%{opacity:1}"+(f+o)%100+"%{opacity:"+t+"}"+"100%{opacity:"+l+"}"+"}",r.cssRules.length);e[a]=1}return a}function a(e,i){var o=e.style,n,r;if(o[i]!==undefined)return i;i=i.charAt(0).toUpperCase()+i.slice(1);for(r=0;r<t.length;r++){n=t[r]+i;if(o[n]!==undefined)return n}}function f(t,e){for(var i in e)t.style[a(t,i)||i]=e[i];return t}function l(t){for(var e=1;e<arguments.length;e++){var i=arguments[e];for(var o in i)if(t[o]===undefined)t[o]=i[o]}return t}function d(t){var e={x:t.offsetLeft,y:t.offsetTop};while(t=t.offsetParent)e.x+=t.offsetLeft,e.y+=t.offsetTop;return e}var u={lines:12,length:7,width:5,radius:10,rotate:0,corners:1,color:"#000",direction:1,speed:1,trail:100,opacity:1/4,fps:20,zIndex:2e9,className:"spinner",top:"auto",left:"auto",position:"relative"};function p(t){if(typeof this=="undefined")return new p(t);this.opts=l(t||{},p.defaults,u)}p.defaults={};l(p.prototype,{spin:function(t){this.stop();var e=this,n=e.opts,r=e.el=f(o(0,{className:n.className}),{position:n.position,width:0,zIndex:n.zIndex}),s=n.radius+n.length+n.width,a,l;if(t){t.insertBefore(r,t.firstChild||null);l=d(t);a=d(r);f(r,{left:(n.left=="auto"?l.x-a.x+(t.offsetWidth>>1):parseInt(n.left,10)+s)+"px",top:(n.top=="auto"?l.y-a.y+(t.offsetHeight>>1):parseInt(n.top,10)+s)+"px"})}r.setAttribute("role","progressbar");e.lines(r,e.opts);if(!i){var u=0,p=(n.lines-1)*(1-n.direction)/2,c,h=n.fps,m=h/n.speed,y=(1-n.opacity)/(m*n.trail/100),g=m/n.lines;(function v(){u++;for(var t=0;t<n.lines;t++){c=Math.max(1-(u+(n.lines-t)*g)%m*y,n.opacity);e.opacity(r,t*n.direction+p,c,n)}e.timeout=e.el&&setTimeout(v,~~(1e3/h))})()}return e},stop:function(){var t=this.el;if(t){clearTimeout(this.timeout);if(t.parentNode)t.parentNode.removeChild(t);this.el=undefined}return this},lines:function(t,e){var r=0,a=(e.lines-1)*(1-e.direction)/2,l;function d(t,i){return f(o(),{position:"absolute",width:e.length+e.width+"px",height:e.width+"px",background:t,boxShadow:i,transformOrigin:"left",transform:"rotate("+~~(360/e.lines*r+e.rotate)+"deg) translate("+e.radius+"px"+",0)",borderRadius:(e.corners*e.width>>1)+"px"})}for(;r<e.lines;r++){l=f(o(),{position:"absolute",top:1+~(e.width/2)+"px",transform:e.hwaccel?"translate3d(0,0,0)":"",opacity:e.opacity,animation:i&&s(e.opacity,e.trail,a+r*e.direction,e.lines)+" "+1/e.speed+"s linear infinite"});if(e.shadow)n(l,f(d("#000","0 0 4px "+"#000"),{top:2+"px"}));n(t,n(l,d(e.color,"0 0 1px rgba(0,0,0,.1)")))}return t},opacity:function(t,e,i){if(e<t.childNodes.length)t.childNodes[e].style.opacity=i}});function c(){function t(t,e){return o("<"+t+' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">',e)}r.addRule(".spin-vml","behavior:url(#default#VML)");p.prototype.lines=function(e,i){var o=i.length+i.width,r=2*o;function s(){return f(t("group",{coordsize:r+" "+r,coordorigin:-o+" "+-o}),{width:r,height:r})}var a=-(i.width+i.length)*2+"px",l=f(s(),{position:"absolute",top:a,left:a}),d;function u(e,r,a){n(l,n(f(s(),{rotation:360/i.lines*e+"deg",left:~~r}),n(f(t("roundrect",{arcsize:i.corners}),{width:o,height:i.width,left:i.radius,top:-i.width>>1,filter:a}),t("fill",{color:i.color,opacity:i.opacity}),t("stroke",{opacity:0}))))}if(i.shadow)for(d=1;d<=i.lines;d++)u(d,-2,"progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");for(d=1;d<=i.lines;d++)u(d);return n(e,l)};p.prototype.opacity=function(t,e,i,o){var n=t.firstChild;o=o.shadow&&o.lines||0;if(n&&e+o<n.childNodes.length){n=n.childNodes[e+o];n=n&&n.firstChild;n=n&&n.firstChild;if(n)n.opacity=i}}}var h=f(o("group"),{behavior:"url(#default#VML)"});if(!a(h,"transform")&&h.adj)c();else i=a(h,"animation");return p});
