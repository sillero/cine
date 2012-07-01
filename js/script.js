$(function(){
	cine = new $.cine('.cine',{
		debug: true,
		city: 'Porto Alegre',
		callbackVar: 'cine' //name of the $.cine variable
	});

});

;(function($){
	$.cine = function(el,options){
		var defaults = {
			debug: false,
			city: 'Porto Alegre',
			buildInterface: {
				frequency: 500 //miliseconds to wait before trying to build
			},
			callbackVar: 'cine',
			src: {
				yql: {
					url: 'http://query.yahooapis.com/v1/public/yql?',
					params: {
						callback: '{callbackVar}.parseGMovies',
						format: 'json',
						q: 'select * from html where {query}'
					}
				},
				movie: {
					start: 0,
					q: 'url="http://www.google.com/movies?near={city}&start={start}&sort=1" and (xpath="//div[@class=\'movie\']" or xpath ="//div[@id=\'navbar\']")'
				},
				theater: {
					start: 0,
					q: 'url="http://www.google.com/movies?near={city}&start={start}" and (xpath="//div[@class=\'theater\']" or xpath ="//div[@id=\'navbar\']")'
				}
			}
		}
		var plugin = this;
		plugin.selector = el, el = $(el);
		plugin.config = {}
		
		plugin.store = { movie: [], theater: []	}
		plugin.status = {
			store: { movie: 0, theater: 0 },
			init: 0,
			interface: 0
		}
		
		var init = function(){
			debug('plugin.status.init',plugin.status.init);
			plugin.config = $.extend({},defaults,options);
			// ------------
			requestData(plugin.config.src.movie);
			requestData(plugin.config.src.theater);
			plugin.status.init = 1;
			debug('plugin.status.init',plugin.status.init);
			debug('$.cine.init() $.cine:',plugin);
			buildInterface();
		}
		
		// helpers
		var debug = function(){
			if (plugin.config.debug) {
				var a = fixArray(arguments);
				if (typeof a[0] !== 'String')
					a.unshift('');
				console.log('[DEBUG] '+a[0],a[1])
			}
		}
		var fixArray = function(arr) {
			return ($.isArray(arr) ? arr : [arr]);
		}
		//---------------------------------------------
		
		var requestData = function(s){		
			$('head')
				.append('<script src="'+buildQuery(s)+'" type="text/javascript"></script>');
		}
		var buildQuery = function(query){
			// query = {} yql query options
			var src = {
				url: plugin.config.src.yql.url,
				params: $.extend({},plugin.config.src.yql.params)
			}
			src.params.callback = src.params.callback.replace('{callbackVar}', plugin.config.callbackVar);
			src.params.q = src.params.q.replace('{query}', query.q);
			src.params.q = src.params.q.replace('{city}', plugin.config.city.replace(' ','+'));
			src.params.q = src.params.q.replace('{start}', query.start);
			return src.url + $.param(src.params);
		}
		
		plugin.parseGMovies = function(d){
			// d = {} yql response
			
			//Analyze data for pagination and request the rest of the data
			var navbar = d.query.results.div[d.query.count-1].table.tr.td;
			var lastPage = (navbar[navbar.length-2].a === undefined);
			d.query.results.div.splice(d.query.count-1,1);
			
			//fixArray() in case there's only 1 movie/theater
			var o = fixArray(d.query.results.div);
			plugin.status.store[o[0].class] = 0;
			$.each(o,function(k,v){
				var n = {}
				switch (o[0].class) {
					case 'movie': 
						n = {
							title: $.trim(v.div[0].div.h2.a.content),
							info: $.trim(v.div[0].div.div.p),
							theaters: []
						}
						break;
					case 'theater':
						n = {
							name: $.trim(v.div[0].h2.a.content),
							info: $.trim(v.div[0].div.p.content),
							movies: []
						}
						break;
					default:
						plugin.debug('error - className');
						return false;
				}
				//fixArray() in case there's only 1 layout column
				$.each(fixArray(v.div[1].div), function(k1,v1){
					//fixArray() in case there's only 1 movie/theater
					$.each(fixArray(v1.div), function(k2,v2){
						var t = [];
						//fixArray() in case there's only 1 session
						$.each(fixArray(v2.div[1].span),function(k3,v3){
							// fix for session links
							if (v3.a !== undefined)
								v3 = v3.a
							t.push($.trim(v3.content));
						});
						switch (o[0].class) {
							case 'movie':
								n.theaters.push({
									name: $.trim(v2.div[0].div[0].a.content),
									times: t
								});
								break;
							case 'theater':
								n.movies.push({
									name: $.trim(v2.div[0].a.content),
									times: t
								});
								break;
						}
					});
				});
				plugin.store[o[0].class].push(n);
			});
			if (lastPage)
				plugin.status.store[o[0].class] = 1;
			else {
				plugin.config.src[o[0].class].start += 10;
				requestData(plugin.config.src[o[0].class]);
			}
				
			debug('$.cine.parseGMovies() $.cine.store.'+o[0].class+':', plugin.store[o[0].class]);
		}
		
		var buildInterface = function(){
			if (!(plugin.status.store.movie && plugin.status.store.theater))
				setTimeout(buildInterface,plugin.config.buildInterface.frequency)
			else {
				plugin.status.interface = 0;
				debug('plugin.status.interface',plugin.status.interface);
				
				debug('buildInterface()');
				
				plugin.status.interface = 1;
				debug('plugin.status.interface',plugin.status.interface);
			}
		}

		init();
	}
})(jQuery);