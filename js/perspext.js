

var gDebugYouTubeAsDummy = false;
var gYouTubeMediaWidth = 128;// * 2;
var gYouTubeMediaHeight = 72;// * 2;
var gYouTubeMuted = ("" + window.location).match(/mute=1/) ? true : false;

// Use DateJS to figure out the local timezone.
function calcLocalTimezoneOffset()
{
	var local = new Date();
	var utc = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds(), local.getMilliseconds());
	return (utc - local.getTime()) / (60 * 60 * 1000); 
}


var gTZ = calcLocalTimezoneOffset();


// Gag console logging if not running in Firebug/Chrome (and prevent it
// from throwing exceptions)
if( typeof console === "undefined" )
{
    console = { 
		log: function(){},
		info: function(){},
		warn: function(){},
		error: function(){}
		};
}

//--------------------------------------------------------------------------------------
// HeadingOverlay
//--------------------------------------------------------------------------------------

/**
	A simple example of implementing a media overlay element. This provides
	the basic functionality required to display something.
*/
HeadingOverlay = function(moment)
{
	this.moment = moment;
	this.width = 32;
	this.height = 32;
	this.opacity = 1.0;
};

//Parent class
HeadingOverlay.prototype = new google.maps.OverlayView;

HeadingOverlay.prototype.draw = function()
{
	this.updateTimeAndLocation(this.moment.loc, false);
};

HeadingOverlay.prototype.onAdd = function()
{
	var elem = document.createElement("img");
	elem.src = "images/viewcone.png";
	elem.style.width = this.width + 'px';
	elem.style.height = this.height + 'px';
	elem.style.border = "0";
	
	// Save this for later so we don't have to look it up constantly.
	this._img = $(elem);

	this._img.hide();
	
	this._icon = document.createElement("img");
	// TODO: Do this properly please.
	if( this.moment.mediaType === "YouTube" )
		this._icon.src = "images/icon_youtube.png";
	else if( this.moment.mediaType === "Flickr" )
		this._icon.src = "images/icon_flickr.png";
	else if( this.moment.mediaType === "Twitter" )
		this._icon.src = "images/icon_twitter.png";
	else
		this._icon.src = "images/icon_unknown.png";
	this._icon.style.position = "absolute";
	this._icon.style.width = "21px";
	this._icon.style.height = "21px";
	this._icon.style.border = "0";
	
	// Link with the google map to actually display something
	this.getPanes().overlayImage.appendChild(elem);
	
	this.getPanes().floatShadow.appendChild(this._icon);
	
	// HACK: This is a workaround for how jQueryRotate does its thing.
	// In some browsers (i.e. those that don't support CSS rotation)
	// it actually replaces the img node with a span+canvas or whatever
	// to do the job. Thus, if we try to rotate the original img later,
	// it fails with a parenting problem. We don't actually need a copy
	// of the original img, luckily, so we'll just update our reference
	// to be a jQuery-ized reference to the span+whatever. The first call
	// to rotate() accomplishes this. However, it DOESN'T seem to return
	// the same array if CSS support is detected. We'll play nice with
	// both by calling it once now and saving the proper reference.
	var hack = this._img.rotate(0);
	if( hack.length > 0 )
	{
		this._img = hack[0];
	}

	// Make sure it's positioned correctly before adding.
	this.updateTimeAndLocation(this.moment.loc, false);

	// Note, we waited to do this here (rather than above) because the
	// hacky way jQueryRotate does things sort of mucks things up by
	// not copying all of our state. This way it works regardless of
	// what jQueryRotate does.
	
	this._img.css("position", "absolute");
	this._img.css("opacity", this.opacity);
	this._img.show();
	$(this._icon).css("opacity", this.opacity);
};

HeadingOverlay.prototype.onRemove = function()
{
	// Remove objects from DOM
	this._img.detach();
	this._img = undefined;
	$(this._icon).detach();
	this._icon = undefined;
};

HeadingOverlay.prototype.updateTimeAndLocation = function(loc, allowSeekAhead)
{
	if( !this._img )
		return

	// We'll just update the contents to display the time offset. Really you'll want something a
	// bit more useful here.
	var pt = this.getProjection().fromLatLngToDivPixel(loc.latlng);

	// Adjust so it's centered above the marker
	var img = this._img;
	
	img.css('left', (pt.x.toFixed(0) - this.width / 2) + "px");
	img.css('top', (pt.y.toFixed(0) - this.height / 2) + "px");
	
	// Center the icon (21px x 21px)
	this._icon.style.left = (pt.x.toFixed(0) - 10) + "px";
	this._icon.style.top = (pt.y.toFixed(0) - 10) + "px";
	
	// Rotate it to match the heading.
	var h = 0;
	if( loc.head !== null )
		h = loc.head;

	img.rotate(h);
};

HeadingOverlay.prototype.setOpacity = function(opacity)
{
	opacity = opacity.toFixed(1);
	if( this.opacity !== opacity )
	{
		this.opacity = opacity;
		if( this._img )
		{
			this._img.css('opacity', this.opacity);
		}
		$(this._icon).css('opacity', this.opacity);
	}
};

//--------------------------------------------------------------------------------------
// MomentView
//--------------------------------------------------------------------------------------

MomentView = function(moment)
{
	this.moment = moment;
};

MomentView.prototype.onPrimaryChanged = function(primary, fullscreen)
{
};

MomentView.prototype.getPreferredSize = function()
{
	return {width: 75, height: 75};
};

MomentView.prototype.getContentNode = function()
{
	// Override this in a subclass please.
	alert("MomentView.getContentNode not implemented!");
};

MomentView.prototype.play = function(){};

MomentView.prototype.pause = function(){};

MomentView.prototype.isBuffering = function(){ return false; };

MomentView.prototype.updateTimeAndLocation = function(loc, allowSeekAhead)
{
};


//--------------------------------------------------------------------------------------
// TwitterMomentView
//--------------------------------------------------------------------------------------

TwitterMomentView = function(moment, parentNode)
{
	this.moment = moment;
	
 
	// Example format of photo response:
	//
	//{    
	//	"text":"@twitterapi  http:\/\/tinyurl.com\/ctrefg",
	//    "to_user_id":396524,
	//    "to_user":"TwitterAPI",
	//    "from_user":"jkoum",
	//    "metadata":
	//    {
	//       "result_type":"popular",
	//       "recent_retweets": 109
	//    },
	//    "id":1478555574,   
	//    "from_user_id":1833773,
	//    "iso_language_code":"nl",
	//    "source":"<a href="http:\/\/twitter.com\/">twitter<\/a>",
	//    "profile_image_url":"http:\/\/s3.amazonaws.com\/twitter_production\/profile_images\/118412707\/2522215727_a5f07da155_b_normal.jpg",
	//    "created_at":"Wed, 08 Apr 2009 19:22:10 +0000"
	//}
	
	var p = moment.mediaId;
	
	var html = 
		'<div class="twitter_moment">' + 
		'<table>' +
			'<tr>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R1C1.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R1C2.png"/>' +
				'</td>' +
				'<td rowspan=5>' +
					'<img src="images/Twitter/images/Twitter-R1C3.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R1C4.png"/>' +
				'</td>' +
				'<td rowspan=5>' +
					'<img src="images/Twitter/images/Twitter-R1C5.png"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R2C1.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R2C2.png"/>' +
				'</td>' +
				'<td rowspan=3 background="images/Twitter/images/Twitter-R2C4.png">' +
					'<div class="twitter_moment_text">' +
						p.text +
					'</div>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R3C1.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="'+ p.profile_image_url + '"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R4C1.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R4C2.png"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R5C1.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R5C2.png"/>' +
				'</td>' +
				'<td>' +
					'<img src="images/Twitter/images/Twitter-R5C4.png"/>' +
				'</td>' +
			'</tr>' +
		'</table>' +
//		'<div style="clear:both;"/>' +
		'</div>';
	
	var div = document.createElement("div");
	div.innerHTML = html;
	
	this.elem = div;
	
	parentNode.appendChild(div);
	
	// Set the size and image URL
	// TODO: relying on this saved state is fragile (as it was a
	// hack to begin with)
	this.onPrimaryChanged(this.moment.primary, this.moment.fullscreen);
};

