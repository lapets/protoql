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
  ** Notation library (individually instantiated by each visualization object).
  */

  protoql.Notation = (function(Visualization) {
  
    var Notation = {};

    /***************************************************************************
    ** Static routines and methods.
    */

    Notation.tableAsNestedLists =
      (function(t) {
        var check = true;
        for (var r = 0; r < t.length; r++)
          for (var c = 0; c < t[r].length; c++)
            check = check && (
                   (t[r][c] == null)
                || (typeof t[r][c] === "string")
                || (t[r][c].constructor === Array && t[r][c].length == 1)
              );

        if (!check)
          return null;

        var inp = {nodes:t, links:[]};
        var rows = inp.nodes.length;
        var cols = 0; for (var i = 0; i < inp.nodes.length; i++) cols = Math.max(cols, inp.nodes[i].length);

        Visualization.layout.grid.width = Math.floor(Visualization.dimensions.width/cols);
        Visualization.layout.grid.height = Math.floor(Visualization.dimensions.height/rows);

        //var x = d3.scale.ordinal().domain(d3.range(cols)).rangePoints([0, Visualization.dimensions.width], 1);
        //var y = d3.scale.ordinal().domain(d3.range(rows)).rangePoints([0, Visualization.dimensions.height], 1);
        var c = d3.scale.category20().domain(d3.range(7));
        Visualization.data.nodes = [];
        for (var row = 0; row < inp.nodes.length; row++) {
          for (var col = 0; col < inp.nodes[row].length; col++) {
            if (inp.nodes[row][col] != null) {
              var t = (typeof inp.nodes[row][col] === "string") ? inp.nodes[row][col] : inp.nodes[row][col][0];
              var es_txt = t.split("``"), t = es_txt[es_txt.length - 1], es = (es_txt.length == 2) ? es_txt[0].split("`") : [];
              var shape = (typeof inp.nodes[row][col] === "string") ? "circle" : "rect";
              var node = {
                  color: c(Math.floor(Math.random()*7)), shape: shape, text: t, 
                  rx: 5, ry: 5, offx: 0, offy: 0, x: Visualization.layout.grid.width*col, y: Visualization.layout.grid.height*row
                };
              inp.nodes[row][col] = node;
              Visualization.data.nodes.push(node);
              for (var i = 0; i < es.length; i++) {
                var e = es[i];
                var tr = row, tc = col;
                for (var j = 0; j < e.length; j++) {
                  if (e[j] == "u") tr -= 1;
                  else if (e[j] == "d") tr += 1;
                  else if (e[j] == "l") tc -= 1;
                  else if (e[j] == "r") tc += 1;
                  else if (e[j] == "s") /* Self-link; nothing. */;
                }
                inp.links.push([[row,col], [tr,tc]]);
              }
            }
          }
        }
        Visualization.data.links = [];
        for (var i = 0; i < inp.links.length; i++) {
          var s = inp.links[i][0], t = inp.links[i][1];
          Visualization.data.links.push({source:inp.nodes[s[0]][s[1]], target:inp.nodes[t[0]][t[1]], curved:false});
        }
      });

    /***************************************************************************
    ** Initialization.
    */

    return Notation;

  }); // /protoql.Notation

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
        var x1 = c.x, x2 = d.x, x3 = a.x, x4 = b.x, y1 = c.y, y2 = d.y, y3 = a.y, y4 = b.y,
            x13 = x1 - x3, x21 = x2 - x1, x43 = x4 - x3, y13 = y1 - y3, y21 = y2 - y1, y43 = y4 - y3,
            ua = (x43 * y13 - y43 * x13) / (y43 * x21 - x43 * y21);
        return {x:x1 + ua * x21, y:y1 + ua * y21};
      });

    Geometry.maxRadiusToOutside =
      (function(s, t) {
        var r1 = null, r2 = null;
        if (s.shape == 'rect') r1 = Math.max(s.height, s.width)/1.7;
        else if (s.shape == "circle") r1 = s.r;
        if (t.shape == 'rect') r2 = Math.max(t.height, t.width)/1.7;
        else if (t.shape == "circle") r2 = t.r;
        return Math.max(r1, r2);
      });

    Geometry.inShape =
      (function(p, s) {
        if (s.shape == 'rect')
          return p.x > s.x - (s.width/2) && p.x < s.x +(s.width/2) && p.y > s.y - (s.height/2) && p.y < s.y + (s.height/2);
        else if (s.shape == "circle")
          return Math.sqrt(Math.pow(s.x - p.x, 2) + Math.pow(s.y - p.y, 2)) < s.r;
      });

    Geometry.inLine =
      (function(a,c,d) {
        return a.x >= Math.min(c.x,d.x) && a.x <= Math.max(c.x,d.x) && a.y >= Math.min(c.y,d.y) && a.y <= Math.max(c.y,d.y);
      });

    Geometry.onEdgeCirc =
      (function(e, which) {
        var c = e[which];
        var dx = (which == "source" ? -1 : 1)*(e.source.x - e.target.x), 
            dy = (which == "source" ? -1 : 1)*(e.target.y - e.source.y);
        var d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        var x = c.x + ((c.r*dx)/d), y = c.y - ((c.r*dy)/d);
        return {x:isNaN(x) ? c.x : x, y:isNaN(y) ? c.y : y};
      });

    Geometry.onEdgeRect =
      (function(e, which) {
        var r = Geometry.centeredPaddedRect(e[which]);
        var a = e.source, b = e.target;
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

  protoql.Visualizations = (function(arg) {
    var vs = [];    
    if (arg.constructor === Array)
      for (var i = 0; i < arg.length; i++)
        vs.push(protoql.Visualization(arg[i]));
    else if (arg instanceof jQuery && typeof arg.each === "function")
      arg.each(function(index) {
        vs.push(protoql.Visualization($(this)));
      });
    return vs;
  });

  protoql.Visualization = (function(arg) {

    // Process constructor argument.    
    var id = null, obj = null, val = null;
    if (typeof arg === "string") {
      id = arg;
      obj = document.getElementById(id);
      val = (obj != null) ? obj.innerHTML : null;
    } else if (arg instanceof jQuery) {
      obj = arg;
      if (typeof obj.attr('id') !== "string") // Generate random identifier.
        obj.attr('id', "id"+Date.now()+""+Math.floor(Math.random()*10000));
      id = obj.attr('id');
      val = obj.html();
    }

    var Visualization = {};

    /***************************************************************************
    ** Data fields and properties.
    */

    Visualization.divId = id;
    Visualization.obj = obj;
    Visualization.val = val;
    Visualization.svg = null;
    Visualization.vis = null;
    Visualization.force = null;
    Visualization.data = {nodes: null, links: null, groups: null};
    Visualization.nodesEnter = null;
    Visualization.linksEnter = null;
    Visualization.dimensions = {width: null, height: null, padding: null};
    Visualization.layout = {grid: {width: null, height: null}};
    Visualization.geometry = protoql.Geometry(Visualization);
    Visualization.notation = protoql.Notation(Visualization);

    /***************************************************************************
    ** Routines and methods.
    */

    var lineFunction = 
      d3.svg
        .line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate("basis");

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
          .attr("d", function (e) {
            var s = Visualization.geometry.onEdge(e, 'source'), t = Visualization.geometry.onEdge(e, 'target');
            if (Visualization.geometry.inShape(t, e.source) || Visualization.geometry.inShape(s, e.target)) {
                var es = e.source, et = e.target, 
                    dx = e.source.x - e.target.x, dy = e.source.y - e.target.y,
                    d = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2)),
                    m = Math.abs(Visualization.geometry.maxRadiusToOutside(es, et)),
                    kx = (d < 2) ? m + 1 : dx * Math.min(1.3*m, 1.5*(m/(d+1))), ky = (d < 2) ? m + 1 : dy * Math.min(1.3*m, 1.5*(m/(d+1))),
                    p = {x:es.x + 1.3*ky, y:es.y - kx}, q = {x:et.x + (0.9)*ky, y:et.y - kx},
                    s = Visualization.geometry.onEdge({source:es, target:p}, 'source'), t = Visualization.geometry.onEdge({source:q, target:et}, 'target');
                var points = [s, p, q, t];
                return lineFunction(points);
            } else if (e.curved == true) {
                var dx = t.x-s.x, dy = t.y-s.y;
                var points = [s, {x:s.x+(dx/2)+(dy/5), y:s.y+(dy/2)+(dx/5)}, t];
                return lineFunction(points);
            } else {
                var points = [s, t];
                return lineFunction(points);
            }
          });
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

    var symmetricLinks =
      (function(links) {
        for (var i = 0; i < links.length; i++) {
          for (var j = 0; j < i; j++) {
            if ( links[i].source == links[j].target
              && links[j].source == links[i].target
              && links[i].source != links[i].target
              && links[j].source != links[j].target
               ) {
              links[i].curved = true;
              links[j].curved = true;
            }
          }
        }
      });

    Visualization.build =
      // Public method.
      (function() {
        var data = null;
        if (Visualization.obj instanceof jQuery) {
          data = eval(obj.html());
          obj.html("");
          Visualization.dimensions = { width: Visualization.obj.width(), height: Visualization.obj.height(), padding: 10 };
        } else {
          data= eval(obj.innerHTML);
          obj.innerHTML = "";
          Visualization.dimensions = { width: Visualization.obj.clientWidth, height: Visualization.obj.clientHeight, padding: 10 };
        }
        Visualization.notation.tableAsNestedLists(data);
        symmetricLinks(Visualization.data.links); // Mark symmetric pairs of links.

        Visualization.force = 
          d3.layout.force()
            .nodes(Visualization.data.nodes)
            //.links(Visualization.data.links) // Disabled to avoid inadvertent clustering after building.
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
          .append('rect')
            .attr({'fill': 'white', 'width':'100%', 'height':'100%' })
            .call(
              d3.behavior.zoom()
                .on("zoom", function() { Visualization.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")"); }))
                .on("dblclick.zoom", function() { Visualization.vis.attr('transform', 'translate(0,0) scale(1)'); })
          ;
        Visualization.vis =
          Visualization.svg
            .append('g')//.attr('transform', 'translate(250,250) scale(0.3)')
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
            //.attr('stroke-width', '1px')
            .attr('fill', '#000000')
          ;
        Visualization.linksEnter = 
          Visualization.vis.selectAll(".link")
            .data(Visualization.data.links).enter()
            .append("path").attr("class", "link")
              .style("stroke", "black")
              .style("fill", "none")
              .style("marker-end", function(l) { return 'url(' + window.location.href + '#end-arrow-' + Visualization.divId; })
            ;
        Visualization.nodesEnter = 
          Visualization.vis.selectAll(".node")
            .data(Visualization.data.nodes).enter()
            .append("g")
              .attr("x", function(d) { return d.cx; })
              .attr("y", function(d) { return d.cy; })
              .call(Visualization.force.drag)
            ;
        Visualization.nodesEnter.filter(function (d) {return d.shape == "rect";})
          .append("rect")
            .attr("class", "node_rect")
            .attr("rx", function(d) { return d.rx; })
            .attr("ry", function(d) { return d.ry; })
            .attr("width", function(d) { return d.width; })
            .attr("height", function(d) { return d.height; })
            .style("fill", function(d) { return d.color; })
            .style("stroke", "#DFDFDF")
            .style("opacity", 0.7)
          ;
        Visualization.nodesEnter.filter(function (d) {return d.shape == "circle";})
          .append("circle")
            .attr("class", "node_circle")
            .attr("r", function(d) { return d.r; })
            .style("stroke", "#DFDFDF")
            .style("fill", function(d) { return d.color; })
            .style("opacity", 0.7)
          ;
        Visualization.nodesEnter
          .append("text")
            .text(function (d) { d.textElt = d3.select(this); return d.text; })
            .each(textToSpans)
            .attr("text-anchor", "middle")
            .style("cursor", "all-scroll")
            //.style("stroke", "white").style("fill", "white")
            .each(function(d) {
                var bbox = this.parentNode.getBBox();
                d.width = Math.max(19, bbox.width);
                d.height = Math.max(19, bbox.height);
              })
          ;
        Visualization.vis.selectAll(".node_rect")
          .attr("x", function(d) { return -0.5 * (d.width + Visualization.dimensions.padding); })
          .attr("y", function(d) { return -0.5 * Visualization.dimensions.padding; })
          .attr("width", function(d) { return d.width + Visualization.dimensions.padding; })
          .attr("height", function(d) { return d.height + Visualization.dimensions.padding; })
          .each(function(d) { d.offy = ((-1) * (d.height/2)); })
        ;
        Visualization.vis.selectAll(".node_circle")
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