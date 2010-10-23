/*
File: flexie.js

About: Version
	0.1 pre

Project: Flexie

Description:
	Legacy support for the CSS3 Flexible Box Model

*/

/*
Class: Flexie
	Scoped to the Flexie Global Namespace
*/
var Flexie = (function(window, doc, undefined) {
	var $self = {},
	    i, j, k, l;
	
	var PIXEL = /^\d+(px)?$/i;
	var SIZES = /width|height|top|bottom|left|right|margin|padding|border(.*)?Width/;
	
	var prefixes = " -o- -moz- -ms- -webkit- -khtml- ".split(" ");
	
	var defaults = {
		orient : "horizontal",
		align : "stretch",
		direction : "normal",
		pack : "start"
	};
	
	var params = {}, props = {}, anti = {};
	
	/*
	selectivizr v1.0.0 - (c) Keith Clark, freely distributable under the terms 
	of the MIT license.

	selectivizr.com
	*/
	var selectivizr = (function() {
		var flexers = [];
		
		var RE_COMMENT = /(\/\*[^*]*\*+([^\/][^*]*\*+)*\/)\s*/g,
		    RE_IMPORT = /@import\s*url\(\s*(["'])?(.*?)\1\s*\)[\w\W]*?;/g,
		    RE_SELECTOR_GROUP = /(^|})\s*([^\{]*?[\[:][^{]+)/g,
			
		    // Whitespace normalization regexp's
		    RE_TIDY_TRAILING_WHITESPACE = /([(\[+~])\s+/g,
		    RE_TIDY_LEADING_WHITESPACE = /\s+([)\]+~])/g,
		    RE_TIDY_CONSECUTIVE_WHITESPACE = /\s+/g,
		    RE_TIDY_TRIM_WHITESPACE = /^\s*((?:[\S\s]*\S)?)\s*$/,
			
		    // String constants
		    EMPTY_STRING = "",
		    SPACE_STRING = " ",
		    PLACEHOLDER_STRING = "$1";

		// --[ patchStyleSheet() ]----------------------------------------------
		// Scans the passed cssText for selectors that require emulation and
		// creates one or more patches for each matched selector.
		function patchStyleSheet(cssText) {
			return cssText.replace(RE_SELECTOR_GROUP, function(m, prefix, selectorText) {	
				var selectorGroups = selectorText.split(",");
				for (var c = 0, cs = selectorGroups.length; c < cs; c++) {
					var selector = normalizeSelectorWhitespace(selectorGroups[c]) + SPACE_STRING;
					var patches = [];
				}
				return prefix + selectorGroups.join(",");
			});
		}

		// --[ trim() ]---------------------------------------------------------
		// removes leading, trailing whitespace from a string
		function trim(text) {
			return text.replace(RE_TIDY_TRIM_WHITESPACE, PLACEHOLDER_STRING);
		}

		// --[ normalizeWhitespace() ]------------------------------------------
		// removes leading, trailing and consecutive whitespace from a string
		function normalizeWhitespace(text) {
			return trim(text).replace(RE_TIDY_CONSECUTIVE_WHITESPACE, SPACE_STRING);
		}

		// --[ normalizeSelectorWhitespace() ]----------------------------------
		// tidys whitespace around selector brackets and combinators
		function normalizeSelectorWhitespace(selectorText) {
			return normalizeWhitespace(selectorText.replace(RE_TIDY_TRAILING_WHITESPACE, PLACEHOLDER_STRING).replace(RE_TIDY_LEADING_WHITESPACE, PLACEHOLDER_STRING));
		}
		
		// --[ determineSelectorMethod() ]--------------------------------------
		// walks through the selectorEngines object testing for an suitable
		// selector engine.
		function determineSelectorMethod() {
			// compatiable selector engines in order of CSS3 support
			var selectorEngines = {
				"NW" : "*.Dom.select",
				"DOMAssistant" : "*.$", 
				"Prototype" : "$$",
				"YAHOO" : "*.util.Selector.query",
				"MooTools" : "$$",
				"Sizzle" : "*", 
				"jQuery" : "*",
				"dojo" : "*.query"
			};
			
			var win = window, method;
			
			for (var engine in selectorEngines) {
				if (win[engine] && (method = eval(selectorEngines[engine].replace("*",engine)))) {
					return method;
				}
			}
			return false;
		}
		
		// --[ getXHRObject() ]-------------------------------------------------
		function getXHRObject() {
			if (window.XMLHttpRequest) {
				return new XMLHttpRequest;
			}
			
			try	{ 
				return new ActiveXObject('Microsoft.XMLHTTP') ;
			} catch(e) { 
				return null;
			}
		}
		
		// --[ loadStyleSheet() ]-----------------------------------------------
		function loadStyleSheet(url) {
			var xhr = getXHRObject();
			
			xhr.open("GET", url, false);
			xhr.send();
			return (xhr.status === 200) ? xhr.responseText : "";	
		}
		
		// --[ resolveUrl() ]---------------------------------------------------
		// Converts a URL fragment to a fully qualified URL using the specified
		// context URL. Returns null if same-origin policy is broken
		function resolveUrl(url, contextUrl) {
			
			// IE9 returns a false positive sometimes(?)
			if (!url) {
				return;
			}
			
			function getProtocolAndHost(url) {
				return url.substring(0, url.indexOf("/", 8));
			}

			// absolute path
			if (/^https?:\/\//i.test(url)) {
				return getProtocolAndHost(contextUrl) == getProtocolAndHost(url) ? url : null;
			}

			// root-relative path
			if (url.charAt(0) == "/")	{
				return getProtocolAndHost(contextUrl) + url;
			}

			// relative path
			var contextUrlPath = contextUrl.split("?")[0]; // ignore query string in the contextUrl
			if (url.charAt(0) != "?" && contextUrlPath.charAt(contextUrlPath.length-1) != "/") {
				contextUrlPath = contextUrlPath.substring(0, contextUrlPath.lastIndexOf("/") + 1);
			}

			return contextUrlPath + url;
		}
		
		// --[ parseStyleSheet() ]----------------------------------------------
		// Downloads the stylesheet specified by the URL, removes it's comments
		// and recursivly replaces @import rules with their contents, ultimately
		// returning the full cssText.
		function parseStyleSheet(url) {
			if (url) {
				var cssText = loadStyleSheet(url);
				return cssText.replace(RE_COMMENT, EMPTY_STRING).replace(RE_IMPORT, function( match, quoteChar, importUrl ) { 
					return parseStyleSheet(resolveUrl(importUrl, url));
				});
			}
			return EMPTY_STRING;
		}
		
		function buildSelectorTree(text) {
			var rules = [], ruletext, rule,
			    match, selector, proptext, splitprop, properties;
			
			// Tabs, Returns
			text = text.replace(/\t/g, "").replace(/\n/g, "").replace(/\r/g, "");
			
			// Leading / Trailing Whitespace
			text = text.replace(/\s?(\{|\:|\})\s?/g, "$1");
			
			ruletext = text.split("}");
			
			for (i = 0, j = ruletext.length; i < j; i++) {
				if (ruletext[i]) {
					rule = [ruletext[i], "}"].join("");
					
					match = (/(.*)\{(.*)\}/).exec(rule);
					
					if (match.length && match[2]) {
						selector = match[1];
						proptext = match[2].split(";");
						properties = [];
						
						for (k = 0, l = proptext.length; k < l; k++) {
							splitprop = proptext[k].split(":");
							
							if (splitprop.length && splitprop[1]) {
								properties.push({
									property : splitprop[0],
									value : splitprop[1]
								});
							}
						}
						
						rules.push({
							selector : selector,
							properties : properties
						});
					}
				}
			}
			
			return rules;
		}
		
		function findFlexBoxElements(rules) {
			var rule, selector, properties, prop,
			    property, value;
			
			for (i = 0, j = rules.length; i < j; i++) {
				rule = rules[i];
				selector = rule.selector;
				properties = rule.properties;
				
				for (k = 0, l = properties.length; k < l; k++) {
					prop = properties[k];
					property = prop.property;
					value = prop.value;
					
					if (property == "display" && value == "box") {
						flexers.push(rule);
					}
				}
			}
			
			return flexers;
		}
		
		function buildFlexieCall(flexers) {
			var flex, selector, properties, prop,
			    orient, align, direction, pack, lib, caller;
			
			for (i = 0, j = flexers.length; i < j; i++) {
				flex = flexers[i];
				
				selector = flex.selector;
				properties = flex.properties;
				
				orient = align = direction = pack = null;
				
				for (k = 0, l = properties.length; k < l; k++) {
					prop = properties[k];
					
					switch (prop.property) {
						case "box-orient" :
						orient = prop.value;
						break;
						
						case "box-align" :
						align = prop.value;
						break;
						
						case "box-direction" :
						direction = prop.value;
						break;
						
						case "box-pack" :
						pack = prop.value;
						break;
					}
				}
				
				if (orient || align || direction || pack) {
					lib = determineSelectorMethod();
					caller = lib(flex.selector);
					
					new $self.box({
						target : caller[0] || caller,
						orient : orient,
						align : align,
						direction: direction,
						pack : pack
					});
				}
			}
		}
		
		// --[ init() ]---------------------------------------------------------
		return function() {
			// honour the <base> tag
			var doc = document, url, stylesheet, c,
			    baseTags = doc.getElementsByTagName("BASE"),
			    baseUrl = (baseTags.length > 0) ? baseTags[0].href : doc.location.href;
			
			for (c = 0; c < doc.styleSheets.length; c++) {
				stylesheet = doc.styleSheets[c];
				
				if (stylesheet.href != "") {
					url = resolveUrl(stylesheet.href, baseUrl);
					
					if (url) {
						var cssText = patchStyleSheet(parseStyleSheet(url)),
						    tree = buildSelectorTree(cssText),
						    flexers = findFlexBoxElements(tree);
					}
				}
			}
			
			buildFlexieCall(flexers);
		};
	})();
	
	function calcPx(element, props, dir) {
		var value;
		dir = dir.replace(dir.charAt(0), dir.charAt(0).toUpperCase());

		var globalProps = {
			visibility : "hidden",
			position : "absolute",
			left : "-9999px",
			top : "-9999px"
		};

		var dummy = element.cloneNode(true);

		for (var i = 0, j = props.length; i < j; i++) {
			dummy.style[props[i]] = "0";
		}
		for (var key in globalProps) {
			dummy.style[key] = globalProps[key];
		}

		doc.body.appendChild(dummy);
		value = dummy["offset" + dir];
		doc.body.removeChild(dummy);

		return value;
	};
	
	function unAuto(element, prop) {
		switch (prop) {
			case "width" :
			props = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"];
			prop = calcPx(element, props, prop);
			break;

			case "height" :
			props = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"];
			prop = calcPx(element, props, prop);
			break;

			default :
			prop = style[prop];
			break;
		}

		return prop;
	};
	
	function getPixelValue(element, prop, name) {
		if (PIXEL.test(prop)) {
			return prop;
		}
		
		// if property is auto, do some messy appending
		if (prop === "auto") {
			prop = unAuto(element, name);
		} else {
			var style = element.style.left,
			    runtimeStyle = element.runtimeStyle.left;

			element.runtimeStyle.left = element.currentStyle.left;
			element.style.left = prop || 0;
			prop = element.style.pixelLeft;
			element.style.left = style;
			element.runtimeStyle.left = runtimeStyle;
		}
		
		return prop + "px";
	};
	
	function getComputedStyle(element, property) {
		if ("getComputedStyle" in window) {
			return doc.defaultView.getComputedStyle(element, null)[property];
		} else {
			property = toCamelCase(property);
			
			if (SIZES.test(property)) {
				property = getPixelValue(element, element.currentStyle[property], property);
			} else {
				property = element.currentStyle[property];
			}

			/**
			 * @returns property (or empty string if none)
			*/
			return property || "";
		}
	}
	
	function toCamelCase(cssProp) {
		var hyphen = /(-[a-z])/ig;
		while (hyphen.exec(cssProp)) {
			cssProp = cssProp.replace(RegExp.$1, RegExp.$1.substr(1).toUpperCase());
		}
		return cssProp;
	}
	
	function getParams(params) {
		for (var key in params) {
			params[key] = params[key] || defaults[key];
		}
		
		return params;
	}
	
	function clientWidth(element) {
		return element.innerWidth || element.clientWidth;
	}
	
	function clientHeight(element) {
		return element.innerHeight || element.clientHeight;
	}
	
	function appendProperty(target, prop, value) {
		var cssText = [];

		for (i = 0, j = prefixes.length; i < j; i++) {
			cssText.push(prop + ":" + prefixes[i] + value);
		}

		target.style.cssText = cssText.join(";");
		return target;
	}
	
	function appendPixelValue(target, prop, value) {
		var targets = target[0] ? target : [target];
		
		for (i = 0, j = targets.length; i < j; i++) {
			targets[i].style[prop] = (value ? (value + "px") : "");
		}
	}
	
	function applyBoxModel(target, children) {
		target.style.overflow = "hidden";
	}
	
	function applyBoxOrient(target, children, params) {
		for (var i = 0, j = children.length; i < j; i++) {
			var kid = children[i];
			kid.style.cssFloat = kid.style.styleFloat = "left";
		}
		
		// switch (params.orient) {
		// 	case "horizontal" :
		// 	case "inline-axis" :
		// 	break;
		// 	
		// 	case "vertical" :
		// 	case "block-axis":
		// 	break;
		// }
	}
	
	function applyBoxAlign(target, children, params) {
		var targetWidth = clientWidth(target);
	
		var groupHeight = 0, kid,
		    targetHeight = clientHeight(target);
		
		for (i = 0, j = children.length; i < j; i++) {
			groupHeight += clientHeight(children[i]);
		}
		
		switch (params.align) {
			case "stretch" :
			if (params.orient === "vertical") {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.cssFloat = kid.style.styleFloat = "";
				}
			} else {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.height = targetHeight + "px";
				}
			}
			break;
			
			case "start" :
			if (params.orient === "vertical") {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.width = getComputedStyle(kid, "width");
					kid.style.cssFloat = kid.style.styleFloat = "";
				}
			}
			break;
			
			case "end" :
			if (params.orient === "vertical") {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.marginLeft = (targetWidth - clientWidth(kid)) + "px";
				}
			} else {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.marginTop = (targetHeight - clientHeight(kid)) + "px";
				}
			}
			break;
			
			case "center":
			if (params.orient === "vertical") {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.marginLeft = (targetWidth / 2 - clientWidth(kid) / 2) + "px";
				}
			} else {
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style.marginTop = (targetHeight / 2 - clientHeight(kid) / 2) + "px";
				}
			}
			break;
			
			case "baseline":
			// target.style.verticalAlign = "baseline";
			break;
		}
	}
	
	function applyBoxDirection(target, children, params) {
		switch (params.direction) {
			case "normal" :
			break;
			
			case "reverse" :
			for (var i = children.length - 1; i >= 0; i--) {
				// children[i].style.cssText = "float: right";
				target.appendChild(children[i]);
			}
			break;
		}
	}
	
	function applyBoxPack(target, children, params) {
		var groupWidth = 0, groupHeight = 0,
		    totalWidth, totalHeight,
		    fractionedWidth, fractionedHeight;
		
		for (i = 0, j = children.length; i < j; i++) {
			groupWidth += clientWidth(children[i]);
			groupHeight += clientHeight(children[i]);
		}
		
		totalWidth = clientWidth(target) - groupWidth;
		totalHeight = clientHeight(target) - groupHeight;
		
	    fractionedWidth = Math.floor(totalWidth / (children.length - 1));
	    fractionedHeight = Math.floor(totalHeight / (children.length - 1));
		
		switch (params.pack) {
			case "start" :
			// target.style.textAlign = "left";
			break;
			
			case "end" :
			if (params.orient === "vertical") {
				children[0].style.marginTop = (totalHeight) + "px";
			} else {
				children[0].style.marginLeft = (totalWidth) + "px";
			}
			break;
			
			case "center" :
			if (params.orient === "vertical") {
				children[0].style.marginTop = (totalHeight / 2) + "px";
			} else {
				children[0].style.marginLeft = (totalWidth / 2) + "px";
			}
			break;
			
			case "justify" :
			if (params.orient === "vertical") {
				for (i = 1, j = children.length; i < j; i++) {
					children[i].style.marginTop = fractionedHeight + "px";
				}
			} else {
				for (i = 1, j = children.length; i < j; i++) {
					children[i].style.marginLeft = fractionedWidth + "px";
				}
			}
			break;
		}
	}
	
	function flexBoxSupported() {
		var dummy = doc.createElement("div");
		appendProperty(dummy, "display", "box");
		return ((dummy.style.display).indexOf("box") !== -1) ? true : false;
	}
	
	function boxModelRenderer(params) {
		var target = params.target,
		    nodes = target.childNodes,
		    children = [];
		
		params = getParams(params);
		
		var node = nodes[0];
		for (var i = 0, j = nodes.length; i < j; i++) {
			if (nodes[i]) {
				if (nodes[i].nodeType === 1) {
					children.push(nodes[i]);
				} else {
					target.removeChild(nodes[i]);
					i--;
				}
			}
		}
		
		applyBoxModel(target, children);
		applyBoxOrient(target, children, params);
		applyBoxAlign(target, children, params);
		applyBoxDirection(target, children, params);
		applyBoxPack(target, children, params);
	}
	
	$self.box = function(params) {
		var support = flexBoxSupported();
		
		if (!support) {
			boxModelRenderer(params);
		}
	};
	
	$self.init = function() {
		selectivizr();
	}();
	
	return $self;
})(this, document);