TwitterMomentView.prototype = new MomentView();

TwitterMomentView.prototype.getPreferredSize = function()
{
	return {width: 308, height: 100};
};

TwitterMomentView.prototype.getContentNode = function()
{
	return this.elem;
};

TwitterMomentView.prototype.destroy = function()
{
	$(this.elem).detach();
	this.elem = undefined;
};

//--------------------------------------------------------------------------------------
//FlickrMomentView
//--------------------------------------------------------------------------------------

FlickrMomentView = function(moment, parentNode)
{
	this.moment = moment;
	

	// Example format of photo response:
	//
	// {
	//   "id":"5368725289",
	//   "owner":"58505563@N02",
	//   "secret":"c0daef7e15",
	//   "server":"5210",
	//   "farm":6,
	//   "title":"IMG_1315",
	//   "ispublic":1,
	//   "isfriend":0,
	//   "isfamily":0,
	//   "latitude":0,
	//   "longitude":0,
	//   "accuracy":0
	// },
	//
	// To build a URL for the image:
	//	http://farm{farm-id}.static.Flickr.com/{server-id}/{id}_{secret}.jpg
	//		or
	//	http://farm{farm-id}.static.Flickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
	//		or
	//	http://farm{farm-id}.static.Flickr.com/{server-id}/{id}_{o-secret}_o.(jpg|gif|png)
	

	var p = moment.mediaId;
	
	this.thumb_src = "http://farm" + p.farm + ".static.Flickr.com/" +
		p.server + "/" + p.id + "_" + p.secret + "_t.jpg";
	this.large_src = "http://farm" + p.farm + ".static.Flickr.com/" +
	p.server + "/" + p.id + "_" + p.secret + ".jpg";
	this.thumbnail = true;
	
	var img = document.createElement("img");
	img.style.border = "0";
	
	var div = document.createElement("div");
	div.appendChild(img);
	
	$(div).css({
		'text-align':'center',
		'overflow':'auto'});
	
	this.img = img;
	this.elem = div;
	
	parentNode.appendChild(div);
	
	// Set the size and image URL
	// TODO: relying on this saved state is fragile (as it was a
	// hack to begin with)
	this.onPrimaryChanged(this.moment.primary, this.moment.fullscreen);
};

FlickrMomentView.prototype = new MomentView();

FlickrMomentView.prototype.getPreferredSize = function()
{
	return {width: 75, height: 75};
};

FlickrMomentView.prototype.getContentNode = function()
{
	return this.elem;
};

FlickrMomentView.prototype.destroy = function()
{
	$(this.elem).detach();
	this.elem = undefined;
};

FlickrMomentView.prototype.onPrimaryChanged = function(primary, fullscreen)
{
	if( primary && fullscreen )
	{
		this.thumbnail = false;
		this.img.src = this.large_src;
		this.img.style.width = "auto";
		this.img.style.height = "auto";
	}
	else
	{
		this.thumbnail = true;
		this.img.src = this.thumb_src;
		this.img.style.width = "75px";
		this.img.style.height = "75px";
	}
};

// --------------------------------------------------------------------------------------
// YouTubeMomentView
// --------------------------------------------------------------------------------------

var YOUTUBE_STATE =
{
	UNSTARTED: -1,
	ENDED: 0,
	PLAYING: 1,
	PAUSED: 2,
	BUFFERING: 3,
	CUED: 5
};
YOUTUBE_STATE[-1] = 'UNSTARTED';
YOUTUBE_STATE[0] = 'ENDED';
YOUTUBE_STATE[1] = 'PLAYING';
YOUTUBE_STATE[2] = 'PAUSED';
YOUTUBE_STATE[3] = 'BUFFERING';
YOUTUBE_STATE[5] = 'CUED';


/**
	A chromeless YouTube player embedded in the page.
*/
YouTubeMomentView = function(moment, parentNode)
{
	this.moment = moment; // TODO: Future GC problems due to cyclic ref?
	this.width = gYouTubeMediaWidth;
	this.height = gYouTubeMediaHeight;
	this.ytstate = -1;
	this.ytplayerId = 'moment_' + this.moment.id + '_ytplayer'; //+ (new Date().getTime());
	
	this.elem = document.createElement("div");
	this.elem.id = 'moment_' + this.moment.id + '_ytview';
    this.elem._momentView = this;
    //this.elem.style.position = 
    this.elem.style.width = '100%';//gYouTubeMediaWidth + "px";
    this.elem.style.height = '100%';//gYouTubeMediaWidth + "px";
    //this.elem.style.background = "blue";
    
    //var img = document.createElement("img");
    $(this.elem).css("background-image", "images/buffering.gif");
    //this.elem.appendChild(img);

    console.log("YT Player " + this.ytplayerId + " initializing");
	// Otherwise, create a new one.
    var div2 = document.createElement("div");
    div2.id = this.ytplayerId;
    this.elem.appendChild(div2);
    
    this.ytp = undefined; // Will be set by callback
    // Note: parentNode needs to be a visible part of document for
    // YT to load and initialize properly.
    parentNode.appendChild(this.elem);
	
	// Lets Flash from another domain call JavaScript
	var params = { 
		allowScriptAccess: "always",
		wmode: "transparent" // Allows DIVs on top
	};
	// The element id of the Flash embed
	var atts = {
		id: div2.id
		};
	
	var _this = this;
	
	// All of the magic handled by SWFObject (http://code.google.com/p/swfobject/)
	
	var url = "http://www.youtube.com/apiplayer?" +
	 		"enablejsapi=1&version=3&playerapiid=" + div2.id;

		//url = "http://localhost/blah";
	swfobject.embedSWF(url, div2.id, gYouTubeMediaWidth, gYouTubeMediaHeight,
		 "8", null, null, params, atts,
		function(e){
			if( e.success )
			{
				// TODO: Hrm. embedSWF returns success even if I give it a
				// broken url above. I need to figure out how to catch
				// when YouTube gives us a 500 (or other) error.
				var ytp = document.getElementById(e.id);
				console.log("EmbedSWF #" + _this.moment.id + " successful: " + ytp);
			}
			else
			{
				// TODO: add an "error" state to the view (i.e. handle this
				// robustly). Probably retrying if possible. Just avoid
				// endlessly buffering.
				console.error("EmbedSWF #" + _this.moment.id + " ERROR!");
				_this.embedError = true;
			}
		});
};

// Parent class (we supply some fake stuff for prototyping purposes.
YouTubeMomentView.prototype = new MomentView();

/**
	Global callback to deal with YouTube API state changes on a specific
	player.
	@param {String} playerId
		The ID of the EMBED/OBJECT DOM element of the YouTube player.
	@param {Number} state
		The new state of the player.
			Possible values are unstarted (-1), ended (0), playing (1),
			paused (2), buffering (3), video cued (5). When the SWF is
			first loaded it will broadcast an unstarted (-1) event.
			When the video is cued and ready to play it will broadcast
			a video cued event (5).
*/
function onYouTubePlayerStateChange(playerId, state)
{
	var ytp = document.getElementById(playerId);
	ytp.parentNode._momentView.ytstate = state;
	/*
	console.log("YT Player " + playerId + " state changed to " + state + 
			" (" + YOUTUBE_STATE[state] + ") [t: +" + 
			(ytp.getCurrentTime()).toFixed(1) + "s], parent = " +
			ytp.parentNode.parentNode.id);*/
}

