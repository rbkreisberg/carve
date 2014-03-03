// data rendering

function drawAxes() {
  var textpaths = {
                  "x" : 'M 0 ' + (plotHeight()+28) + ' L '+ plotWidth() + ' ' + (plotHeight()+28),
                  "y" : 'M ' + 0 + ' ' + plotHeight() + ' L ' + 0 + ' 0'
                },
      axis_transform = {
                  "x" : 'translate(' + 0 + ',' + displayHeight() + ')',
                  "y" : 'translate(0, 0)'
                },
      label_transform = {
                  "x" : function(d) {
                          return "translate("+ (displayWidth()/2) +"," + outerHeight() + ")" ;
                      },
                  "y" : function(d) {
                          return "translate(" + (plotWidth()) + ',' + displayHeight() / 2 + ") rotate(90)";
                      }
                };

  if (label_surface.select('.axis').node() !== null) return updateAxes();
 ['x','y'].forEach( function(axis) {
     var axisEl = label_surface.append('g')
      .attr('class', axis + 'axis axis');

     adjustTicks(axis);

     axisEl.append('g')
      .attr('class','ticks')
      .attr('transform', axis_transform[axis])
      .call(axisFn[axis]);

     axisEl.append('text')
      .style('text-anchor','middle')
      .attr('class','axis_label')
      .attr("transform", label_transform[axis])
      .text(__.axisLabel[axis]);

  });

 }

function adjustTicks(axis) {
  var tickSizes = {
          "y" : [ 0, -1*displayWidth() ],
          "x" : [ 0, 0]
              },
      axisEl = label_surface.select('.' + axis + 'axis.axis');
     
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
      .attr('x1', 0)
      .attr('x2', displayWidth())
      .attr('y1', function(point) { return point - halfBand; } )
      .attr('y2', function(point) { return point - halfBand; } );
    }
    else {
    lines.enter()
      .append('line')
      .style('stroke', '#888')
      .style('stroke-width', '2px')
      .attr('x1',function(point) { return point + halfBand; })
      .attr('x2', function(point) { return point + halfBand; })
      .attr('y1', 0 )
      .attr('y2', displayHeight());
    }
    
  } else axisFn[axis].tickSize(tickSizes[axis][1]);

 axisFn[axis].tickFormat(format);

}

function updateAxes() {
  ['y','x'].forEach( function(axis) {
    var axisEl = label_surface.select('.' + axis + 'axis.axis');
    axisScales[axis] = scales[axis].copy();
    if (__.dataType[axis] === 'c') {
      axisScales[axis].domain(scales[axis].domain().map(function (val) { return mapCategoricalValues(val, axis);}));
    }
    axisEl.select('.ticks').transition().duration(update_duration).call(axisFn[axis].scale(axisScales[axis]));
    adjustTicks(axis);
  });
}

function clearAxes() {
   ['y','x'].forEach( function(axis) {
      var axis = label_surface.select('.' + axis + 'axis');
      axis.selectAll('.tick text').remove();
      axis.selectAll('.categorical_ticks').remove();

      axis.selectAll('.axis_label').text('');
  });
}

function mapCategoricalValues(value, axis) {
  if (!(axis in __.axisValueDictionary)) return value;
    if (value in __.axisValueDictionary[axis]) { return __.axisValueDictionary[axis][value]; }
  return value;
}

function updateAxisLabels() {

     var y_axis = label_surface.select('.yaxis'),
      x_axis = label_surface.select('.xaxis');

      y_axis.select('.axis_label').text(__.axisLabel.y);
      x_axis.select('.axis_label').text(__.axisLabel.x);
  }

function updateAxisDomains() {

     __.axisDomain.y = _.isArray(__.axisDomain.y) ? __.axisDomain.y : '';
     __.axisDomain.x = _.isArray(__.axisDomain.x) ? __.axisDomain.x : '';

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
        return 'translate(' + scales.x(point[__.axisKey.x]) + ',' +
        scales.y(point[ __.axisKey.y ]) + ')';});


 var data_text = data_surface.select('.data_labels')
                    .selectAll('.data_totals')
                    .data([], String );

    data_text.exit().remove();

  }

