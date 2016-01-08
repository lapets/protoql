/* ********************************************************
** 
** protoql.js
**
** An embedded language for rapid assembly, querying, and
** interactive visual rendering of common, abstract
**  mathematical structures.
**
**   Web:     protoql.org
**   Version: 0.0.1.0
**
*/

(function (protoql) {

  "use strict";

  ///////////////////////////////////////////////////////////////////
  // Methods.

  // Resolve collisions between nodes.
  var collision =
    (function(alpha) {
      var quadtree = d3.geom.quadtree(nodes);
      return function(d) {
        var r = d.r + maxRadius + padding,
            nx1 = d.x - r, nx2 = d.x + r,
            ny1 = d.y - r, ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.r + quad.point.r + (d.color !== quad.point.color) * padding;
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    });

  var alignment = 
    (function (alpha) {
      return function(d) {
        d.cx = d.x - (d.x % gridWidth)+(gridWidth*0.5);
        d.cy = d.y - (d.y % gridHeight)+(gridHeight*0.5);
        d.y += (d.cy - d.y) * alpha;
        d.x += (d.cx - d.x) * alpha;
      };
    });

  var tick = 
    (function (e) {
      nodesEnter
        .each(alignment(.2 * e.alpha))
        //.each(collision(.5))
        .attr("x", function(d) { return d.x - (d.width/2); })
        .attr("y", function(d) { return d.y - (d.height/2); });
    });

  ///////////////////////////////////////////////////////////////////
  // Initialization.

  var width = 600, height = 600, padding = 6, maxRadius = 7;
  var n = 200, m = 7;
  var gridHeight = Math.floor(height/m), gridWidth = Math.floor(width/m);
  var c = d3.scale.category10().domain(d3.range(m));
  var x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, width], 1);
  var y = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, height], 1);

  var nodes = d3.range(n).map(function() {
    var i = Math.floor(Math.random() * m), 
        v = (i + 1) / m * -Math.log(Math.random()),
        r = 30+(Math.sqrt(v)*maxRadius),
        shape = (Math.random() > 0.5) ? "rect" : "circle"; 
    return {shape: shape, r: r, width: r, height: r, color: c(i), cx: x(i), cy: y(i), rx: r/10, ry: r/10 };
  });

  var force = 
    d3.layout.force()
      .nodes(nodes)
      .size([width, height])
      .gravity(0)
      .charge(0)
      .on("tick", tick)
      .start();

  var svg = 
    d3.select("#diagram")
      .append("svg")
        .attr("width", width)
        .attr("height", height)
      ;

  var nodesEnter = 
    svg.selectAll("node")
       .data(nodes)
       .enter()
       .append("rect")
         .attr("r", function(d) { return d.r; })
         .attr("rx", function(d) { return d.rx; })
         .attr("ry", function(d) { return d.ry; })
         .attr("width", function(d) { return d.width; })
         .attr("height", function(d) { return d.height; })
         .style("fill", function(d) { return d.color; })
         .style("stroke", function(d) { return "white"; })
         .call(force.drag);

})(typeof exports !== 'undefined' ? exports : (this.protoql = {}));
/* eof */