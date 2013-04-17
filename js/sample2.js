$(function(){
	$('.framer').Framer({
		closeBtn: '<div class="close_btn">Close</div>',
		description: '<div id="frm_description"><div class="descrition_wrap">{description}</div></div>'
	});
	_V_.options.flash.swf = "./js/videojs/video-js.swf";

	prettyPrint();
});