function drawMultipleBarchart_summarized(data_points) {

    //fade out data points
    data_points
    .transition()
    .duration(update_duration)
    .attr('fill-opacity',0.0);

  var numCategories = colorCategories.length;

  var height_axis = 'y',
      extent = scales[height_axis].range(),
      band = (scales[height_axis].rangeExtent()[1] - scales[height_axis].rangeExtent()[0]) / extent.length,
      halfBand = band/2;

  var width_axis = 'x',
      width_extent = scales[width_axis].range(),
      width_band = (scales[width_axis].rangeExtent()[1] - scales[width_axis].rangeExtent()[0]) / width_extent.length;
       
  var barWidth =  ( width_band /2) / numCategories,
      halfBarWidth = barWidth / 2,
      barSpacing = barWidth/numCategories,
      last_index = numCategories -1;

  var d = {};

  var sums = {};

  scales.x.domain().forEach( function(label) {
      d[label] = {};
      scales.y.domain().forEach( function(ylabel) {
        d[label][ylabel] = {};
        colorCategories.forEach( function(cat) {
          d[label][ylabel][cat] = 0;
          sums[cat] = 0;
        });
      });
  });

//in case label is undefined
  var colorBy = __.colorBy.label || "";

  if (numCategories >= 1) {
    data_array.forEach( function (point) {
      sums[point[colorBy]]++;
      d[point[__.axisKey.x]][point[__.axisKey.y]][String(point[colorBy])]++;
    });
  } else {
    sums = { 'undefined' : data_array.length };
  }
  
var bars = [];
 for (var xKey in d) {
  for (var yKey in d[xKey]) {
    for (var colorByKey in d[xKey][yKey]) {
      bars.push({
        x: xKey,
        y: yKey,
        colorBy: colorByKey,
        count: d[xKey][yKey][colorByKey]
      });
    }
  }
 }

var barscale = d3.scale.linear().domain([0,1.0]).rangeRound([0, band]);

var bar_elements = data_surface.select('.bar_surface').selectAll('.bar')
  .data(bars, function(bar) { return JSON.stringify(_.pick(bar,'x','y','colorBy')); });

bar_elements
.exit()
.remove();

bar_elements
  .enter()
  .append('path')
  .attr('class','bar')
  .call(initBar);

bar_elements
  .transition()
  .duration(update_duration)
  .call(transitionBar);

  function category_offset (label) {
        if (label === "undefined") { label = undefined; }
            var position = colorCategories.indexOf( label ),
            midpoint = last_index / 2,
            offset = (position - midpoint) * (barWidth + (barSpacing * last_index));
        return Math.round(offset);
  }

  function nullBarPath() {
    return 'M 0 0 L ' + halfBarWidth + ' 0 L ' +
                  halfBarWidth +' 0 L -' + halfBarWidth + ' 0 L -' + halfBarWidth + ' 0 L 0 0';
  }

  function barPath(bar) {
    return 'M 0 0 L '+ halfBarWidth +' 0 L ' +
                  halfBarWidth +' -' + barscale( bar.count / sums[bar.colorBy] || 0 ) + ' L -'+halfBarWidth +' -' +
                   barscale( bar.count / sums[bar.colorBy] ) + ' L -'+halfBarWidth+' 0 L 0 0';
  }

  function initBar(selector) {
    selector
      .style('fill',function(bar) { return __.colorFn(bar['colorBy']); })
      .attr('d',nullBarPath)
      .attr('transform', function(bar) { return 'translate(' +
                      (scales.x(bar.x) + category_offset(String(bar.colorBy)) ) +
                        ',' + (scales.y(bar.y) + halfBand -1) + ')'; });
  }

  function transitionBar(selector) {
    selector
      .style('fill',function(bar) { return __.colorFn(bar['colorBy']); })
      .attr('d',barPath)
      .attr('transform', function(bar) { return 'translate(' +
                      (scales.x(bar.x) + category_offset(String(bar.colorBy)) ) +
                        ',' + (scales.y(bar.y) + halfBand -1) + ')'; });
  }

  function vertical_offset( point ) { return barscale(point[3]); }
  function text_fill( point ) { return addOffset( point ) ? '#fff' : '#000'; }
  function text_stroke( point ) { return addOffset( point ) ? '#000' : 'none'; }
  function addOffset( point ) { return vertical_offset(point) > halfBand; }

  function text_styling( selector, point ) {
        selector
          .style('fill', text_fill )
          .style('visibility', function(point) { return + point[3] <= 0 ? 'hidden' : null; } )
          .attr('transform', function(point) { return 'translate(' +
              (scales.x(point[0]) + category_offset( point[2] )) +
                ',' + (scales.y(point[1]) + halfBand - vertical_offset(point) +
                (addOffset(point) * 16) - 2) + ')'; } ); // magic numbers for font size 16. sigh.
  }

  var top_3s = _.map(bars, function(bar) {
          return [ bar.x, bar.y, bar.colorBy, bar.count / sums[bar.colorBy] || 0 ];
        });
  var format = d3.format(".2f");

  var data_text = data_surface.select('.data_labels')
              .selectAll('.data_totals')
              .data(top_3s , function(bar) { return bar[0] + '_' + bar[1] + '_' + bar[2]; } );
              
  data_text.enter()
            .append("text")
            .style('text-anchor','middle')
            .attr('class','data_totals')
            .attr('transform', function(point) {
                  return 'translate(' +
                      (scales.x(point[0]) + category_offset( point[2] )) +
                        ',' + scales.y(point[1]) + ')';
            })
            .text(function(point){ return format(point[3]);});

  data_text.transition()
            .duration(update_duration)
            .call(text_styling)
            .text(function(point){ return format(point[3]);});

  data_text.exit().remove();
}

