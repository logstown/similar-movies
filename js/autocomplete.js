var apikey = "jjfwv3tdzmqxz63pjtdgevqv";

$(document).ready(function() {
	var sys = arbor.ParticleSystem() 
	sys.parameters({gravity:true}) 
	sys.renderer = Renderer("#viewport") 
	
	$("#search").autocomplete({
		source: function( search, response ) {
			$.ajax("http://api.rottentomatoes.com/api/public/v1.0/movies.json", {
				data: {
					apikey: apikey,
					q: search.term,
					page_limit: 5
				},
				dataType: "jsonp",
				success: function(data) {
					response($.map(data.movies, function(movie) {
						return {
							label: movie.title,
							thumb: movie.posters.thumbnail,
							id: movie.id,
							year: movie.year
						}
					}));           
				}
			});
		},
		messages: {
			noResults: null,
			results: function() {}
		},
		select: function( event, ui ) {
			sys.prune(function(node, pt) {return true } );
	
			var similarURL = 'http://api.rottentomatoes.com/api/public/v1.0/movies/' + ui.item.id + '/similar.json';
			$.ajax(similarURL, {
				type: "GET",
				data: {	apikey: apikey },
				dataType: "jsonp",
				async: false,

				success: function(data) {
					sys.addNode(ui.item.id, {label:ui.item.label, year:ui.item.year, color:'00A383'})
					addNodes(data, ui.item.id, sys);
				}
			});

			$(this).val('');
			$("span").css("visibility", "visible");
		}
	}).data( "autocomplete" )._renderItem = function( ul, item ) {
		var link = $("<a>").text(item.label)
		if (item.thumb !== "http://images.rottentomatoescdn.com/images/redesign/poster_default.gif") {
		    var img = $("<img>").attr("src", item.thumb);
			var link = link.prepend(img);
		}

		return $("<li>")
			.data( "item.autocomplete", item )
			.append(link)
			.appendTo(ul);
	};
});

function addNodes(data, originId, sys) {

	$.each(data.movies, function(key, movie1) {
		if (sys.getNode(movie1.id) === undefined) 
			sys.addNode(movie1.id, {label:movie1.title, year:movie1.year, color:'4312AE'})
		sys.addEdge(originId, movie1.id, {directed:true})
			
		var similarURL2 = 'http://api.rottentomatoes.com/api/public/v1.0/movies/' + movie1.id + '/similar.json';
		$.ajax(similarURL2, {
			type: "GET",
			data: {apikey: apikey},
			dataType: "jsonp",
			async: false,

			success: function(data2) {
				$.each(data2.movies, function(key, movie2) {
					if (sys.getNode(movie2.id) === undefined) 
						sys.addNode(movie2.id, {label:movie2.title, year:movie2.year, color:'1240AB'})
					sys.addEdge(movie1.id, movie2.id, {directed:true})
				});
			}
		})
	});
}