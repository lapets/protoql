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
        d.cx = Math.floor(d.x - (d.x % gridWidth)+(gridWidth*0.5));
        d.cy = Math.floor(d.y - (d.y % gridHeight)+(gridHeight*0.5));
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

  var formatLabelText =
    (function (d) {
      var lines = d.text.split("`");
      var dy = '13';
      d.textElt.text('');
      for (var i = 0; i < lines.length; i++) {
        d.textElt.append('tspan').text(lines[i]).attr('x', 0).attr('dy', dy);
        dy = '15';
      }
    });

  ///////////////////////////////////////////////////////////////////
  // Initialization.

  var texts = ["Lorem`ipsum`dolor`sit amet", "consectetur`adipiscing`elit", "sed do`eiusmod tempor", "incididunt`ut labore", "a"];
  var width = 600, height = 600, padding = 6, maxRadius = 7;
  var n = 30, m = 4;
  var gridHeight = Math.floor(height/m), gridWidth = Math.floor(width/m);
  var c = d3.scale.category20().domain(d3.range(m));
  var x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, width], 1);
  var y = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, height], 1);

  var nodes = d3.range(n).map(function () {
    var shape = (Math.random() > 0.5) ? "rect" : "circle";
    var t = texts[Math.floor(Math.random() * texts.length)];
    var i = Math.floor(Math.random() * m);
    return {
        color: c(i), shape: shape, text: t,
        rx: 5, ry: 5, offx: 0, offy: 0,
        cx: x(i), cy: y(i)
      };
  });

  var force = 
    d3.layout.force()
      .nodes(nodes)
      .size([width, height])
      .gravity(0).charge(0)
      .on("tick", tick)
      .start()
    ;

  var svg = 
    d3.select("#diagram")
      .append("svg")
        .attr("width", width).attr("height", height)
    ;

  var nodesEnter = 
    svg.selectAll(".node")
       .data(nodes)
       .enter()
       .append("g")
         .attr("x", function(d) { return d.cx; })
         .attr("y", function(d) { return d.cy; })
       .call(force.drag)
    ;
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
      .text(function (d) { d.textElt = d3.select(this); return d.text; })
      .each(formatLabelText)
      .attr("text-anchor", "middle")
      .style("cursor", "all-scroll")
      //.style("stroke", "white")
      //.style("fill", "white")
      .each(function(d) {
          var bbox = this.parentNode.getBBox();
          d.width = bbox.width;
          d.height = bbox.height;
        })
    ;
  svg.selectAll("rect")
    .attr("x", function(d) { return -0.5 * (d.width + 10); })
    .attr("y", function(d) { return -0.5 * 10; })
    .attr("width", function(d) { return d.width + 10; })
    .attr("height", function(d) { return d.height + 10; })
    .each(function(d) { d.offy = ((-1) * (d.height/2)); })
    ;
  svg.selectAll("circle")
    .attr("cy", function(d) { return 0.5*this.parentNode.getBBox().height; })
    .attr("r", function(d) { var bbox = this.parentNode.getBBox(); d.r = 10+((Math.max(bbox.width, bbox.height))/2); return d.r; })
    .each(function(d) { d.offy = ((-1) * (d.height/2)); })
    ;

})(typeof exports !== 'undefined' ? exports : (this.protoql = {}));
/* eof */