/**
	Global callback to deal with chromeless players first being
	instantiated in the page.
	@param {String} playerId
		The ID of the EMBED/OBJECT DOM element of the YouTube player.
*/
function onYouTubePlayerReady(playerId)
{
	var ytp = document.getElementById(playerId);
	var ytv = ytp.parentNode._momentView;
	
	if( ytv.ytp === null )
	{
		// If we reparent the embed tag, then youtube API calls this
		// again. We'll just do nothing in that case.
		console.log("YT Player " + playerId + " ready (re-parenting) (API CALLBACK)");
	}
	else
	{
		console.log("YT Player " + playerId + " ready (API CALLBACK)");
		ytp.style.width = "100%";
		ytp.style.height = "100%";
	}

	ytv.ytp = ytp;
	

	// The embed element doesn't work quite like a normal DOM event system
	// (can't use closures, etc). We fake it by hacking together a string that is
	// interpreted as a function. See:
	// http://stackoverflow.com/questions/786380/using-youtubes-javascript-api-with-jquery
	ytp.addEventListener("onStateChange",
			'(function(state) { return onYouTubePlayerStateChange("' + playerId + '", state); })');
	
	ytp.setPlaybackQuality('small'); // Keep buffering to a minimum :(
	ytp.loadVideoById(ytv.moment.mediaId, ytv.moment.loc.rt / 1000.0);
	if( !ytv.moment.primary || gYouTubeMuted )
	{
		ytp.mute();
	}
	ytp.pauseVideo();
}

YouTubeMomentView.prototype.getContentNode = function()
{
	return this.elem;
};

YouTubeMomentView.prototype.destroy = function()
{
	swfobject.removeSWF(this.ytplayerId);
	this.elem = undefined;
	this.ytp = null;
};

YouTubeMomentView.prototype.getPreferredSize = function()
{
	return {width: gYouTubeMediaWidth, height: gYouTubeMediaHeight};
};

YouTubeMomentView.prototype.updateTimeAndLocation = function(loc, allowSeekAhead)
{
	var ytp = this.ytp;
	
	if( ytp )
	{
		var ytTime = ytp.getCurrentTime() * 1000;
		var skew = loc.rt - ytTime;
		
//		console.log("  yt view #" + this.moment.id + " updated to +" + (loc.rt / 1000.0).toFixed(1)
//					+ "s, skew = " + (skew / 1000.0).toFixed(1) + "s"); 
		
		if( Math.abs(skew) > 1500 ) // TODO: make this less forgiving
		{
			// We're beyond our sync threshold so let's force a seek
			// to try and keep up.

			// TODO: This is probably going to screw up when buffering
			// sucks... TEST PLEASE!
			console.log("YouTube time skew detected (" + (skew / 1000.0).toFixed(1)
					+ " sec(s)), synchronizing " + this.moment.mediaId);
			//if( !this.skewed )
			{
				ytp.seekTo(loc.rt / 1000.0, allowSeekAhead);
			}
			this.skewed = true;
		}
		else
		{
			this.skewed = false;
		}

		// BUG: Verify the video is actually playing if needed. Clicking the
		// little "youTube" link to view on youtube.com stops playback, and
		// then clicking back to this window it's not active. We should probably
		// pause the entire window when losing focus, but I'm not sure.
	}
};

//YouTubeMomentView.prototype.onParentChanged = function()
//{
//	var ytp = this.ytp;
//	if( ytp )
//	{
//		if( this.elem.parentNode )
//		{
//			console.log("YT Player " + this.ytplayerId + " parent changed to " +
//					this.elem.parentNode.id);
//		}
//		else
//		{
//			console.log("YT Player " + this.ytplayerId + " removed");
//			swfobject.removeSWF(this.ytplayerId);
//		}
//		//
//		this.ytp = null;
//	}
//};

YouTubeMomentView.prototype.play = function()
{
	var ytp = this.ytp;
	if( ytp )
	{
		//console.log("YT Player " + this.ytplayerId + " play()");
		ytp.playVideo();
	}
};

YouTubeMomentView.prototype.pause = function()
{
	var ytp = this.ytp;
	if( ytp )
	{
		if( ytp.getPlayerState() !== 2 )
		{
			//console.log("YT Player " + this.ytplayerId + " pause()");
			ytp.pauseVideo();
		}
	}
};

YouTubeMomentView.prototype.onPrimaryChanged = function(primary)
{
	var ytp = this.ytp;
	if( ytp )
	{
		if( gYouTubeMuted )
			return;
		
		if( primary )
		{
			ytp.unMute();
		}
		else
		{
			ytp.mute();
		}
	}
};

YouTubeMomentView.prototype.isBuffering = function()
{
	/*
        Possible values are unstarted (-1), ended (0), playing (1),
		paused (2), buffering (3), video cued (5). When the SWF is
		first loaded it will broadcast an unstarted (-1) event.
		When the video is cued and ready to play it will broadcast
		a video cued event (5).
	 */
	var ytp = this.ytp;
	if( ytp )
	{
		var state = this.ytstate;
		
//		if( this.skewed )
//			return true;
	
		return state === -1 || state === 3;
	}
	
	// If we haven't loaded the Embed object yet, we're "buffering"
	return !this.embedError;
};


//////////////////////////////////////////
var MEDIA_VIEWS = {
	'YouTube': YouTubeMomentView,
	'Flickr': FlickrMomentView,
	'Twitter': TwitterMomentView
};
//////////////////////////////////////////


//--------------------------------------------------------------------------------------
//MomentPane
//--------------------------------------------------------------------------------------

MomentPane = function(moment)
{
	this.moment = moment;
	this.visible = true;
	this.playing = false;
	
	var _this = this;
	
	this.div = $("<div>", {id: "moment_" + this.moment.id + "_pane"});
	this.div.css("position", "absolute");
	this.div.css("overflow", "hidden");
	this.div.css("margin-left", "auto");
	this.div.css("margin-right", "auto");
	
	this.clickDiv = $("<div>", {id: "moment_" + this.moment.id + "_clickdiv"});
	this.clickDiv.css("position", "absolute");
//	this.clickDiv.css("background-color", "cyan");
//	this.clickDiv.css("opacity", "0.2");
	
	this.clickDiv.click(
		function(e){
			$("#map_canvas").trigger('moment_click', [_this.moment]);
		});
	this.clickDiv.hover(
		function(e){
			$("#map_canvas").trigger('moment_mouse_in', [_this.moment]);
		},
		function(e){
			$("#map_canvas").trigger('moment_mouse_out', [_this.moment]);
		});
	
	$("#moment_media").append(this.div);
	$("#moment_media").append(this.clickDiv);
	
	this.mediaView = new MEDIA_VIEWS[this.moment.mediaType](this.moment,
			this.div.get()[0]);
	this.setPosition({x:-10000,y:-10000});
	this.onPrimaryChanged(this.moment.primary, this.moment.fullscreen);
};

MomentPane.prototype.destroy = function()
{
	this.mediaView.destroy();
	this.moment = null; // Allow GC
	$(this.div).detach();
	$(this.clickDiv).detach();
	this.div = null;
	this.clickDiv = null;
};

MomentPane.prototype.onPrimaryChanged = function(primary, fullscreen)
{
	if( this.moment.mediaType === "Twitter" )
		return;
	
	this.mediaView.onPrimaryChanged(primary, fullscreen);
	
	if( primary )
	{
		if( fullscreen )
			this.div.css("border", "0");
		else
			this.div.css("border", '1px solid red');
		this.div.css("z-index", '5');
		this.clickDiv.css("z-index", '6');

		if( fullscreen )
		{
			// This could be done every frame (like all the other updates)
			// but that seems a bit excessive.
			var target = $("#fs_media_target");
			var offset = target.offset();
			this.offset(offset);
			this.setSize({width:target.width(), height:target.height()});
		}
		else
		{
			this.setSize(this.mediaView.getPreferredSize());			
		}
	}
	else
	{
		if( this.moment.mediaType === "Twitter")
				this.div.css("border", '0px solid #ff6');
		else
				this.div.css("border", '1px solid #ff6');
		this.div.css("z-index", '0');
		this.clickDiv.css("z-index", '1');
		this.setSize(this.mediaView.getPreferredSize());
	}
};

MomentPane.prototype.setPosition = function(pt)
{
	this.div.css({ left: pt.x + "px", top: pt.y + "px" });
	this.clickDiv.css({ left: pt.x + "px", top: pt.y + "px" });
};

MomentPane.prototype.offset = function(offset)
{
	// Note: this is subtly different than .css("left/top")...
	// See the JQuery documentation.
	this.div.offset(offset);
	this.clickDiv.offset(offset);
};

MomentPane.prototype.setSize = function(size)
{
	this.div.width(size.width);
	this.div.height(size.height);
	this.clickDiv.width(size.width + 2); // +2 for border on this.div
	this.clickDiv.height(size.height + 2);
};

