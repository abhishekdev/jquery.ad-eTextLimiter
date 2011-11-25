/*****************************************************************************
* START: eTextLimiter
*****************************************************************************/
(function ($) {
	//'$:nomunge'; // Used by YUI compressor.
/**
* @function    eTextLimiter
* @author      Abhishek Dev
* @credits     Inspired by the "maxlength plugin" from http://remysharp.com by remy sharp
* @date        2011-Jun-01
* @modified    2011-Nov-24 by Abhishek Dev
* @version     1.0.0
* @requires    jQuery 1.4.2+
* @description Backports the HTML5 maxlength attribute on input[type=text],input[type=password],textarea and limits textenry in the fields.
* NOTE: Tested to work with Opera 10, Firefox 2/3/4, IE 7/8/9, Safari 5, Chrome 12

* @param {Object} userOption An object of type {onLimitReach:[function],normalizeCRLF:[boolean] }, the function is called whenever the eTextLimiter works.
* The handler function is passed an Objct of type {isMaxReached [Boolean], maxLength: [Integer], element: [DOM element in concern]}}
* Set normalizeCRLF property to true if Database/Controller side validation handling is not done to covert CRLF(\r\n) to LF (\n) resulting is inconsistent maxlength
* 
* @returns {jQueryObject} jQuery object on which called
*
* @example $([selector]).eTextLimiter(); // to initialize
* $([selector]).eTextarea({onLimitReach:maxLimitHandler}); // to initialize with custom limit Handler
*/
$.fn.eTextLimiter = function (userOption) {

	return this.each(function (i, element) {
		var $elem = $(element),
			addkeyEvents, init, isLimitReached,
			isCtrl=false,isAlt=false,
			timeRef, updateInProgress,
			opt = jQuery.extend({},$.fn.eTextLimiter.defaults,userOption),
			_originalTextLength = getTextLength($elem.val());

		if(opt.normalizeCRLF){
			jQuery.extend(opt,{
				// Finds linefeeds(LF) and replace with two spaces before validating maxlength.
				// Client side JavaScript treats linefeeds (LF) as one character, while on form submission using enctype "application/x-www-form-urlencoded"
				// they are converted to two character CRLF (\r\n)
				// {@see http://www.w3.org/TR/html4/interact/forms.html#h-17.13.4.1}
				preValidateNormalizeRegex: new RegExp("\\r?\\n", "g"),
				preValidateNormalizeText: "  "
				});
		}

		// Only work on textarea, and input[type=text|password]
		if ($elem.filter("input[type=text],input[type=password],textarea").length == 0) {
			return false;
		}

		// Bind the needed key events only when needed
		addkeyEvents = function () {

			$elem.unbind('keyup.eTextLimiter');
			$elem.unbind('keypress.eTextLimiter');
			$elem.unbind('keydown.eTextLimiter');
			$elem.unbind('change.eTextLimiter');
			$elem.unbind('blur.eTextLimiter');

			$elem.bind('keydown.eTextLimiter',limitChecker);

			// Put eventListeners
			timeRef = null, updateInProgress = false;

			$elem.bind('keyup.eTextLimiter', function (e) {
				if( e.which == 17 ) isCtrl = false;
		        if( e.which == 18 ) isAlt = false;

				if (updateInProgress) return;

				clearTimeout(timeRef);
				timeRef = null;

				timeRef = setTimeout(function () {
					clearTimeout(timeRef);
					timeRef = null;
					enforceMaxlength();
					updateInProgress = false;
				}, 150);

				updateInProgress = true;
			});

			$elem.bind('keypress.eTextLimiter', function (e) {

				if (updateInProgress) return;
				clearTimeout(timeRef);
				timeRef = null;

				timeRef = setTimeout(function () {
					clearTimeout(timeRef);
					timeRef = null;
					enforceMaxlength();
					updateInProgress = false;
				}, 150);

				updateInProgress = true;
			});

			$elem.bind('change.eTextLimiter, blur.eTextLimiter',function(e){
				enforceMaxlength();
			});

		};

		// Use text normalizer if specified other wise original length is returned
		function getTextLength(text){
			return  typeof text != "string" ? 0 :
					!opt.normalizeCRLF ? text.length :
						text.replace(opt.preValidateNormalizeRegex, opt.preValidateNormalizeText).length;
		}

		//KeyDown Event Handler
		function limitChecker(event) {

			var $el = $(this),
				length = getTextLength($el.val()),
				maxLength = parseInt($el.attr("maxlength")) || -1, // Check it everytime to get live values
				limit,
				code = event.keyCode,
				exceeded = length >= maxLength,
				returnCode = true,
				sl;

			if(typeof this.selectionStart != "undefined"){
				sl = (this.value).substring(this.selectionStart, this.selectionEnd);
			} else if (window.getSelection) {
    			sl = window.getSelection();
			} else if (document.getSelection) {
			    sl = document.getSelection();
			} else if (document.selection) {
			    sl = document.selection.createRange().text;
			}

			isLimitReached = false;

			if( opt.normalizeCRLF && code == 13){
				// More logic need to handle this case so cannot quick return
			}else if(!exceeded || sl != '' || isCtrl || isAlt ){
				return returnCode;
			}

			if( _originalTextLength > maxLength){
				_originalTextLength = length < _originalTextLength ? length : _originalTextLength ;
				limit = _originalTextLength;
			}
			else{
				limit = maxLength;
			}


			switch (code) {
				case 8:  // backspace
				case 9:  // tab
					break;
				case 17: isCtrl = true ; break;// control
					case 18: isAlt = true; break;// alt
				case 36: // cursor keys Start
				case 35:
				case 37:
				case 38:
				case 39:
				case 40: // cursor keys End
				case 46: //delete
					break;
				default:
					returnCode =  (code == 13 && (length >= limit-1) ) || (length == limit)? false : true;
			}

			if(!returnCode){
				isLimitReached = true;
			}

			return returnCode;
		}

		function enforceMaxlength(){
			var maxLength = parseInt($elem.attr("maxlength")) || -1, //Get latest value. -1 is the default value, added for code clarity; not needed otherwise
				currentStr = $elem.val(), //Get current values
				length = getTextLength(currentStr),
				limitedStr,
				limit, normalizeRegexMatchCount;

			// Invalid maxlength, -ve values are default when no maxlength is set
			if(maxLength >= 0 || !isLimitReached ){
				/*
				Dont truncate text (data loss!) when set from the server/user as text inside textarea tag,
				but enforce limits:
					1: do not allow text to be entered
					2: allow text to be deleted
					3: If by deleting the text comes below maxlength allow entry till maxlength is reached
				*/
				if( _originalTextLength > maxLength){
					_originalTextLength = length < _originalTextLength ? length : _originalTextLength ;
					limit = _originalTextLength;
				}
				else{
					limit = maxLength;
				}

				// Revert to old text when limit is reached
				if(length > limit){
					limitedStr = currentStr.substr(0, limit - getNormalizeRegexMatchCount(currentStr) );
					$elem.val(limitedStr);
				}

			}

			if(jQuery.isFunction(opt.onLimitReach)){
				opt.onLimitReach.call(window,{isMaxReached: isLimitReached, maxLength: maxLength, charCount: length, element: $elem[0]});
			}


			function getNormalizeRegexMatchCount(text){
				var normalizeRegexMatchCount = 0,
					regexSet;

				if(!opt.normalizeCRLF) {
					return normalizeRegexMatchCount;
				}

				regexSet = currentStr.match(opt.preValidateNormalizeRegex);
				normalizeRegexMatchCount = regexSet ? regexSet.length : 0;
				return normalizeRegexMatchCount;
			}

		}

		init = function (){
			addkeyEvents();
		}

		init();
	});


};

$.fn.eTextLimiter.defaults = {
	onLimitReach : $.noop,
	normalizeCRLF : false // Set this property to true if Database/Controller side validation handling is not done to covert CRLF(\r\n) to LF (\n) resulting is inconsistent maxlengths
};

})(jQuery);
/*****************************************************************************
* END: eTextLimiter
*****************************************************************************/
