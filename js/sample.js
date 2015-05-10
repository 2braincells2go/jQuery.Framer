$(function(){
	$('.framer').Framer({
		blur: "#wrap"
	});

	_V_.options.flash.swf = "/js/videojs/video-js.swf";

	prettyPrint();

	$("#api_sample").on("click", function() {
		$("body").append('<div id="api_contents">TESTEST <a href="#" id="api_close">CLOSE</a></div>');
		$.Framer.open('#api_contents', 'inline');

		$(document).on("click", '#api_close', function() {
			$.Framer.close();

			return false;
		});

		return false;
	});
});