MomentPane.prototype.play = function()
{
	if( this.moment.active && !this.moment.playing )
	{
		this.mediaView.play();
		this.moment.playing = true;
	}
};

MomentPane.prototype.pause = function()
{
	this.moment.playing = false;
	this.mediaView.pause();
};

MomentPane.prototype.isBuffering = function()
{
	return this.moment.active && this.mediaView.isBuffering();
};

MomentPane.prototype.updateTimeAndLocation = function(loc, allowSeekAhead)
{
	return this.mediaView.updateTimeAndLocation(loc, allowSeekAhead);
};



// --------------------------------------------------------------------------------------
// Moment
// --------------------------------------------------------------------------------------

gMomentIdCounter = 0;

/**
	A base type of "moment" capturing a timespan, geospatial coordinate(s), 
	and a link to a media of some sort (YouTube, etc).
	@param {String} mediaType
		The predefined type of media that this moment refers to. E.g.
		"YouTube"
	@param {String} mediaId
		A unique ID that references the media in the system defined by
		mediaType. E.g. The video ID of the video in YouTube "sdf23f234"
*/
Moment = function(mediaType, mediaId)
{
	this.id = ++gMomentIdCounter;
	
	this.map = null;
	this.mediaType = mediaType;
	this.mediaId = mediaId;
	
	this.primary = false;
	this.fullscreen = false;
	this.active = false;
	this.loc = undefined; // Cached value from updateTime()
	this.prebuffering = false;
	
	this.mediaPane = null;
	
	this.routeTimes = [];
	var polyOptions = {
		strokeColor: '#FF0000',
		strokeOpacity: 1.0,
		strokeWeight: 1
	};
	this.routePos = [];
	this.routeHeading = [];
	this.routeElev = [];

	this.routePoly = new google.maps.Polyline(polyOptions);
	this.routePolyKI = null;

	var polyOptions = {
		strokeColor: '#990000',
		strokeOpacity: 0.5,
		strokeWeight: 1
	};
	this.routePreviewPoly = new google.maps.Polyline(polyOptions);
	
	this.headingOverlay = new HeadingOverlay(this);
};

/**
	Add a point to the route at the given time.
	<p>
	NOTE: Points currently must be added in increasing time order.
	@param {Number} time
		The time in UTC milliseconds.
	@param {Array or google.maps.LatLng} latlng
		The latitude and longitude (Numbers) (in ??? coordinate system)
	@param {Number} head (Optional)
		A compass reading [0,360) indicating the view/movement direction.
		In this system, 0 = north, 90 = east, 180 = south, 270 = west (i.e.
		measuring increasing angles clockwise).
	@param {Number} elev (Optional)
		The elevation component at the given point in time. Will often
		be <tt>undefined</tt> to indicate an unknown or assumed value.
*/
Moment.prototype.addRoutePoint = function(time, latlng, head, elev)
{
	if( this.routeTimes.length > 0 )
	{
		if( time < this.routeTimes[this.routeTimes.length-1] )
			throw new Error('Points must be added in increasing time order');
	}
	this.routeTimes.push(time);

	var pos = latlng instanceof Array
			? new google.maps.LatLng(latlng[0], latlng[1])
			: latlng;

	this.routePos.push(pos);
	this.routeElev.push(elev);
	this.routeHeading.push(head);
	
	this.routePreviewPoly.getPath().push(pos);
	
	// TODO: Remove this. Atm we don't have actual data, so I will
	// guess using the path.
	if( head === null && this.routeTimes.length > 1 )
	{
		var i = this.routeTimes.length - 1;
		// We just guess the view is looking straight ahead, so
		// plug it in.
		var p0 = this.routePos[i-1];
		var p1 = this.routePos[i];

		var h = google.maps.geometry.spherical.computeHeading(p0, p1);
		// We store to both because this may be the last point
		// (thus we just stick it as the last heading).
		this.routeHeading[i-1] = h;
		this.routeHeading[i] = h; 
	}
};

Moment.prototype.getStartTime = function()
{
	if( this.routeTimes.length === 0 )
		return null;
		
	return this.routeTimes[0];
};

Moment.prototype.getEndTime = function()
{
	if( this.routeTimes.length === 0 )
		return null;
		
	return this.routeTimes[this.routeTimes.length-1];
};

Moment.prototype.getDuration = function()
{
	if( this.routeTimes.length === 0 )
		return null;
		
	if( this.routeTimes.length === 1 )
		return 0;
	
	return this.getEndTime() - this.getStartTime();
};

/**
	Get a location within the moment's route at a specified point in time.
	This will interpolate between keyframes to determine the closest
	possible point. If outside the valid time range, the first (or
	last) point is used.
	@param {Number} time
		The UTC time in milliseconds
*/
Moment.prototype.getLocationAtTime = function(time)
{
	var len = this.routeTimes.length;
	
	if( len === 0 )
		return null;

	// Time relative to the first data point we have.
	// This is useful for viewers/etc to sync to when
	// displaying results.
	var rt = time - this.routeTimes[0];
	
	if( len === 1 )
		return {
			ki: 0,
			rt: rt,
			latlng: this.routePos[0],
			elev: this.routeElev[0],
			head: this.routeHeading[0] };
	
	// TODO: faster search please!
	var i;
	for( i = 0; i < len; ++i )
	{
		if( this.routeTimes[i] > time )
			break;
	}
	
	// Before the beginning
	if( i === 0 )
		return {
			ki: 0,
			rt: rt,
			latlng: this.routePos[0],
			elev: this.routeElev[0],
			head: this.routeHeading[0] };
	
	// Over the end
	if( i === len )
		return {
			ki: len-1,
			rt: rt,
			latlng: this.routePos[len-1],
			elev: this.routeElev[len-1],
			head: this.routeHeading[len-1] };
	
	// We're between point i-1 and i, so interpolate.
	
	var p0 = this.routePos[i-1];
	var p1 = this.routePos[i];
	var t0 = this.routeTimes[i-1];
	var t1 = this.routeTimes[i];
	var h0 = this.routeHeading[i-1];
	var h1 = this.routeHeading[i];
	var e0 = this.routeElev[i-1];
	var e1 = this.routeElev[i];
	
	var t = ((time - t0) / (t1 - t0));
	
	var lat = t * (p1.lat() - p0.lat()) + p0.lat();
	var lng = t * (p1.lng() - p0.lng()) + p0.lng();
	
	var h;
	if( h0 === null && h1 === null )
	{
		h = null;
	}
	else if( h0 === null )
	{
		h = h1;
	}
	else if( h1 === null )
	{
		h = h0;
	}
	else
	{
		// Do minimal arc interpolation here. e.g. if it goes
		// from 358 to 3, don't interpolate the long way.
		
		// "unwrap" an angle
		if( h1 - h0 > 180 )
			h1 -= 360;
		else if( h1 - h0 < -180 )
			h1 += 360;
		
		// Interpolate
		h = t * (h1 - h0) + h0;
		
		// Re "wrap" it back into the [0,360] range
		while( h < 0 )
			h += 360;
		while( h >= 360 )
			h -= 360;
	}
	
	var e = null;
	if( e1 !== null && e0 !== null )
		e = t * (e1 - e0) + e0;
	
	var loc = {
			ki: i-1,
			rt: rt,
			latlng: new google.maps.LatLng(lat, lng),
			elev: e,
			head: h };
	
	return loc;
};

Moment.prototype.setRouteVisible = function(visible) {/*TODO*/};
Moment.prototype.setMarkerVisible = function(visible) {/*TODO*/};

/**
	Set the Google map to use as a drawing surface.
*/
Moment.prototype.setMap = function(map)
{
	if( map != null )
	{
		this.map = map;
		this.routePoly.setMap(map);
		this.headingOverlay.setMap(map);
	}
	else
	{
		this.map = null;
		this.routePoly.setMap(null);
		this.headingOverlay.setMap(null);
	}
};

Moment.prototype.play = function()
{
	if( this.mediaPane )
		this.mediaPane.play();
};