function drawMultipleKDE( ) {

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
        .attr('class','kde_group');

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
          }, function(d) { return d.key; }
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
          [num_axis](function(p) { return scales[num_axis](p[0]); })
         .interpolate("basis"));

  kde_plot.transition().select('.kde_area')
      .duration(update_duration)
      .attr("d", d3.svg.area()
            .interpolate("basis")
            [num_axis](function(p) { return scales[num_axis](p[0]); })
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
    .style('fill-opacity', function(point) { return __.highlight && __.highlight.length ?
      ( __.highlight === String(point[__.colorBy.label]) ? 0.8 : 0.0 )
      : 0.5;
      })
    .style('stroke', null);
  return selector;
}

function colorKDEArea(selector) {
  selector
      .style('fill-opacity', function(obj) {
        return __.highlight && __.highlight.length ? ( __.highlight === obj.key ? 0.8 : 0.0 ) : 0.3;
      });
}

function clearDataPoints() {
  var data_points = data_surface.select('.data').selectAll('.data_point').data([],String);
  data_points.exit().remove();
}

function clearBarPlots() {
  data_surface.select('.bar_surface').selectAll('.bar').data([],String).exit().remove();
}

function clearDataLabels() {
  var data_text = data_surface.select('.data_labels')
                    .selectAll('.data_totals')
                    .data([], String );

    data_text.exit().remove();
}

function clearKDE() {
  var kde = data_surface.select('.kde_surface').selectAll('g').data([],String);
  kde.exit().remove();
}

function cleanDisplay() {
  if ( __.dataType['mix'] !== 'cc' ) {
    clearDataLabels();
    clearBarPlots();
  }
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
  else if (__.dataType['mix'] === 'cc') drawMultipleBarchart_summarized(data_points);

}