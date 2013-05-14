/*
Carve.js
Dick Kreisberg 
March 2013
MIT License

some code taken from 
https://github.com/syntagmatic/parallel-coordinates
Copyright (c) 2012, Kai Chang
*/

var carve = (function() {

return function(config) {

var config = config || {};

// useful defaults
var  pointColors = [
                    "#71C560",
                    "#9768C4",
                    "#98B8B8",
                    "#4F473D",
                    "#C1B14C",
                    "#B55381"
            ],
    partitionColors = [
                    "#98B8B8",  
                    "#4F473D",
                    "#C1B14C",
                    "#B55381"
                    ];

//external accessible values
var __ = {
    width : 500,
    height : 400,
    splitColor : "#C1573B",
    margin : {
              "top" : 15, 
              "bottom" : 15, 
              "left" : 30,
              "right" : 10
            },
    radius : 4,
    dataType : { 
                 "x" : 'n',
                 "y" : 'n',
                 "mix" : 'nn'
               },
    data : {x:[],y:[] },
    splits : {},
    id : 'id',
    axes : {
        labels : {
             "x" : "X Axis",
              "y" : "Y Axis"
        },
        attr : {
            "x" : "x",
            "y" : "y"
        }
    },
    highlight : '',
    colorFn : function(d) { return pointColors[0] },
    colorBy : {label:"", list:[], colors: pointColors },
    clear : true,
    partition : {}
 };

  _.extend(__, config);

  var events = d3.dispatch.apply(this,["render", "resize", "highlight", "brush", "partitioncomplete"].concat(d3.keys(__))),
      outerWidth = function() { return __.width - __.margin.right - __.margin.left },
      outerHeight = function() { return __.height - __.margin.top - __.margin.bottom },
      plotWidth = function() { return outerWidth() - padding.right - padding.left},
      plotHeight = function() { return outerHeight() - padding.top - padding.bottom },
      displayWidth = function() { return plotWidth() - 20;},
      displayHeight = function() { return plotHeight() - 20;},
      flags = {
        brushable: false,
        reorderable: false,
        axes: false,
        interactive: false,
        shadows: false,
        debug: false
      },
      scales = { x: d3.scale.ordinal(),
                y : {}
              },
     kde = { x: null,
                y : null
              },
      min_uniq_points = 0,
      domainScalingFactor = 1.04,
      caseSplitsOpacityscale,
      selected = {x: null, y: null},
      padding = { top: 24, bottom: 4, left: 30, right: 24 },
      split_data = {x: {}, y: {}},
      shapes = ['square','circle','cross','diamond','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      splitStrokeColors = ['red','green','black'],
      colorCategories = [],
      strokeFunction = function(index) { return splitStrokeColors[index];},
      data_array = [],
      axisFn = {
          "x" :  d3.svg.axis().orient("bottom"),
          "y" : d3.svg.axis().orient("right")
        },
      update_duration = 300,
      bottom_surface, split_surface, data_surface, partition_surface; // groups for axes, brushes

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    .on("radius", function(new_value) { symbolSize = Math.pow(__.radius,2);})
    .on("data", function(new_value) { clearAllSplitSelections(); clearAllSplitPointers(); parseData(); console.log('splitscope: data loaded');})
    .on("colorBy", setClassScales )
    .on("splits", parseSplits )
    .on("partition", setPartitions )
    .on("axes", updateAxisLabels );
   
  var cv = function(selection) {
    selection = cv.selection = d3.select(selection);

    __.width = 800; //selection[0][0].clientWidth;
    __.height = 600; //selection[0][0].clientHeight;

    setAxes();

    //draw chart
    cv.svg = selection
                   .append('svg')
                    .attr('class','cv')
                   .append('svg')
                    .attr('viewBox','0 0 ' + __.width + ' ' + __.height)
                    .attr('preserveAspectRatio','xMinYMin meet');
                    // .attr('height',__.height)
                    // .attr('width',__.width );

    cv.svg.append("defs").append("svg:clipPath")
                    .attr("id", "plot_clip")
                    .append("svg:rect")
                    .attr("id", "clip-rect")
                    .attr("x", "0")
                    .attr("y", "0")
                    .attr("width", plotWidth())
                    .attr("height", plotHeight());

    var plot_offset = cv.svg.append('g')
                        .attr('transform','translate('+__.margin.left+','+ __.margin.top+')');
                       
    bottom_surface = plot_offset.append('g')
                        .attr('transform','translate(' + padding.left + ',' + padding.top + ')');

    partition_surface = bottom_surface.append('g');
                         
    var top_surface = plot_offset.append('g');

    split_surface = top_surface.append('g')
                    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');                    

    data_surface = top_surface.append('g')
                    .attr('transform','translate(' + padding.left + ',' + padding.top + ')')
                     .attr('clip-path','url(#plot_clip)');
    data_surface.append('g').attr('class','kde_surface');
    data_surface.append('g').attr('class','data');
    data_surface.append('g').attr('class','data_labels');

    //initialize colorBy class variables
    setClassScales();

    return cv;
  };

  cv.toString = function() { return "cv: (" + d3.keys(__.data[0]).length + " total) , " + __.data.length + " rows"; };

  // expose the state of the chart
  cv.state = __;
  cv.flags = flags;

  // create getter/setters
  getset(cv, __, events);

  // expose events
  d3.rebind(cv, events, "on");

  // getter/setter with event firing
  function getset(obj,state,events)  {
    d3.keys(state).forEach(function(key) {   
      obj[key] = function(x) {
        if (!arguments.length) return state[key];
        var old = state[key];
        state[key] = x;
        side_effects[key].call(cv,{"value": x, "previous": old});
        events[key].call(cv,{"value": x, "previous": old});
        return obj;
      };
    });
  };

cv.render = function() {

  if (axisFn["y"].scale() !== undefined) drawAxes();

  if (data_array.length)  drawData();

  if (_.isObject(split_data)) drawSplits();

  drawSplitLabel();

  __.clear = false;

    return this;
};

function reRender() {
  updateAxes();
  drawData();
  drawSplits();
  drawPartitionSpans();
}

function drawSplitLabel() {

  if (bottom_surface.select('.split_labels').node() !== null) { return; }
    var split_labels = bottom_surface.append('g')
                          .attr('class','split_labels');
    split_labels.append('text')
                .attr('class','x')
                .attr('transform','translate(0,'+plotHeight()+')')
                .text('');

    split_labels.append('text')
                .attr('class','y')
                .attr('transform','translate(0,0)')
                .text('');                
}

function updateSplitTextLabel(position,axis) {
  var format = d3.format('.3f');
    if (position === null) {
      bottom_surface.select('.split_labels .' + axis)
                      .text('');
      return;
    }
    var transform = {
                  "x" : axis === 'x' ? position : plotWidth()+2,
                  "y" : axis === 'y' ? position : plotHeight()+2
    };
    bottom_surface.select('.split_labels .' + axis)
                    .text(format(scales[axis].invert(position)))
                    .attr('transform','translate(' + transform.x + ',' + transform.y + ')');
}

function drawAxes() {
  var textpaths = {
                  "x" : 'M 0 ' + (plotHeight()+28) + ' L '+ plotWidth() + ' ' + (plotHeight()+28),
                  "y" : 'M ' + (plotWidth() + 45) + ' 0 L ' +(plotWidth() + 45) + ' ' + plotHeight()
                },
      tick_transform = {
                  "x" : 'translate(0,' + (plotHeight()) +')',
                  "y" : 'translate('+ (plotWidth()) +',0)'
                };

  if (bottom_surface.select('.axis').node() !== null) return updateAxes();
 ['x','y'].forEach( function(axis) {
     var axisEl = bottom_surface.append('g')
      .attr('class', axis + ' axis');

     adjustTicks(axis);

     cv.svg.select('defs').append('path')
     .attr('id', axis+'_axis_alignment')
     .attr('d', textpaths[axis] );

     axisEl.append('g')
      .attr('class','ticks')
      .attr('transform',tick_transform[axis])
      .call(axisFn[axis]);

     axisEl.append('text')
      .style('text-anchor','middle')
     .append('textPath')
      .attr('class','axis_label')
      .attr('xlink:href','#' + axis + '_axis_alignment')
      .attr('startOffset','50%')
      .text(__.axes.labels[axis]);

  });

 }

function adjustTicks(axis) {
  var tickSizes = {
          "y" : [ 0, -1*plotWidth()+10 ],
          "x" : [ 0, 0]//-1*plotHeight()]
              },
      axisEl = bottom_surface.select('.' + axis + '.axis');
     
      axisEl.select('.categorical_ticks').remove();

  var decimalFormat = d3.format(".4r"),
       format = (isNumerical(scales[axis].domain()) && !isInt(scales[axis].domain()) ) ? decimalFormat : null;
  
  if ( __.dataType[axis] === 'c' ) {

    var ordinal = axisEl.append('g').attr('class','categorical_ticks'),
        ticks = scales[axis].range();

    axisFn[axis].tickSize(tickSizes[axis][0]);

    var extent  = scales[axis].range(),
      band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length),
      halfBand = band/2;

    var lines = ordinal
                .selectAll('line')
                .data(ticks);
    
    if ( axis == 'y' ) {
    lines.enter()
      .append('line')
      .style('stroke', '#888')
      .style('stroke-width', '2px')
      .attr('x1', 10)
      .attr('x2', plotWidth())
      .attr('y1', function(point) { return point + halfBand + 2; } )
      .attr('y2', function(point) { return point + halfBand + 2; } );
    }
    else {
    lines.enter()
      .append('line')
      .style('stroke', '#888')
      .style('stroke-width', '2px')
      .attr('x1',function(point) { return point - halfBand; })
      .attr('x2', function(point) { return point - halfBand; })
      .attr('y1', 10 )
      .attr('y2',plotHeight() -10 );
    }
    
  } else axisFn[axis].tickSize(tickSizes[axis][1]);

 axisFn[axis].tickFormat(format);

}

function updateAxes() {
  ['y','x'].forEach( function(axis) {
    var axisEl = bottom_surface.select('.' + axis + '.axis');
    axisEl.select('.ticks').transition().duration(update_duration).call(axisFn[axis].scale(scales[axis]));
    adjustTicks(axis);
  });
}

function updateAxisLabels() {
     var y_axis = bottom_surface.select('.y.axis'), 
      x_axis = bottom_surface.select('.x.axis');

      y_axis.select('.axis_label').text(__.axes.labels.y);
      x_axis.select('.axis_label').text(__.axes.labels.x);
  }

function drawScatterplot(data_points) {

data_points
    .attr('d',symbolFunction(0).size(symbolSize)())
    .style('fill-opacity', function(point) {
        return _.isUndefined(point.splits_on_x) ? 
          0.8 : caseSplitsOpacityscale(point.splits_on_x);
    })
    .style('stroke-width',"0px")     
    .call(colorDataPoint)
  .transition()
    .duration(update_duration)
    .attr('transform', function(point) { 
        return 'translate(' + scales.x(point[__.axes.attr.x]) + ',' +
        scales.y(point[ __.axes.attr.y ]) + ')';});


 var data_text = data_surface.select('.data_labels')
                    .selectAll('.data_totals')
                    .data([], String );

    data_text.exit().remove();

  }

function drawMultipleBarchart(data_points) {

      var xInversed = {}; 
      scales.x.domain().forEach( function(label, index) {
        xInversed[label] = index;
      });
      var yInversed = {}; 
      scales.y.domain().forEach( function(label, index) {
        yInversed[label] = index;
      });

      var totalWidth = colorCategories.length * 15;

      var d = {}; 
            scales.x.domain().forEach( function(label) { 
              d[label] = {};
              scales.y.domain().forEach( function(ylabel) {
                d[label][ylabel] = {};
                colorCategories.forEach( function(cat) {
                  d[label][ylabel][cat] = 0;
                });
              });
            });

      var stacks = scales.x.domain().length * scales.y.domain().length * colorCategories.length;
      var e = Array.apply(null, new Array((scales.y.domain().length))).map(function() { return 0;});
      var f = new Array(stacks);

      data_array.forEach( function (point, index) {
             e[ index ] = d[ point[ __.axes.attr.x ] ] [  point[ __.axes.attr.y ] ] [ String(point[__.colorBy.label]) ]++;
      });

      var i = stacks -1;

      d3.keys(d).forEach( function (k1) { 
          d3.keys(d[k1]).forEach( function (k2) { 
              d3.keys(d[k1][k2]).forEach( function (k3) {
                      f[i--] = [k1, k2, k3, d[k1][k2][k3]];
              });
            });
        });

      var height_axis = 'y',
        extent = scales[height_axis].range(),
          band = ((scales[height_axis].rangeExtent()[1] - scales[height_axis].rangeExtent()[0]) / extent.length),
          halfBand = band/2;

      var width_axis = 'x',
        width_extent = scales[width_axis].range(),
          width_band = ((scales[width_axis].rangeExtent()[1] - scales[width_axis].rangeExtent()[0]) / width_extent.length);
       
      var barHeight =  (band - 25) / ( d3.max(e) + 1 ) ,
          halfBarHeight = barHeight / 2,
          barWidth =  ( width_band /2) / colorCategories.length,
          halfBarWidth = barWidth / 2,
          barSpacing = barWidth/colorCategories.length,
          last_index = colorCategories.length -1;

      function category_offset (label) {
        if (label === "undefined") { label = undefined; }
            position = colorCategories.indexOf( label ),
            midpoint = last_index / 2;
        var offset = (position  - midpoint) * (barWidth + (barSpacing * last_index));
        return Math.round(offset);
      } 

      data_points
          .style('fill-opacity', 0.8)
          .call(colorDataPoint)
        .transition()
          .duration(update_duration)
          .attr('d', 'M 0 0 L '+ halfBarWidth +' 0 L ' + 
                  halfBarWidth +' -' + barHeight + ' L -'+halfBarWidth +' -' + 
                  barHeight + ' L -'+halfBarWidth+' 0 L 0 0' )
          .attr('transform', 
            function(point, i) { 
                return 'translate(' + 
                      (scales.x(point[__.axes.attr.x]) + category_offset(String(point[__.colorBy.label])) ) +
                        ',' +
                      (scales.y(point[__.axes.attr.y] ) + halfBand - (e[i]*barHeight)) + ')';
          });

      function vertical_offset( point ) { return ( point[3] ) * barHeight; } 
      function text_fill( point ) { return addOffset( point ) ? '#fff' : '#000'; }
      function text_stroke( point ) { return addOffset( point ) ? '#000' : 'none'; }
      function addOffset( point ) { return false;}//( vertical_offset(point) > halfBand); }
      
      function text_styling( selector, point ) {
              selector
                // .style('stroke', text_stroke )
                // .style('stroke-width', '1' )
                .style('fill', text_fill )
                .style('visibility', function(point) { return +point[3] <= 0 ? 'hidden' : null; } )
                .attr('transform', function(point) { return 'translate(' + 
                    (scales.x(point[0]) + category_offset( point[2] )) + 
                      ',' +
                    (scales.y(point[1]) + halfBand - vertical_offset(point) + 
                      (addOffset(point) * 20) ) + ')'; } );
      }

      var groups = _.groupBy(f, function(p) {return p[0]+ '_' + p[1];}),
      top_3s = _.map(groups, function(group) { 
        return _.chain(group).sortBy(function(g) { 
          return g[3];
        }).last(3).value();
      }),
      all_labels = _.flatten(top_3s, true);

      var data_text = data_surface.select('.data_labels')
                  .selectAll('.data_totals')
                  .data(all_labels , String );
                  
      data_text.enter()
                .append("text")
                .attr('class','data_totals')
                .style('text-anchor','middle')
                .text(function(point,i){ return point[3];})
                .attr('transform', function(point) {
                      return 'translate(' + 
                          (scales.x(point[0]) + category_offset( point[2] )) + 
                            ',' +
                          scales.y(point[1]) + ')';});

      data_text.transition()
                .duration(update_duration)
                .call(text_styling)

      data_text.exit().remove();

}


function drawMultipleKDE(data_points) {

  var num_axis = __.dataType.x === 'n' ? 'x' : 'y',
      num_domain = scales[num_axis].domain(),
      cat_axis = num_axis === 'x' ? 'y' : 'x',
      cat_domain = scales[cat_axis].domain().map(String),
      cat_extent = scales[cat_axis].range(),
      cat_band = ((scales[cat_axis].rangeExtent()[1] - scales[cat_axis].rangeExtent()[0]) / cat_extent.length),
      cat_scale = d3.scale.linear(), 
      maxKDEValues,maxKDEValue;
      
  var data = {},
      kde_categories = d3.keys(kde),
      color_categories = d3.keys(kde[kde_categories[0]]);
 
  if ( kde_categories.length ) {  
    kde_categories.forEach( function (d) { 
      data[d] = {};
    d3.keys(kde[d]).forEach( function (e) { 
      data[d][e] = sampleEstimates(kde[d][e],num_domain); 
    }); 
  });
    maxKDEValues = d3.values(data).map( function(d) { //for each categorical value
          return d3.max(d3.values(d).map( function(e) {      // for each colorBy value
            return d3.max(e, function(f) { return f[1];});  //find the highest Density value for each kernel
          }));                                              // find the highest density value in each categorical value
    });
    maxKDEValue = d3.max(maxKDEValues);  //over all categorical values, what is the highest?
    cat_scale = d3.scale.linear().domain([0,maxKDEValue]).range([-1*cat_band/2,cat_band/2-10]);
    if ( cat_axis === 'y' ) cat_scale.range([cat_band/2,-1*cat_band/2+10]);
  }
 
  var kde_category = data_surface.select('.kde_surface').selectAll('.kde_group')
      .data(kde_categories, String);
      
  kde_category.enter()
        .append('g')
        .attr('class','kde_group')

  kde_category.transition()
        .duration(update_duration)
        .attr('transform',function(c) { return 'translate(' + 
                    (cat_axis === 'y' ? '0, ' : '') + scales[cat_axis](c) +
                    (cat_axis === 'x' ? ', 0' : '') + ')';
        });

  var kde_ensemble = kde_category.selectAll('.kde_ensemble')
                  .data(function(kde_cat) { return d3.entries(data[kde_cat]); }, function(d) { return d.key;});

  kde_ensemble.enter()
        .append('g')
        .attr('class','kde_ensemble')
        .style("fill", function(d) { return __.colorFn(d.key);} )
        .style("fill-opacity", 0.3);

  var kde_plot = kde_ensemble.selectAll('.kde_plot')
          .data(function(d) { 
            return [d.value];
          }, function(d) { return d.key;} 
            );

  var g = kde_plot.enter()
        .append('g')
        .attr("class","kde_plot");

  g.append("path")
      .attr("class","kde_line")
      .style("fill","none")
      .style("stroke","black");

  g.append('path')
      .attr("class","kde_area")
      .style("stroke","none");

  kde_ensemble
      .call(colorKDEArea);

  kde_plot.transition().select('.kde_line')
      .duration(update_duration)
         .attr("d", d3.svg.line()
          [cat_axis](function(p) { return cat_scale(p[1]); })
          [num_axis](function(p) { return scales[num_axis](p[0])})
         .interpolate("basis"));      

  kde_plot.transition().select('.kde_area')
      .duration(update_duration)
      .attr("d", d3.svg.area()
            .interpolate("basis")
            [num_axis](function(p) {return scales[num_axis](p[0]);})
            [cat_axis+'0'](cat_scale(0))
            [cat_axis+'1'](function(p) { return cat_scale(p[1]); })
            );   

  kde_plot.exit().remove();
  kde_ensemble.exit().remove();
  kde_category.exit().remove();

}

function colorDataPoint(selector) {  
  selector
    .style('fill',function(point) {
          return  __.colorFn(String(point[__.colorBy.label]));
    })
    .style('fill-opacity', function(point) { return __.highlight.length ? 
      ( __.highlight === String(point[__.colorBy.label]) ? 
        0.8 : 0.0 ) 
        : 0.5;})
    .style('stroke', null);
  return selector;
}

function colorKDEArea(selector) {
  selector
      .style('fill-opacity', function(obj) { 
        return __.highlight.length ? ( __.highlight === obj.key ? 0.8 : 0.0 ) : 0.3;
      });
}

function clearDataPoints() {
  var data_points = data_surface.select('.data').selectAll('.data_point').data([],String);
    data_points.exit().remove();
    return;
}

function clearDataLabels() {
  var data_text = data_surface.select('.data_labels')
                    .selectAll('.data_totals')
                    .data([], String );

    data_text.exit().remove();
    return;
}

function clearKDE() {
  var kde = data_surface.select('.kde_surface').selectAll('g').data([],String);
  kde.exit().remove();
}

function cleanDisplay() {
  if ( __.dataType['mix'] !== 'cc' ) clearDataLabels();
  if (__.dataType['mix'] !== 'nc' && __.dataType['mix'] !== 'cn' ) clearKDE();
  if (__.dataType['mix'] !== 'nn' && __.dataType['mix'] !== 'cc' ) clearDataPoints();
}

function drawData() {

  var data_points = data_surface.select('.data')
    .selectAll('.data_point')
    .data(data_array, function(d) { return d[__.id]; } );

  data_points.enter()
      .append('path')
      .attr('class','data_point')
      .style('fill','#fff')
      .style('stroke','#fff');

  data_points.exit()
      .transition()
      .duration(update_duration/2)
      .style('fill-opacity',0)
      .style('stroke-opacity',0)
      .remove();

  cleanDisplay();
  
  if (__.dataType['mix'] === 'nn') {   
    drawScatterplot(data_points);
  }
  else if ( ( __.dataType['x'] == 'n') ^ ( __.dataType['y'] =='n' ) ) {
    drawMultipleKDE(data_points);
  }
  else if (__.dataType['mix'] === 'cc') drawMultipleBarchart(data_points);

}

cv.resize = function() {

    cv.svg
            .attr('height',plotHeight())
            .attr('width',plotWidth())
            .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
  return this;
};

function drawSplits() {

  ['x','y'].forEach( function (axis) { 
    var split_group = d3.select('.'+axis+'.split_group').node();
            if ( _.isNull(split_group) ) split_surface.append('g').attr('class','' + axis + ' split_group');

            if ( __.dataType[axis] === 'n' ) {
                drawNumericalAxisSplits(axis);
            } else {
                drawCategoricalAxisSplits(axis);
            }
            });
}

function clearAllSplitPointers() {
  ['x','y'].forEach( clearSplitPointer);
}

function clearSplitPointer(axis) {
  d3.select('.' + axis + '.split_group').selectAll('.' + axis + '.split_pointer')
          .transition()
          .duration(update_duration)
          .style('stroke-opacity',0)
          .remove();
}

function styleSplitSelector( split_selector, axis ) {
      split_selector
              .style('fill', '#eee')
              .style('fill-opacity', 0.3)
              .style('stroke', '#888')
              .style('stroke-width', 2.0)
             
}

function defineCategoricalSplitShape ( selection, axis ) {
  var domain = scales[axis].domain(),
      extent = scales[axis].range(),
         band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length) - 10;

  if (axis === 'x') {
    selection.attr('transform', function(d) { return 'translate(' + (scales[axis](d) - band/2) + ',0)'; } )
              .attr('x', 0)
              .attr('width', band)
              .attr('y', -1 * padding.top)
              .attr('height', padding.top);
  } else {
    selection.attr('transform', function(d) { return 'translate(0,' + ( scales[axis](d) - band/2 ) + ')'; } )
              .attr('x',-1 * padding.left)
              .attr('width', padding.left)
              .attr('y', 0 )
              .attr('height', band);
  }
}

function drawCategoricalAxisSplits ( axis ) {
   
   split_group = split_surface.select('.' + axis + '.split_group');

  var domain = scales[axis].domain();

  var splits = split_group.selectAll('rect')
            .data( domain, String );

      splits.enter()
           .append('rect')     
              .call(defineCategoricalSplitShape, axis )
              .call(styleSplitSelector, axis )
              .on('mouseover', function() {
                d3.select(this)
                    .style('fill-opacity', 1.0);
              })
              .on('mouseout', function() {
                d3.select(this)
                    .style('fill-opacity', 0.3);
              })
              .on('click', function(val) {
                 if ( _.contains(selected[axis], val )) {
                    removeCategoricalSplitValue(val, axis );
                  }
                  else {
                    selectCategoricalSplitValue(val, axis );
                  }
                  reRender();
              });

    splits.transition()
              .duration(update_duration)
              .call(defineCategoricalSplitShape, axis );

    splits.exit()
          .remove();
}

function defineNumericalSplitShape ( selection, axis ) {

  var extent = scales[axis].range();

  if ( axis === 'x' ) {
    selection
              .attr('x',extent[0])
              .attr('width', extent[1] - extent[0])
              .attr('y', -1 * padding.top)
              .attr('height', padding.top);
  } else {
     selection.attr('x',-1 * padding.left)
              .attr('width', padding.left)
              .attr('y', extent[1])
              .attr('height', extent[0] - extent[1])
  }
}

function drawNumericalAxisSplits ( axis ) {
    
    var split_group = split_surface.select('.' + axis + '.split_group');
    
    var splits = split_group.selectAll('rect')
                      .data(["ZZZ"], String);

    var mouse_position_index = (axis === 'y') + 0; 

    splits.enter()
              .append('rect')             
              .call(defineNumericalSplitShape, axis)
              .call(styleSplitSelector, axis)
              .on('mouseover',function(){
                var position = d3.mouse(this)[mouse_position_index];
                if (selected[axis] === null) selectSplitValue(position, axis);
              })
              .on('mousemove',mousemove_fn(axis))
              .on('mouseout', function() {
                if (selected[axis] === null) clearSplitSelection(axis);
              })
              .on('click', function() {
                  var position = d3.mouse(this)[mouse_position_index];
                  selectSplitValue(position,axis);
                  if (selected[axis] !== null) {
                    clearSplitPointer(axis);
                    selected[axis] = null;
                  } else { 
                    selected[axis] = position;
                    appendNumericalSplitPointer(split_group, axis, position);
                   
                  }
                });

    splits.exit().remove();
              
  }

function appendNumericalSplitPointer(selection, axis, position) {
  if (axis ==='x') {
   selection.append('path')
                      .attr('class',axis + ' split_pointer')
                      .attr('transform','translate('+position+',0)')
                      .attr('d',function(d,i) {
                        return "M" + 0 + ",-" +padding.top + "v"+ padding.top;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width',4.0)
                      .style('fill','#cc6432');
   } else {
      selection.append('path')
                      .attr('class','y split_pointer')
                      .attr('transform','translate(0,'+position+')')
                      .attr('d',function(d,i) {
                        return "M" + "-" + padding.left + ",0h"+ padding.left;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width',4.0)
                      .style('fill','#cc6432');
   }

  }

function drawPartitionSpans() {

    var pad = 10;
    var double_pad = pad *2;

    var partition_splits = [
                            [ 
                              pad, 
                              pad, 
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth() + pad, 
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [ 
                              split_data['x'].span ? split_data['x'].span : displayWidth(), 
                              pad, 
                              split_data['x'].span ? displayWidth() - split_data['x'].span + double_pad : 0, 
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [ 
                              pad,
                              split_data['y'].span ? split_data['y'].span : displayHeight(), 
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth() + pad, 
                              split_data['y'].span ? displayHeight() - split_data['y'].span + pad : 0,
                            ],
                            [ 
                              split_data['x'].span ? split_data['x'].span : displayWidth(), 
                              split_data['y'].span ? split_data['y'].span : displayHeight(), 
                              split_data['x'].span ? displayWidth() - split_data['x'].span + double_pad : 0,
                              split_data['y'].span ? displayHeight() - split_data['y'].span + pad : 0
                            ]
                          ];

    if (_.isNull(split_data['x'].span) && _.isNull(split_data['y'].span)) {
      partition_splits = [];
    }

    var partitions = partition_surface.selectAll('.partition')
                    .data(partition_splits);
        
              partitions
                  .enter()
                  .append('rect')
                  .attr('class','partition')
                   .attr('x',function(val) {return val[0];})
                    .attr('y',function(val) {return val[1];})
                    .attr('width', function(val) {return val[2];})
                    .attr('height',function(val) {return val[3];})
                    .style('fill',function(d,i) { return partitionColors[i]})
                    .style('fill-opacity',0.3)
                    .style('stroke','none')
                    .style('stroke-opacity','0.6')
                    .style('stroke-width',4.0)
                    .on('mouseover', function() {
                      d3.selectAll('.partition').style('stroke','none');
                      d3.select(this).style('stroke','#22D');
                    })
                    .on('mouseout', function() {
                      var el = d3.event.relatedTarget;
                      if (d3.select(el).classed('data_point') || el.nodeName == 'line') { return; }
                      d3.select(this).style('stroke','none');
                    })
                    .on('click',function(dims){
                      var split_obj = {};
                      if ( !_.isNull(split_data['x'].span) ) {
                        split_obj[__.axes.attr.x] = {};
                        if ( __.dataType.x === 'n' ) {
                          var x = {low : scales.x.invert(dims[0]), high: scales.x.invert(dims[2] + dims[0])};
                          split_obj[__.axes.attr.x] = _.clone(x);
                        } else {
                          var xExtent = scales.x.range(),
                              xSelectedVals = _.filter(xExtent, function(val) { return val >= dims[0] && val <= dims[0] + dims[2]; } );
                          split_obj[__.axes.attr.x] = { values: xSelectedVals.map( scales.x.invert) };
                        }
                      }
                      if (!_.isNull(split_data['y'].span)) {
                        split_obj[__.axes.attr.y] = {};
                        if ( __.dataType.y === 'n' ) {
                          var y = {low : scales.y.invert(dims[1] + dims[3]), high: scales.y.invert(dims[1])};
                          split_obj[__.axes.attr.y] = _.clone(y);
                        } else {
                          var yExtent = scales.y.range(),
                              ySelectedVals = yExtent.filter( function(val) { return val >= dims[1] && val <= dims[1] + dims[3];} );
                          split_obj[__.axes.attr.y] = { values : ySelectedVals.map( scales.y.invert) };
                        }
                      }
                      events.partitioncomplete( split_obj );
                    });              

                partitions
                    .attr('x',function(val) {return val[0];})
                    .attr('y',function(val) {return val[1];})
                    .attr('width', function(val) {return val[2];})
                    .attr('height',function(val) {return val[3];});

                partitions.exit()
                    .transition()
                    .duration(100)
                    .attr('fill-opacity',0)
                    .remove();

  }

function clearPartitionSpans() {
   var partitions = partition_surface.selectAll('.partition');
   
   partitions.transition()
              .duration(update_duration)
              .style('fill-opacity',0.0)
              .style('stroke-opacity',0.0)
              .remove();
  }

function mousemove_fn(axis) {
    return function(){ 
                var position = d3.mouse(this)[axis === 'x' ? 0 : 1];
                if (selected[axis] === null) selectSplitValue(position, axis);            
    };
  }

function mouseover_fn(el,index, axis) {
   if (selected[axis] === index) {
                selected[axis] = null;
                clearSplitSelection(axis);
                return;
              }
              selected[axis] = index;
              makeSplitSelection(el,selected[axis],axis);
              return;
  }
 
function makeSplitSelection(el, index, axis){
  split_data[axis].span = split_data[axis].binScale(index);
  drawPartitionSpans();
}

function selectSplitValue(position, axis) {
  var value = scales[axis].invert(position)
  split_data[axis].span = position;
  drawPartitionSpans();
  updateSplitTextLabel(position, axis);
}

function selectCategoricalSplitValue(value, axis) {
  var domain = scales[axis].domain();
  if (!_.contains(selected[axis], value)) selected[axis].push(value);
  var remaining_values = _.difference( domain, selected[axis] ),
      new_domain = _.union(selected[axis],remaining_values),
      band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / new_domain.length) ;

  scales[axis].domain(new_domain);
  scales[axis].invert.range(new_domain);
  
  split_data[axis].span  = scales[axis](value) - ( band/2 * (axis === 'x' ? -1 : 1) );
  
}

function removeCategoricalSplitValue(value, axis) {
  if (!_.contains(selected[axis], value)) return;
  
  selected[axis] = _.difference( selected[axis], [ value ] );
  var len = selected[axis].length
      remaining_values = len ? _.difference( scales[axis].domain(), selected[axis] ) : scales[axis].domain(),
      domain = len ? _.union(selected[axis],remaining_values) : remaining_values,
      band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / domain.length) ;
  
  scales[axis].domain(domain);
  scales[axis].invert.range(domain);

  split_data[axis].span  = len ? scales[axis](selected[axis][len-1]) - ( band/2 * (axis === 'x' ? -1 : 1)) : null;
}

function clearAllSplitSelections() {
  ['x','y'].forEach( function(axis) {
    selected[axis] = __.dataType[axis] === 'n' ? null : [];
    clearSplitSelection(axis)
    });
}

function clearSplitSelection(axis){
    if ( _.isNull(split_data[axis].span) ) return;
    split_data[axis].span = null;
    drawPartitionSpans();
    updateSplitTextLabel(null, axis);
}

function isCategorical(vals) {
  if ( !_.isArray(vals)) return false; //can't handle a non-array...
  if ( vals.length <= min_uniq_points ) return true;   // too few values
  if ( vals.some(_.isString) ) return true;  // any strings?
  return false;
}

function isNumerical(array) {
  return array.every( _.isNumber);
}

function isInt(array) {
  return array.every( function(n) {
     return n % 1 === 0;
  });
}

function isFinite(array) {  // check if there's a terrible number (Infinity, NaN) in there
  return !( array.some( !_.isFinite));
}

function parseData() {
  if (__.data.length < 1) {
      console.log('Empty data array.  Nothing to plot.');
      return;
  }

  var element_properties = d3.keys(__.data[0]);
  if ( _.contains(element_properties,  __.axes.attr.x ) && _.contains(element_properties,  __.axes.attr.y ) ) {
    var xVals = _.uniq(_.pluck(__.data, __.axes.attr.x ) ),
        yVals = _.uniq(_.pluck(__.data,  __.axes.attr.y ) );
        
            __.dataType.x =  isCategorical( xVals ) ? 'c' : 'n';
            __.dataType.y =  isCategorical( yVals ) ? 'c' : 'n';
        
  }
  else {
    console.error('x or y coordinates not packaged in data');
    return;
  }

  data_array = __.data;

  setDataScales(xVals, yVals);

  return cv;
}

function setPartitions(obj ) {
  clearAllSplitSelections();
  var new_partition_obj = obj.value;
  new_partition_obj.forEach( function(obj, key){
    var axis = __.axes.attr.x === key ? 'x' : (__.axes.attr.y === key ? 'y' : '');
    if (_.isEmpty(axis) ) return;
    if ( _.isArray(obj.values) ) obj.values.forEach( function (val) { selectCategoricalSplitValue(val, axis);});
    else if (_.isFinite(obj.high) && _.isFinite(obj.low) ) {
      var domain = scales[axis].domain();
      if (obj.high === domain[1]) selectSplitValue( obj.low, axis);
      else selectSplitValue( obj.high, axis);
    }
  });
  reRender();

}

function scaleRangeValues( values, scale) {
  var low = values[0],
      high = values[1],
      width = high - low || 1,
      margin = width * (scale - 1);
      
      return [ low - margin, high + margin ];
}

function setDataScales( xVals, yVals ) {  //unique values for each dimension
  
  var splits_on_x = _.pluck( data_array, 'splits_on_x' );

  caseSplitsOpacityscale = d3.scale.linear().domain(d3.extent(splits_on_x)).range([0.2,0.9]);
  var range = { 
              "x" : [ 10, plotWidth()-10 ],
              "y" : [ plotHeight()-10, 10 ]
              },
      vals = { 
              "x" : xVals.sort(),
              "y" : yVals.sort().reverse()
            };

  ['x','y'].forEach( function( axis, index ) {
      if ( __.dataType[axis] === 'c' ) {
        scales[axis] = d3.scale.ordinal().domain(vals[axis]).rangePoints(range[axis],1.0);
        scales[axis].invert = d3.scale.ordinal().domain(scales[axis].range()).range(vals[axis]);
        selected[axis] = [];
      } 
      else { 
        var extent = d3.extent(vals[axis]),
        scaledExtent = scaleRangeValues(extent, domainScalingFactor);
        scales[axis] =d3.scale.linear().domain(scaledExtent).rangeRound(range[axis]);
     }
  });
    __.dataType['mix'] = __.dataType['x'] + __.dataType['y'];
    if ( __.dataType['mix'] ==='nc' ) createKDEdata('y','x');
    else if ( __.dataType['mix'] ==='cn' ) createKDEdata('x','y');

  return updateAxes();
}

function createKDEdata( cat_axis, num_axis ) {
  
  //clear global
  kde = {};

  var points = [],
      kde_points = [],
          obj = {},
          num_axis_size = scales[num_axis].domain()[1] - scales[num_axis].domain()[0],
          min_bandwidth = num_axis_size / 100;

      var class_points = [],
      class_num_points = {};

    
  scales[cat_axis].domain().forEach( function(category) {
    obj = {};
    obj[__.axes.attr[cat_axis]] = category;
    kde_points = _.where(__.data, obj );
    points = _.pluck( kde_points, __.axes.attr[num_axis]);
    
    //initialize d hash to count totals for num_axis value for each color category
    var d = {};
    kde[category] = {};

    colorCategories.forEach( function(c) { 
        obj = {}; 
        obj[__.colorBy.label] = c;
        class_points = _.where(kde_points,obj);
        class_num_points[c] = _.pluck( class_points, __.axes.attr[num_axis]);
      });

    
    if ( _.uniq(points).length <= min_uniq_points ) {

    }
    else {
      var kde_temp = science.stats.kde().sample(points).kernel(science.stats.kernel.gaussian);
      var bw = kde_temp.bandwidth()(points)
      if ( bw < min_bandwidth ) {
        kde_temp.bandwidth(min_bandwidth);
        bw = min_bandwidth;
      } 

      if ( colorCategories.length <= 1) return kde[category]['all'] = kde_temp;

      colorCategories.forEach( function(colorCat) { 
         obj = {}; obj[__.colorBy.label] = colorCat;
         if (class_num_points[colorCat].length < 1) return;
         kde_temp = science.stats.kde().sample(class_num_points[colorCat]).bandwidth(bw).kernel(science.stats.kernel.gaussian); 
         kde[category][colorCat] = kde_temp;
      });
    }
  });

}

function setClassScales() {

  //if the class hasn't changed, don't modify it.
  colorCategories = __.colorBy.list.length ?  __.colorBy.list.map(String) : [undefined];

  if ( _.isArray(__.colorBy.colors) && __.colorBy.colors.length ) { pointColors = __.colorBy.colors; }

  var numberOfCategories = colorCategories.length,
      colorArray = _.first(pointColors, numberOfCategories) || pointColors[0];

  __.colorFn = numberOfCategories ? d3.scale.ordinal().domain(colorCategories).range(colorArray) : function() { return colorArray;};

}

function setAxes() {
  
  axisFn["y"].scale(scales['y']).tickSize(-1*plotWidth()+10).ticks(5);
  axisFn["x"].scale(scales['x']).tickSize(2).ticks(5);

  return cv;
}

//returns an empty array if kde cannot be calculated
function sampleEstimates(kde, range) {
    var newPoints = [];
    var data= kde.sample();
    if ( _.isUndefined(range) ) range = d3.extent(data);
    if (data === undefined) { return [];}
   
    //if (variance > dataSize){ variance = dataSize;}
    var stepSize = kde.bandwidth()(data);
    //Filters the data down to relevant points
    //20 points over two variances
    newPoints = d3.range(range[0],range[1],stepSize);
    return kde(newPoints);
  }

function parseSplits() {
  var split_bin_start, split_bin_number, split_bin_end, s;

  ['x','y'].forEach( function (axis){

    if (__.splits[axis] !== undefined) {

     s = split_data[axis].data_array = __.splits[axis].bins;
      
      if(s.length < 1 || s[0] === undefined || s[0].length < 1) {
        console.error('invalid split bins in axis: ' + axis);
        return;
      }

      split_bin_number = split_data[axis].data_array.length;
      split_bin_start = __.splits[axis].low+(.5*__.splits[axis].binsize);
      split_bin_end = split_bin_start + ((split_bin_number-1)*__.splits[axis].binsize);

      var bin_positions = s.map( function(d,i) { 
        return split_bin_start + (__.splits[axis].binsize * i); 
      });

      var range = scales[axis].domain(), min = range[0], max = range[1];
      s= [];
      var idx = 0, bin_p = [];

       bin_positions.forEach( function(val, index) { 
          if (val >= min && val <= max) {
            bin_p[idx] = val;
            s[idx] = split_data[axis].data_array[index];
            idx++;
          } 
      });

      split_bin_number = bin_p.length;
      split_bin_start = bin_p[0];
      split_bin_end = bin_p[split_bin_number-1];

      split_data[axis].data_array = split_bin_number > 0 ? s : undefined;

      split_data[axis].vis = {
          attr : axis === 'x' ? 'd' : 'stroke',
          fn: axis === 'x' ? symbolFunction : strokeFunction,
          default: axis === 'x' ? symbolFunction(0)() : 'transparent',
      };

      if (!_.isUndefined(split_data[axis].data_array)) setSplitScales(axis,split_bin_number,split_bin_start,split_bin_end);
    }

  });
}

  function setSplitScales(axis,split_bin_number,split_bin_start,split_bin_end) {
    var data = split_data[axis].data_array;
    split_data[axis].opacityScale = d3.scale.linear().domain(d3.extent(data)).rangeRound([0.3,0.9]);
    split_data[axis].colorScale = d3.scale.linear().domain(d3.extent(data)).range(['#FFEDA0','#F03B20']);
    split_data[axis].binScale = d3.scale.linear().domain([0,split_bin_number-1]).rangeRound([scales[axis](split_bin_start), scales[axis](split_bin_end)]);

    return cv;
  }

  cv.version = "0.0.1";

  return cv;

};

})();