Moment.prototype.pause = function()
{
	if( this.mediaPane )
		this.mediaPane.pause();
};

Moment.prototype.isBuffering = function()
{
	return this.mediaPane && this.mediaPane.isBuffering();
};

Moment.prototype.onPrimaryChanged = function(primary, fullscreen)
{
	this.primary = primary;
	this.fullscreen = fullscreen;
	
	this.routePoly.setOptions({
		strokeWeight: (primary ? 2 : 1)});

	if( this.mediaPane )
	{
		this.mediaPane.onPrimaryChanged(primary, fullscreen);
	}
};

/**
	Called every "frame" by a time manager to keep the moments in sync.
*/
Moment.prototype.updateTime = function(time, allowSeekAhead, primaryMoment, playing)
{
	//console.log("  update Moment #" + this.id + " to " + ((time - this.getStartTime()) / 1000.0).toFixed(2));
	
	var loc = this.getLocationAtTime(time);
	this.loc = loc;
	
	if( loc.ki !== this.routePolyKI )
	{
		this.routePolyKI = loc.ki;
		
		// If the "current" keyframe has changed, update our polyline's
		// points.
		var path = this.routePoly.getPath();
		while( path.getLength() > 0 )
		{
			path.removeAt(0);
		}
		
		var min_ki = loc.ki - 2;
		var max_ki = loc.ki + 3;
		if( min_ki < 0 )
			min_ki = 0;
		if( max_ki >= this.routePos.length )
			max_ki = this.routePos.length - 1;
		for( var i = min_ki; i <= max_ki; ++i )
		{
			path.push(this.routePos[i]);
		}
	}

	this.active = time >= this.getStartTime() && time <= this.getEndTime();

	if( this.active )
	{
		if( !this.mediaPane )
		{
			this.mediaPane = new MomentPane(this);
			this.headingOverlay.setOpacity(1.0);
			this.routePoly.setOptions({strokeOpacity:1.0});
		}
		
		if( playing && this.prebuffering )
		{
			this.mediaPane.play(); // Ensure playing (in case it was pre-buffering)
			this.prebuffering = false;
			this.headingOverlay.setOpacity(1.0);
			this.routePoly.setOptions({strokeOpacity:1.0});
		}
		this.mediaPane.updateTimeAndLocation(loc, allowSeekAhead);
		this.headingOverlay.updateTimeAndLocation(loc, allowSeekAhead);
		
		if( this.fullscreen )
		{
			if( this.primary )
			{
				// No other work needed here, it was positioned in
				// MomentPane.onPrimaryChanged
				this.primaryRelativeHeadingDebug = "";
			}
			else if( primaryMoment )
			{
				// If we have a primary moment in fullscreen, we need to
				// calculate our view-relative position
				var primaryLatLng = primaryMoment.loc.latlng;
				var primaryH = primaryMoment.loc.head;
				
				// Internets don't seem to agree on FOV of iPhone4 landscape...
				var viewAngle = 60.8;//55;//60.8;//90; 
				var halfViewAngle = viewAngle / 2;
				
				var h = google.maps.geometry.spherical.computeHeading(
						primaryLatLng,
						loc.latlng);
				// See if this heading is actually within our
				// primary's view angle (+/- 45 deg)
				
				// "unwrap" an angle
				var hdelta = h - primaryH;
				if( hdelta > 180 )
					hdelta -= 360;
				else if( hdelta < -180 )
					hdelta += 360;
				
				// TODO: optimize this. No sense checking this every frame
				var compass_offset = $("#fs_compass_bar").offset();
				var compass_width = $("#fs_compass_bar").width();
				
				if( Math.abs(hdelta) <= halfViewAngle )
				{
					// In the FOV
					var size = this.mediaPane.mediaView.getPreferredSize();
					
					compass_offset.left += ((hdelta + halfViewAngle) / viewAngle) *
							(compass_width - size.width);
					this.mediaPane.offset(compass_offset);
					
					// Just save this for some easy debugging later.
					this.primaryRelativeHeadingDebug = 
						(hdelta > 0 ? "+" + hdelta.toFixed(0) : hdelta.toFixed(0))
						+ "&deg;";
				}
				else
				{
					// Outside the FOV
					this.mediaPane.offset({top:-1000, left:-1000});//(false);

					// Just save this for some easy debugging later.
					this.primaryRelativeHeadingDebug = "(" +
						(hdelta > 0 ? "+" + hdelta.toFixed(0) : hdelta.toFixed(0))
						+ "&deg;)";
				}
			}
		}
		else
		{
			this.primaryRelativeHeadingDebug = "";
			
			var proj = this.map.getProjection();
			if( proj )
			{
				// Without going through a GMaps OverlayView, we need to 
				// do the translation ourselves...
				var topRight = proj.fromLatLngToPoint(this.map.getBounds().getNorthEast());
				var bottomLeft = proj.fromLatLngToPoint(this.map.getBounds().getSouthWest());
				var scale = Math.pow(2, this.map.getZoom());
				var worldPoint = proj.fromLatLngToPoint(loc.latlng);
				
				var pt = new google.maps.Point(
						(worldPoint.x - bottomLeft.x) * scale,
						(worldPoint.y - topRight.y) * scale);

				var size = this.mediaPane.mediaView.getPreferredSize();
				
				// Adjust so it's centered above the marker
				var left = (pt.x.toFixed(0) - size.width / 2);
				var top = (pt.y.toFixed(0) - size.height - 20);
				
				// HACK: Workaround the fact that overflow hidden doesn't seem
				// to capture properly when set on parent-of-my-parent and otherwise
				// the media overlaps the time scrubber.
				if( top < 0 )
				{
					this.mediaPane.setPosition({x:-10000, y:-10000});
				}
				else
				{
					this.mediaPane.setPosition({x:left, y:top});
				}
			}
		}
	}
	else
	{
		var fadeOutPeriod = 4000;
	
		if( time < this.getStartTime() )
		{
			fadeAmt = (this.getStartTime() - time) / fadeOutPeriod;
		}
		else
		{
			fadeAmt = (time - this.getEndTime()) / fadeOutPeriod;
		}
		
		// If we're in the seconds prior to being visible, create
		// the mediaPane now, in a paused and invisible state, and allow
		// it time to pre-buffer.
		
		if( fadeAmt > 1 )
		{
			if( this.mediaPane )
			{
				this.mediaPane.destroy();
				this.mediaPane = null;
				this.prebuffering = false;
			}
		}
		else
		{
			if( !this.mediaPane )
			{
				this.prebuffering = true;
				this.mediaPane = new MomentPane(this);
			}
		}
		
		if( fadeAmt > 1 )
			fadeAmt = 1;
		
		//opacity = 0.95 * (1 - fadeAmt) + 0.05;
		opacity = 1.0 * (1 - fadeAmt) + 0.0;
		this.routePoly.setOptions({strokeOpacity:opacity});
		this.headingOverlay.setOpacity(opacity);
	}
	
	return this.active;
};

// ============================================================================

//--------------------------------------------------------------------------------------
// TimeMap
//--------------------------------------------------------------------------------------

/**
	Main class encapsulating the TimeMap UI. This loads supporting
	libraries and initializes the UI (when appropriate).
*/	
TimeMap = function (elem)
{
	console.log("Creating TimeMap");

	this.parentElem = elem;
	this.moments = [];
	this.playing = true;
	this.fullscreen = false;
	this.buffering = 0;
	this.primaryMoment = null;
};

TimeMap.prototype.play = function()
{
	if( this.playing )
		return;
	
	// These are actually "backward" because they show the state it will change to
	$("#play_button").addClass('pause');

	this.playing = true;

	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		this.moments[i].play();
	}
	
	console.log("TimeMap playing at " +
			this._formatTimeSpan(this.timeMarkBase - this.timeStart) +
			" (+" + (this.timeMarkBase - this.timeStart) + "ms)");
	
	// Update the "play head" marker.
	this.timeMark = new Date().getTime();
	this._updateTime(this.timeMarkBase);
};

