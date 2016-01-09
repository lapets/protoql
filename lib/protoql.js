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
        .each(alignment(0.8 * e.alpha))
        //.each(collision(.5))
        .attr("transform", function (d) { return "translate("+(d.x + d.offx)+","+(d.y + d.offy)+")"; });
    });

  ///////////////////////////////////////////////////////////////////
  // Initialization.

  var texts = ["Lorem ipsum`dolor sit amet", "consectetur`adipiscing elit", "sed do`eiusmod tempor", "incididunt`ut labore", "a"];
  var width = 600, height = 600, padding = 6, maxRadius = 7;
  var n = 30, m = 4;
  var gridHeight = Math.floor(height/m), gridWidth = Math.floor(width/m);
  var c = d3.scale.category10().domain(d3.range(m));
  var x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, width], 1);
  var y = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, height], 1);

  var nodes = d3.range(n).map(function () {
    var shape = (Math.random() > 0.5) ? "rect" : "circle";
    var t = texts[Math.floor(Math.random() * texts.length)];
    var i = Math.floor(Math.random() * m), 
        u = (i + 1) / m * -Math.log(Math.random()),
        v = (i + 1) / m * -Math.log(Math.random()),
        w = 30+(Math.sqrt(u)*maxRadius),
        h = 30+(Math.sqrt(v)*maxRadius),
        r = Math.max(w, h)/2;
    var offx = (shape == "rect") ? ((-1) * (w/2)) : 0;
    var offy = (shape == "rect") ? ((-1) * (h/2)) : 0;
    return {
        color: c(i), shape: shape, text: t, textx: (shape == "circle") ? 0 : 0, texty: (shape == "circle") ? 0 : (h/2),
        r: r, width: w, height: h, rx: w/10, ry: h/10, offx: offx, offy: offy,
        cx: x(i), cy: y(i)
      };
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
    svg.selectAll(".node")
       .data(nodes)
       .enter()
       .append("g")
         .attr("x", function(d) { return d.cx; })
         .attr("y", function(d) { return d.cy; })
       .call(force.drag);

  nodesEnter.filter(function (d) {return d.shape == "rect";})
    .append("rect")
      .attr("rx", function(d) { return d.rx; })
      .attr("ry", function(d) { return d.ry; })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height; })
      .style("fill", function(d) { return d.color; })
      .style("stroke", function(d) { return "white"; })
    ;

  nodesEnter.filter(function (d) {return d.shape == "circle";})
    .append("circle")
      .attr("r", function(d) { return d.r; })
      .style("fill", function(d) { return d.color; })
      .style("stroke", function(d) { return "white"; })
    ;

  nodesEnter
    .append("text")
      .style("fill", "white")
      //.style("stroke", "white")
      .text(function(d) { return d.text; })
      .attr("text-anchor", "middle")
      .attr("x", function(d) { return d.textx; })
      .attr("y", function(d) { return d.texty; })
      .style("cursor", "all-scroll");

  svg.selectAll("rect")
    .attr("x", function(d) { return -0.5 * (this.parentNode.getBBox().width); })
    .attr("width", function(d) { d.width = this.parentNode.getBBox().width; return d.width; })
  svg.selectAll("circle")
    .attr("r", function(d) { d.r = (this.parentNode.getBBox().width)/2; return d.r; })
      
})(typeof exports !== 'undefined' ? exports : (this.protoql = {}));
/* eof */