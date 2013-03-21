var apikey = "5xq9w7z2mp7a6cnchkfy52yd";

$("#sample").autocomplete({
    source: function( request, response ) {
        $.ajax("http://api.rottentomatoes.com/api/public/v1.0/movies.json", {
            data: {
                apikey: apikey,
                q: request.term
            },
            dataType: "jsonp",
            success: function(data) {
                console.log(data);
                response($.map(data.movies, function(movie) {
                    return {
                        label: movie.title,
                        value: movie.title,
                        thumb: movie.posters.thumbnail
                    }
                }));           
            }
        });
    }
}).data( "autocomplete" )._renderItem = function( ul, item ) {
    var img = $("<img>").attr("src", item.thumb);
    var link = $("<a>").text(item.label).prepend(img);
    return $("<li>")
        .data( "item.autocomplete", item )
        .append(link)
        .appendTo(ul);
};