TimeMap.prototype.pause = function()
{
	if( !this.playing )
		return;
	
	// These are actually "backward" because they show the state it will change to
	$("#play_button").removeClass('pause');
	
	this.playing = false;
	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		this.moments[i].pause();
	}
	
	// "Save" the "play head" position.
	this.timeMarkBase += (new Date().getTime() - this.timeMark);
	
	console.log("TimeMap paused at " +
			this._formatTimeSpan(this.timeMarkBase - this.timeStart) +
			" (+" + (this.timeMarkBase - this.timeStart) + "ms)");
	
};

/**
 * Set the (global time) for this map based on a percentage of the current
 * time slice being viewed. This will update all moments and UI elements accordingly.
 * @param {Number} t
 * 			A normalized time value in the range [0.0,1.0]. Essentially
 *          a percentage of the total time.
 * @param allowSeekAhead
 * 			Allow a seekahead for the underlying moments (see the MediaMapOverlay
 * 			description of what this means).
 */
TimeMap.prototype.setNormalizedTime = function(t, allowSeekAhead)
{
	this.setTime(t * (this.timeEnd - this.timeStart) + this.timeStart);
};

/**
 * Set the time (global time) for this map in UTC milliseconds. This will
 * update all moments and UI elements accordingly.
 * @param {Number} time
 * 			A time value in UTC milliseconds.
 * @param allowSeekAhead
 * 			Allow a seekahead for the underlying moments (see the MediaMapOverlay
 * 			description of what this means).
 */
TimeMap.prototype.setTime = function(time, allowSeekAhead)
{
	// Update the "play head" marker.
	this.timeMark = new Date().getTime();
	this.timeMarkBase = time;
	
	console.log("TimeMap seeking to " + this._formatTimeSpan(time - this.timeStart));
	
	this._updateTime(this.timeMarkBase, allowSeekAhead);
};


/**
 * Update the UI and moments to correspond to the new time value. This
 * is not intended to be called by users.
 * @param time
 * 		Time in UTC milliseconds.
 * @param allowSeekAhead
 * 		Controls moments' seek behavior {@see MediaMapOverlay#updateTime}
 */
TimeMap.prototype._updateTime = function(time, allowSeekAhead)
{
	var activeMoment = null;
	var oldPrimaryMoment = this.primaryMoment;
	
	var playing = this.playing && !this.buffering;

	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		var m = this.moments[i];
//		try
		{
			var active = m.updateTime(time, allowSeekAhead, oldPrimaryMoment, playing);
			// assert( active === m.active );
			
			// The primary moment has to be "active". So if we
			// don't have one, find one, and if we had one that
			// is no longer active, find a new one.
			
			if( active )
			{
				if( !activeMoment )
				{
					activeMoment = m;
				}
			}
			else
			{
				if( this.primaryMoment === m )
				{
					this.setPrimaryMoment(null);
				}
			}
		}
//		catch( err )
//		{
//			console.error("Error updating moment " + m.id + ": " + err);
//		}
	}
	
	if( !this.primaryMoment && activeMoment )
	{
		this.setPrimaryMoment(activeMoment);
	}
	
	var compassDebug = "<i><b>Primary</b></i><br/>";

	var futureDebug = "<i><b>Future</b></i><br/>";
	
	if( this.primaryMoment )
	{
		compassDebug += "&nbsp;&nbsp;#" + this.primaryMoment.id + " H:"
			+ this.primaryMoment.loc.head.toFixed(0) + "&deg;<br/>"
			+ "<i><b>Secondary</b></i><br/>";
		
		for( var i = 0, len = this.moments.length; i < len; ++i )
		{
			var m = this.moments[i];
			if( m !== this.primaryMoment && m.primaryRelativeHeading !== "" ) 
			{
				if( m.active )
				{
					compassDebug += "&nbsp;&nbsp;#" + m.id + " " +
						m.primaryRelativeHeadingDebug + "<br/>"; 
				}
				else if( m.getStartTime() > time )
				{
					futureDebug += "&nbsp;&nbsp;#" + m.id + " (+" +
						((m.getStartTime() - time) / 1000).toFixed(0) + "s)<br/>";
				}
			}
		}
	}
	else
	{
		compassDebug += "&nbsp;&nbsp;(none)<br/>";
		
		for( var i = 0, len = this.moments.length; i < len; ++i )
		{
			var m = this.moments[i];
			if( m.getStartTime() > time )
			{
				futureDebug += "&nbsp;&nbsp;#" + m.id + " (+" +
					((m.getStartTime() - time) / 1000).toFixed(0) + "s)<br/>";
			}
		}
	}
	
	document.getElementById("fs_info_panel").innerHTML = compassDebug + futureDebug;

	var timeOffset = time - this.timeStart;

	document.getElementById("time_pos").innerHTML = 
		this._formatTimeSpan(timeOffset);
	
	document.getElementById("seek_nub").style.left =
		((timeOffset) * 100 / (this.timeEnd - this.timeStart))  + "%";
};

TimeMap.prototype.createMoment = function(mediaType, mediaId)
{
	var m = new Moment(mediaType, mediaId);

	this.moments.push(m);
	
	return m;
};

TimeMap.prototype.getMomentById = function(momentId)
{
	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		var m = this.moments[i];
		if( m.id === momentId )
		{
			return m;
		}
	}
	return null;
};

TimeMap.prototype._formatTimeSpan = function(spanMillis)
{
	var totalSecs = Math.floor(spanMillis / 1000);
	var min = Math.floor(totalSecs / 60);
	var secs = (totalSecs % 60).toFixed(0);
	return min.toFixed(0) + ":" + (secs < 10 ? "0" : "") + secs;
};

TimeMap.prototype.isFullscreen = function()
{
	return this.fullscreen;
};

TimeMap.prototype.setFullscreen = function(fullscreen)
{
	if( fullscreen === this.fullscreen )
		return;
	
	this.fullscreen = fullscreen;
	
	if( fullscreen )
	{
		$("#fullscreen_button").addClass("fullscreen");
		$("#fullscreen_canvas").show();
	}
	else
	{
		$("#fullscreen_button").removeClass("fullscreen");
		$("#fullscreen_canvas").hide('fast');
	}
	
	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		var m = this.moments[i];
		m.onPrimaryChanged(this.primaryMoment === m, fullscreen); 
	}
	
	this._tick(true);
};

TimeMap.prototype.setPrimaryMoment = function(moment)
{
	if( typeof moment === "number" )
	{
		moment = this.getMomentById(moment);
	}
	
	var oldPrimary = this.primaryMoment;
	
	this.primaryMoment = moment;
	
	if( oldPrimary === moment )
		return;
	
	if( oldPrimary )
	{
		oldPrimary.onPrimaryChanged(false, this.fullscreen);
	}
	
	if( moment )
	{
		console.log("Setting primary moment to Moment #" + moment.id);
		moment.onPrimaryChanged(true, this.fullscreen);
	}
	else
	{
		console.log("Setting primary moment to null");
	}
};

