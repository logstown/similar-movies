(function(){
  
  Renderer = function(canvas){
    var dom = $(canvas)
    var canvas = dom.get(0)
    var ctx = canvas.getContext("2d");
    ctx.canvas.width  = window.innerWidth - (.05 * window.innerWidth);
    ctx.canvas.height = window.innerHeight - (.05 * window.innerHeight);;
    var gfx = arbor.Graphics(canvas)
    var particleSystem = null

    var that = {
      init:function(system){
        particleSystem = system
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(50,100,50,100)

        that.initMouseHandling()
      },

      redraw:function(){
        if (!particleSystem) return

        gfx.clear() // convenience ƒ: clears the whole canvas rect

        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes = {}
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // determine the box size and round off the coords if we'll be 
          // drawing a text label (awful alignment jitter otherwise...)
          var label = node.data.label||""
          var year = '(' + node.data.year + ')';

          var textWidth = ctx.measureText(""+label).width
          var yearWidth = ctx.measureText(""+year).width

          var w = Math.max(textWidth, yearWidth) + 10;
          node.data.radius = w/2;

          if (!(""+label).match(/^[ \t]*$/)){
            pt.x = Math.floor(pt.x)
            pt.y = Math.floor(pt.y)
          }else{
            label = null
          }

          // draw a rectangle centered at pt
          if (node.data.color) ctx.fillStyle = node.data.color
          else ctx.fillStyle = "rgba(0,0,0,.2)"
          if (node.data.color=='none') ctx.fillStyle = "white"

          gfx.rect(pt.x-w/2, pt.y-10, w,35, 4, {fill:ctx.fillStyle})
          nodeBoxes[node.name] = [pt.x-w/2, pt.y-11, w, 37]

          // draw the text
          if (label){
            ctx.font = "12px Arial"
            ctx.textAlign = "center"
            ctx.fillStyle = "white"
            if (node.data.color=='none') ctx.fillStyle = '#333333'
            ctx.fillText(label||"", pt.x, pt.y+4)
            ctx.fillText(label||"", pt.x, pt.y+4)
            ctx.fillText(year||"", pt.x, pt.y+19)
            ctx.fillText(year||"", pt.x, pt.y+19)
          }
        })    			


        // draw the edges
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          var weight = 2
          var color = edge.data.color

          switch(edge.source.data.color) {
            case '00A383':
              weight = 4;
              color = 'purple';
              break;
            default:
              weight = 2;

          }

          if (!color || (""+color).match(/^[ \t]*$/)) color = null

          // find the start point
          var tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
          var head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

          ctx.save() 
            ctx.beginPath()
            ctx.lineWidth = (!isNaN(weight)) ? parseFloat(weight) : 1
            ctx.strokeStyle = (color) ? color : "#cccccc"
            ctx.fillStyle = null

            ctx.moveTo(tail.x, tail.y)
            ctx.lineTo(head.x, head.y)
            ctx.stroke()
          ctx.restore()

          // draw an arrowhead if this is a -> style edge
          if (edge.data.directed){
            ctx.save()
              // move to the head position of the edge we just drew
              var wt = !isNaN(weight) ? parseFloat(weight) : 1
              var arrowLength = 9 + wt
              var arrowWidth = 3 + wt
              ctx.fillStyle = (color) ? color : "#22302B"
              ctx.translate(head.x, head.y);
              ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

              // delete some of the edge that's already there (so the point isn't hidden)
              ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)

              // draw the chevron
              ctx.beginPath();
              ctx.moveTo(-arrowLength, arrowWidth);
              ctx.lineTo(0, 0);
              ctx.lineTo(-arrowLength, -arrowWidth);
              ctx.lineTo(-arrowLength * 0.8, -0);
              ctx.closePath();
              ctx.fill();
            ctx.restore()
          }
        })



      },
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var move = false;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          moved:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            nearest = particleSystem.nearest(_mouseP);

            if(!nearest){
                return false;
            }

            selected = (nearest.distance < nearest.node.data.radius) ? nearest : null
            if (selected) dom.addClass('hovered');
            else dom.removeClass('hovered');

            return false;
          },
          down:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = particleSystem.nearest(_mouseP);
            move = false;
            
            if (dragged && dragged.node !== null){
                dragged.node.fixed = true
            }

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            move = true;

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) {
                if(move===false) {
				
        					var clickedNode = dragged.node;
        					var newId = dragged.node.name;
        					
        					var similarURL = 'http://api.rottentomatoes.com/api/public/v1.0/movies/' + newId + '/similar.json';
        					$.ajax(similarURL, {
        						data: {	apikey: apikey },
        						dataType: "jsonp",
        						success: function(data) {
        							particleSystem.prune(function(node, pt){
        								if(node !== clickedNode){
        									return true
        								}
        								else
        									return false
        							})
        							
        							particleSystem.tweenNode(clickedNode, 2, {color:'00A383'})

                      addNodes(data, newId, particleSystem)
        							
        						}
        					});					
                }
                dragged.node.fixed = false
            }
            dragged.node.tempMass = 1000
            dragged = null
            selected = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        $(canvas).mousedown(handler.down);
        $(canvas).mousemove(handler.moved);
      }

    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    var intersect_line_line = function(p1, p2, p3, p4)
    {
      var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
      if (denom === 0) return false // lines are parallel
      var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
      var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

      if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
      return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    var intersect_line_box = function(p1, p2, boxTuple)
    {
      var p3 = {x:boxTuple[0], y:boxTuple[1]},
          w = boxTuple[2],
          h = boxTuple[3]

      var tl = {x: p3.x, y: p3.y};
      var tr = {x: p3.x + w, y: p3.y};
      var bl = {x: p3.x, y: p3.y + h};
      var br = {x: p3.x + w, y: p3.y + h};

      return intersect_line_line(p1, p2, tl, tr) ||
            intersect_line_line(p1, p2, tr, br) ||
            intersect_line_line(p1, p2, br, bl) ||
            intersect_line_line(p1, p2, bl, tl) ||
            false
    }

    return that
  }    
  
})()