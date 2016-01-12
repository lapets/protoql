/* ****************************************************************************
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

  /*****************************************************************************
  ** Geometry library (individually instantiated by each visualization object).
  */

  protoql.Geometry = (function(Visualization) {
  
    var Geometry = {};

    /***************************************************************************
    ** Static routines and methods.
    */
    Geometry.intersects =
      (function(c, d, a, b) {
        var x1 = c.x, x2 = d.x, x3 = a.x, x4 = b.x,
            y1 = c.y, y2 = d.y, y3 = a.y, y4 = b.y,
            x13 = x1 - x3, x21 = x2 - x1, x43 = x4 - x3,
            y13 = y1 - y3, y21 = y2 - y1, y43 = y4 - y3,
            ua = (x43 * y13 - y43 * x13) / (y43 * x21 - x43 * y21);
        return {x:x1 + ua * x21, y:y1 + ua * y21};
      });

    Geometry.inRect =
      (function(rect, b) {
        return b.x > rect.x && b.x < rect.x + rect.width && b.y > rect.y && b.y < rect.y + rect.height;
      });

    Geometry.inLine =
      (function(a,c,d) {
        return a.x >= Math.min(c.x,d.x) && a.x <= Math.max(c.x,d.x) && a.y >= Math.min(c.y,d.y) && a.y <= Math.max(c.y,d.y);
      });

    Geometry.onEdgeCirc =
      (function(e, which) {
        var dx = (which == "source" ? -1 : 1)*(e.source.x - e.target.x), 
            dy = (which == "source" ? -1 : 1)*(e.target.y - e.source.y);
        var d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        var c = e[which];
        return {x:c.x + ((c.r*dx)/d), y:c.y - ((c.r*dy)/d)};
      });

    Geometry.onEdgeRect =
      (function(e, which) {
        var r = Geometry.centeredPaddedRect(e[which]);
        var a = e.source, b = e.target;
        //var comparePoint = (Geometry.inRect(r, b)) ? b : a;
        var lines = [
            [r, {x:r.x+r.width,y:r.y}], [{x:r.x,y:r.y+r.height}, {x:r.x+r.width,y:r.y+r.height}],
            [r, {x:r.x,y:r.y+r.height}], [{x:r.x+r.width,y:r.y}, {x:r.x+r.width,y:r.y+r.height}]
          ];
        var inters = lines.map(function(x) { return Geometry.intersects(x[0],x[1],a,b); });
        if (Geometry.inLine(inters[0],a,b) && inters[0].x >= r.x && inters[0].x <= r.x + r.width)
          return inters[0];
        else if (Geometry.inLine(inters[1],a,b) && inters[1].x >= r.x && inters[1].x <= r.x + r.width)
          return inters[1];
        else if (Geometry.inLine(inters[2],a,b) && inters[2].y >= r.y && inters[2].y <= r.y + r.height)
          return inters[2];
        else if (Geometry.inLine(inters[3],a,b) && inters[3].y >= r.y && inters[3].y <= r.y + r.height)
          return inters[3];
        else
          return e[which];
      });

    Geometry.onEdge =
      (function(e, which) {
        if (e[which].shape == "rect")
          return Geometry.onEdgeRect(e, which);
        if (e[which].shape == "circle")
          return Geometry.onEdgeCirc(e, which);
      });

    Geometry.centeredPaddedRect =
      (function(node) {
        var rect = {};
        rect.x = node.x - (node.width + Visualization.dimensions.padding) / 2;
        rect.y = node.y - (node.height + Visualization.dimensions.padding) / 2;
        rect.width = node.width + Visualization.dimensions.padding;
        rect.height = node.height + Visualization.dimensions.padding;
        return rect;
      });

    /***************************************************************************
    ** Initialization.
    */

    return Geometry;

  }); // /protoql.Geometry

  /*****************************************************************************
  ** Interactive visualization objects.
  */
  protoql.Visualization = (function(id) {
  
    var Visualization = {};

    /***************************************************************************
    ** Data fields and properties.
    */

    Visualization.divId = id;
    Visualization.svg = null;
    Visualization.force = null;
    Visualization.data = {nodes: null, links: null, groups: null};
    Visualization.nodesEnter = null;
    Visualization.linksEnter = null;
    Visualization.dimensions = {width: null, height: null, padding: null};
    Visualization.layout = {grid: {width: null, height: null}};
    Visualization.geometry = protoql.Geometry(Visualization);

    /***************************************************************************
    ** Routines and methods.
    */

    // Resolve collisions between nodes.
    var collision =
      (function(alpha) {
        var padding = 6;
        var maxRadius = 7;
        var quadtree = d3.geom.quadtree(nodes);
        return function(d) {
          var r = d.r + maxRadius + padding,
              nx1 = d.x - r, nx2 = d.x + r,
              ny1 = d.y - r, ny2 = d.y + r;
          quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
              var x = d.x - quad.point.x, y = d.y - quad.point.y,
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
      (function(alpha) {
        return function(d) {
          d.cx = Math.floor(d.x - (d.x % Visualization.layout.grid.width)+(Visualization.layout.grid.width*0.5));
          d.cy = Math.floor(d.y - (d.y % Visualization.layout.grid.height)+(Visualization.layout.grid.height*0.5));
          d.y += (d.cy - d.y) * alpha;
          d.x += (d.cx - d.x) * alpha;
        };
      });

    var tick =
      (function(e) {        
        Visualization.nodesEnter
          .each(alignment(0.8 * e.alpha))
          //.each(collision(.5))
          .attr("transform", function (d) { return "translate("+(d.x + d.offx)+","+(d.y + d.offy)+")"; });
        Visualization.linksEnter
          .attr("x1", function(d) { return Visualization.geometry.onEdge(d, 'source').x; })
          .attr("y1", function(d) { return Visualization.geometry.onEdge(d, 'source').y; })
          .attr("x2", function(d) { return Visualization.geometry.onEdge(d, 'target').x; })
          .attr("y2", function(d) { return Visualization.geometry.onEdge(d, 'target').y; });
      });

    var textToSpans =
      (function(d) {
        var lines = d.text.split("`");
        var dy = '13';
        d.textElt.text('');
        for (var i = 0; i < lines.length; i++) {
          d.textElt.append('tspan').text(lines[i]).attr('x', 0).attr('dy', dy);
          dy = '15';
        }
      });

    Visualization.build =
      // Public method.
      (function() {
        var texts = ["Lorem`ipsum`dolor`sit amet", "consectetur`adipiscing`elit", "sed do`eiusmod tempor", "incididunt`ut labore", "a"];
        Visualization.dimensions = {width: 600, height: 600, padding:10};
        var n = 30, m = 4;
        Visualization.layout.grid.width = Math.floor(Visualization.dimensions.width/m);
        Visualization.layout.grid.height = Math.floor(Visualization.dimensions.height/m);
        var c = d3.scale.category20().domain(d3.range(m));
        var x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, Visualization.dimensions.width], 1);
        var y = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, Visualization.dimensions.height], 1);

        Visualization.data.nodes = d3.range(n).map(function () {
          var shape = (Math.random() > 0.5) ? "rect" : "circle";
          var t = texts[Math.floor(Math.random() * texts.length)];
          var i = Math.floor(Math.random() * m);
          return {
              color: c(i), shape: shape, text: t,
              rx: 5, ry: 5, offx: 0, offy: 0,
              cx: x(i), cy: y(i)
            };
        });
        Visualization.data.links = [];
        for (var i = 0; i < Visualization.data.nodes.length-1; i++)
          Visualization.data.links.push({source:Visualization.data.nodes[i], target:Visualization.data.nodes[i+1]});

        Visualization.force = 
          d3.layout.force()
            .nodes(Visualization.data.nodes)
            //.links(Visualization.data.links) // Avoid inadvertent clustering after building.
            .size([Visualization.dimensions.width, Visualization.dimensions.height])
            .gravity(0).charge(0).linkStrength(0)
            .on("tick", tick)
            .start()
          ;
        Visualization.svg = 
          d3.select('#' + id)
            .append("svg")
              .attr("width", Visualization.dimensions.width).attr("height", Visualization.dimensions.height)
            ;
        Visualization.svg
          .append('svg:defs')
          .append('svg:marker')
            .attr('id', 'end-arrow-' + Visualization.divId) // Use separate namespaces for each diagram's arrow ends.
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('markerWidth', 8).attr('markerHeight', 8)
            .attr('orient', 'auto')
          .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5L2,0')
            .attr('stroke-width', '1px')
            .attr('fill', '#000')
          ;
        Visualization.linksEnter = 
          Visualization.svg.selectAll(".link")
            .data(Visualization.data.links)
            .enter()
            .append("line")
              .attr("class", "link")
              .style("stroke", "black")
              .style("marker-end", function(l) { return 'url(' + window.location.href + '#end-arrow-' + Visualization.divId; });
            ;
        Visualization.nodesEnter = 
          Visualization.svg.selectAll(".node")
            .data(Visualization.data.nodes)
            .enter()
            .append("g")
              .attr("x", function(d) { return d.cx; })
              .attr("y", function(d) { return d.cy; })
              .call(Visualization.force.drag)
            ;
        Visualization.nodesEnter.filter(function (d) {return d.shape == "rect";})
          .append("rect")
            .attr("rx", function(d) { return d.rx; })
            .attr("ry", function(d) { return d.ry; })
            .attr("width", function(d) { return d.width; })
            .attr("height", function(d) { return d.height; })
            .style("fill", function(d) { return d.color; })
            .style("stroke", function(d) { return "white"; })
            .style("opacity", 0.7)
          ;
        Visualization.nodesEnter.filter(function (d) {return d.shape == "circle";})
          .append("circle")
            .attr("r", function(d) { return d.r; })
            .style("fill", function(d) { return d.color; })
            .style("stroke", function(d) { return "white"; })
            .style("opacity", 0.7)
          ;
        Visualization.nodesEnter
          .append("text")
            .text(function (d) { d.textElt = d3.select(this); return d.text; })
            .each(textToSpans)
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
        Visualization.svg.selectAll("rect")
          .attr("x", function(d) { return -0.5 * (d.width + Visualization.dimensions.padding); })
          .attr("y", function(d) { return -0.5 * Visualization.dimensions.padding; })
          .attr("width", function(d) { return d.width + Visualization.dimensions.padding; })
          .attr("height", function(d) { return d.height + Visualization.dimensions.padding; })
          .each(function(d) { d.offy = ((-1) * (d.height/2)); })
        ;
        Visualization.svg.selectAll("circle")
          .attr("cy", function(d) { return 0.5*this.parentNode.getBBox().height; })
          .attr("r", function(d) { var bbox = this.parentNode.getBBox(); d.r = Visualization.dimensions.padding+((Math.max(bbox.width, bbox.height))/2); return d.r; })
          .each(function(d) { d.offy = ((-1) * (d.height/2)); })
          ;
      });

    /***************************************************************************
    ** Initialization.
    */

    Visualization.build();

    return Visualization;

  }); // /protoql.Visualization

})(typeof exports !== 'undefined' ? exports : (this.protoql = {}));
/* eof */