TimeMap.prototype._tick = function(forceUpdate)
{
	// MAIN UPDATE TICK
	var t = new Date().getTime();
	var dt = t - this._lastTime;
	this._lastTime = t;
		
	var calcFps = dt > 0 ? 1000 / dt : 1000;
	this._avgFps = this._avgFps * 0.9 + calcFps * 0.1;
	document.getElementById("fps").innerHTML = "FPS:&nbsp;" + calcFps.toFixed(0);
	
	var wasBuffering = this.buffering;
	this.buffering = 0;
	for( var i = 0, len = this.moments.length; i < len; ++i )
	{
		if( this.moments[i].isBuffering() )
		{
			this.buffering = t;				
			break;
		}
	}
	
	// We have to do some magic with timeMark here effectively "pause"
	// while buffering. We also provide a small window after buffering
	// is complete to ensure we give it just a bit more time to buffer
	// and avoid a flickering buffering screen.
	if( wasBuffering && !this.buffering )
	{
		if( (t - wasBuffering) > 1500 )
		{
			console.log("Meta-Buffering is complete. Resuming at +" +
					(this.timeMarkBase - this.timeStart).toFixed(0) + "ms.");
			$("#buffering_canvas").hide();
			this.timeMark = new Date().getTime();
			if( this.playing )
			{
				for( var i = 0, len = this.moments.length; i < len; ++i )
				{
					this.moments[i].play();
				}
			}
		}
		else
		{
			// Keep "buffering" for a bit even though no moments reported
			// needing it.
			this.buffering = wasBuffering;
		}
	}
	else if( !wasBuffering && this.buffering )
	{
		if( this.playing )
			this.timeMarkBase += (new Date().getTime() - this.timeMark);
		$("#buffering_canvas").show();
		console.log("Meta-Buffering is necessary. Pausing playback at +" +
				(this.timeMarkBase - this.timeStart).toFixed(0) + "ms.");
	}
	
	if( this.playing && !this.buffering )
	{
		// TODO: Add a fast-forward/rewind mode?

		// We add time in "buckets" of a sort using this mark
		// system so that we avoid a time-drift issue by, say,
		// simply adding dt to the last time we had. The assumption
		// is that the mark is updated every time the play head
		// is manually positioned (as opposed to every frame), so
		// the system clock is always being used as a reference.

		var newTime = (t - this.timeMark) + this.timeMarkBase;
		if( newTime > this.timeEnd )
		{
			// Keep from going off the end please.
			newTime = this.timeEnd;
		}
		
		this._updateTime(newTime, true);
	}
	else if( this.buffering )
	{
		// Often things are just being loaded up initially, and
		// the code currently plays-on-load, so we'll pause everything
		// while we're buffering. It's overkill, yes, but works for now.
		for( var i = 0, len = this.moments.length; i < len; ++i )
		{
			this.moments[i].pause();
		}
		
		if( forceUpdate )
		{
			this._updateTime(this.timeMarkBase, false);			
		}
	}
	else if( forceUpdate )
	{
		this._updateTime(this.timeMarkBase, false);
	}
};


/**
	Initialize the HTML and various other structures after supporting libraries
	have been asynchronously loaded.
*/
TimeMap.prototype.init = function()
{
	var _tmap = this;
	
	$("#play_button").click(function(){
		if( _tmap.playing )
		{
			_tmap.pause();
		}
		else
		{
			_tmap.play();
		}
	});
	
	$("#fullscreen_button").click(function(){
		_tmap.setFullscreen(!_tmap.isFullscreen());
	});
	
	var troughPreviewFunc = function(evt){
		var origin = $(this).offset().left;
		var size = $(this).width();
		//console.log("mousemove: " + evt.which);
		var pct = (evt.pageX - origin) / size;
		//_tmap.setNormalizedTime(pct, false);
		var preview = $("#seek_preview");
		preview.css('display', 'block');
		preview.css('left', (pct * 100).toFixed(0) + '%');
	};
	
	$("#seek_trough").mousemove(troughPreviewFunc);
	$("#seek_trough").mouseenter(troughPreviewFunc);
	
	$("#seek_trough").mouseleave(function(evt){
		var preview = $("#seek_preview");
		preview.css('display', 'none');
	});

	$("#seek_trough").click(function(evt){
		var origin = $(this).offset().left;
		var size = $(this).width();
		_tmap.setNormalizedTime((evt.pageX - origin) / size, true);
		var preview = $("#seek_preview");
		preview.css('display', 'none');
	});
	
	$("#map_canvas").bind('moment_click', function(e, momentId) {
		_tmap.setPrimaryMoment(momentId);//alert("Moment " + momentId + " clicked.");
	});
	
	$("#map_canvas").bind('moment_mouse_in', function(e, moment) {
		moment.routePreviewPoly.setMap(_tmap.map);
	});
	
	$("#map_canvas").bind('moment_mouse_out', function(e, moment) {
		moment.routePreviewPoly.setMap(null);
	});
	
	var mapOptions = 
	{
		zoom: 19,
		// TODO: this center should be determined automatically
		center: new google.maps.LatLng(43.652288, -79.383281),
		mapTypeId: google.maps.MapTypeId.HYBRID,
		mapTypeControl: false,
		streetViewControl: false,
		panControl: false
	};
	
	this.map = new google.maps.Map(document.getElementById(this.parentElem), mapOptions);

	google.maps.event.addListener(this.map, 'bounds_changed', function(e) {
		// Force a redraw in case the map changed its view/etc
		_tmap._tick(true);
	});
	
	
	// This is a temporary tool that lets us clean up some of the data.
	// It will spit out the heading using the primary moment's current
	// location as the origin, and looking at a mouse click.
	google.maps.event.addListener(this.map, 'click', function(e) {
		if( _tmap.primaryMoment )
		{
			var h = google.maps.geometry.spherical.computeHeading(
						_tmap.primaryMoment.loc.latlng, e.latLng);
			if( h < 0 )
				h += 360;
			console.log("At time " + (_tmap.primaryMoment.loc.rt +
					_tmap.primaryMoment.getStartTime()) +
					", heading toward click (" +
					e.latLng.lat().toFixed(6) + ", " +
					e.latLng.lng().toFixed(6) + ") is " + h.toFixed(1));
		}
	  });	
	
	// The bookends on the slice of time we're interested in. They will
	// update when moments are added.
	this.timeStart = null;
	this.timeEnd = null;
	this.timeMark = new Date().getTime();
	this.timeMarkBase = this.timeMark;
	
	var goalFps = 12;

	this._timeout = setInterval(function() { _tmap._tick(); },
			1000.0 / goalFps);
	
	// TODO: Actually pull data from somewhere. For now, just simulate it.
	this.loadMoments(DEFAULT_DATA);
	// This kicks in only if we're not loading the sample data in DEFAULT_DATA 
	if( this.timeStart === null )
	{
		// Flickr sample data date range (just so we have something)
		this.timeStart = 1295213738000;
		this.timeEnd   = 1295215305000;
	}
	this._loadFlickr(this.timeStart, this.timeEnd, mapOptions.center);
//	this.timeStart = 1295203347000;
//	this.timeEnd   = 1295203381000;
	this._loadTwitter(this.timeStart, this.timeEnd, mapOptions.center);
	
	// Put us at the beginning please!
	this.setTime(this.timeStart);

	var timeSpan = this._formatTimeSpan(this.timeEnd - this.timeStart);
	document.getElementById("time_len").innerHTML = timeSpan;
	console.log("TimeMap total time span: " + timeSpan);
	
	console.log("TimeMap initialized");
	
	// TODO: REMOVEME: For testing, let me start here instead please.
	//this.pause();
	//this.setTime(this.timeStart + 44000);//45000);
	//this.setFullscreen(true);
};

