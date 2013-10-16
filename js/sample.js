$(function(){
	$('.framer').Framer();

	$('.ps_framer').Framer({
		isPushState: true
	});
	_V_.options.flash.swf = "./js/videojs/video-js.swf";

	prettyPrint();
});