TimeMap.prototype._loadFlickr = function(startTime, endTime, latlng, radius)
{
	// Build a Flickr API query searching for images matching the
	// given timespan and geo search range.
	
	// HACK: Marty uploaded these with wrong dates to try and fix it before
	var flickrHackOffset = 3 * 3600 * 1000;
	startTime += flickrHackOffset;
	endTime += flickrHackOffset;
	
	
	var apiKey = "&api_key=d696055aea830d0689f0e23703131a12";
	var user_id = "&user_id=58505563%40N02";
	var date = "&min_taken_date=" + (startTime / 1000.0).toFixed(0) 
		+ "&max_taken_date=" + (endTime / 1000.0).toFixed(0);
	var geo = "&lat=" + latlng.lat() + "&lon=" + latlng.lng() +
		(typeof radius === "undefined" ? "" : "&radius=" + radius); 
	var url = "http://api.flickr.com/services/rest/?method=flickr.photos.search"
		+ apiKey
		+ "&format=json&jsoncallback=?" // See JQuery's JSONP handling
		+ user_id
		+ date 
		//+ geo
		+ "&has_geo=1&extras=geo,date_taken";
	
	//min_taken_date=1295160115
	//               1295214954
	//max_taken_date=1295246515

	console.log("Fetching Flickr results for " + date);
	
	// Issue the callback by generating a script node and letting
	// the browser interpret it.
	var _tmap = this;
	
	$.getJSON(url, function(rsp)
	{
		//http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=bc19e7312d0d6d537261bdcd9cf80b24&user_id=58505563%40N02&has_geo=&extras=geo&format=json
		if( rsp.stat !== "ok" )
		{
			// TODO: handle error condition
			console.error("Flickr reported an error: [" + rsp.code + "] " +
					rsp.message);
			return;
		}
		
		// Otherwise, let's create some moments!
		var moments = [];
		
		// Translate the JSON response into the moment data format,
		// then add it to the time map.
		
		console.log("Found " + rsp.photos.photo.length + " Flickr moment(s).");
		
		var min_date;
		var max_date;
		
		for( var i = 0, len = rsp.photos.photo.length; i < len; ++i )
		{
			var p = rsp.photos.photo[i];
			
			// Example format of photo response:
			//
			// {
			//   "id":"5368725289",
			//   "owner":"58505563@N02",
			//   "secret":"c0daef7e15",
			//   "server":"5210",
			//   "farm":6,
			//   "title":"IMG_1315",
			//   "ispublic":1,
			//   "isfriend":0,
			//   "isfamily":0,
			//   "latitude":0,
			//   "longitude":0,
			//   "accuracy":0
			// }, 
			
			// Translate "2011-01-16 13:46:26" into milliseconds UTC
			
			// Note: this uses http://www.datejs.com/ (not the default
			// Date.parse() browser implementation) to parse dates
			// because FF's implementation doesn't seem very robust
			// (returns NaN for valid dates).
			
			// HACK: This timezone business is attempting to workaround
			// the fact that the sample data was uploaded as PST, but with
			// EST timezone values. E.g.:
			//    http://www.flickr.com/photos/58505563@N02/5414145909/meta/
			//    Reports Jan 16 2011 1:46pm PST, but the actual time was
			//    1:46pm EST (which in UTC is 18:46).
			// Thus the wonkiness.
			var t = Date.parse(p.datetaken);//.setTimezone("UTC");
			
			var t2 = t.clone().setTimezoneOffset("-0800");
			var tz = gTZ;
			
			// Finally, we just want the milliseconds UTC
			var _t1 = t.getTime();
			var _t2 = t2.getTime() - flickrHackOffset;
			var _tS = _tmap.timeStart;
			var _tE = _tmap.timeEnd;

			// this one seems correct...
			t = _t2;
			
			if( min_date === undefined || t < min_date )
				min_date = t;
			if( max_date === undefined || t > max_date )
				max_date = t;
			
			// We simulate a duration of X seconds (10 in this case)
			// just to keep it around for a bit as a demo. It's not
			// really clear how time should factor in here.
			moments.push({
				mediaType: 'Flickr',
				mediaId: p,
				route: [
				   [ t, p.latitude, p.longitude, null, null ],
				   [ t + 10000, p.latitude, p.longitude, null, null ]
				]
			});
		}
		
		console.log("Flickr date range is " + min_date + " to " + max_date);
		
		// Load into the global
		_tmap.loadMoments(moments);
	});
};

TimeMap.prototype._loadTwitter = function(startTime, endTime, latlng, radius)
{
	// Build a Twitter API query searching for tweets matching the
	// given timespan and geo search range.
	
	var date = 
		"&since=" + new Date(startTime / 1000.0).toString("yyyy-MM-dd") +
		"&until=" + new Date(endTime / 1000.0).toString("yyyy-MM-dd");
	var geo = "&geocode=" +
		latlng.lat() + "%2C" + latlng.lng() + "%2C" + 
		(typeof radius === "undefined" ? "5km" : radius + "km");
	var url = "http://search.twitter.com/search.json?"
		+ "&callback=?" // See JQuery's JSONP handling
		+ date 
		+ geo
		+ "&show_user=true"
		+ "&has_geo=1&extras=geo,date_taken";
	
	console.log("Fetching Twitter results for " + date);
	
	// Issue the callback by generating a script node and letting
	// the browser interpret it.
	var _tmap = this;

	
	$.getJSON(url, function(rsp)
	{
		// HACK: For now we're just going to fake twitter results
		// 1) Because we don't actually have twitter data for the demo
		// 2) Twitter doesn't reliably store information that far back anyway
		rsp = FAKE_TWITTER_DATA; 

		if( !rsp.results )
			return;
		
		// Otherwise, let's create some moments!
		var moments = [];
		
		// Translate the JSON response into the moment data format,
		// then add it to the time map.
		
		console.log("Found " + rsp.results.length + " Twitter moment(s).");
		
		var min_date;
		var max_date;
		
		for( var i = 0, len = rsp.results.length; i < len; ++i )
		{
			var p = rsp.results[i];
			
			// Example format of photo response:
			//
			//{    
			//	"text":"@twitterapi  http:\/\/tinyurl.com\/ctrefg",
			//    "to_user_id":396524,
			//    "to_user":"TwitterAPI",
			//    "from_user":"jkoum",
			//    "metadata":
			//    {
			//       "result_type":"popular",
			//       "recent_retweets": 109
			//    },
			//    "id":1478555574,   
			//    "from_user_id":1833773,
			//    "iso_language_code":"nl",
			//    "source":"<a href="http:\/\/twitter.com\/">twitter<\/a>",
			//    "profile_image_url":"http:\/\/s3.amazonaws.com\/twitter_production\/profile_images\/118412707\/2522215727_a5f07da155_b_normal.jpg",
			//    "created_at":"Wed, 08 Apr 2009 19:22:10 +0000"
			//}
			
			// Translate "Wed, 08 Apr 2009 19:22:10 +0000" into milliseconds UTC
			
			var t = Date.parse(p.created_at);//.setTimezone("UTC");
			var t2 = t.clone().setTimezone("GMT");//.addHours(-gTZ);
			var tz = gTZ;
			
			// Finally, we just want the milliseconds UTC
			var _t1 = t.getTime();
			var _t2 = t2.getTime();
			// this one seems correct...
			t = t2.getTime();
			// start = 1295214115000
			// end   = 1295214417000
			
			// Extra filtering because Twitter only works at the day
			// level...
			if( t < startTime || t > endTime )
				continue;
			
			var latlng = p.location.match(/: (-?[0-9\.]+),\s*(-?[0-9\.]+)/);
			if( !latlng || latlng.length !== 3 )
			{
				// TODO: Try the 'geo' field instead (if I even knew what this looked like) 
			}
			
			if( !latlng )
				continue;
			
			var lat = parseFloat(latlng[1]);
			var lng = parseFloat(latlng[2]);
			
			if( min_date === undefined || t < min_date )
				min_date = t;
			if( max_date === undefined || t > max_date )
				max_date = t;
			
			// We simulate a duration of X seconds (10 in this case)
			// just to keep it around for a bit as a demo. It's not
			// really clear how time should factor in here.
			moments.push({
				mediaType: 'Twitter',
				mediaId: p,
				route: [
				   [ t, lat, lng, null, null ],
				   [ t + 10000, lat, lng, null, null ]
				]
			});
		}
		
		console.log("Twitter date range is " + min_date + " to " + max_date);
		
		// Load into the global
		_tmap.loadMoments(moments);
	});
};

TimeMap.prototype.loadMoments = function(momentData)
{
	// TODO: We should make this "duplicate safe" and avoid adding
	// new entries. This would let us call it multiple times (for instance
	// in response to the map moving far enough away, or changing the
	// time span in an interactive search mode).
	
	for( var i = 0, len = momentData.length; i < len; ++i )
	{
		var data = momentData[i];
		
		// Translate raw data.
		
		var m = this.createMoment(data.mediaType, data.mediaId);
		
		for( var j = 0, len_j = data.route.length; j < len_j; ++j )
		{
			var p = data.route[j];
			var t = p[0];

			if( data.timeStart !== undefined )
			{
				t += data.timeStart;
			}
			
			if( this.timeStart === null || this.timeStart > t )
			{
				this.timeStart = t;
			}
			if( this.timeEnd === null || this.timeEnd < t )
			{
				this.timeEnd = t;
			}
			
			// TODO: allow LatLng creation here rather than kludgy array business.
			m.addRoutePoint(t, [p[1], p[2]], p[3], p[4]);
		}
		
		m.setMap(this.map);
	}
	
	// Force the newly added moments to be in sync, time-wise
	this._tick(true);
	
	// Sort moments chronologically
	this.moments.sort(function(a,b)
	{
		return a.getStartTime() - b.getStartTime();
	});
};



