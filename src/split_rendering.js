// Split rendering

function drawSplitLabel() {

  if (label_surface.select('.split_labels').node() !== null) { return; }
    var split_labels = label_surface.append('g')
                          .attr('class','split_labels');
    split_labels.append('text')
                .attr('class','x')
                .attr('text-anchor','middle')
                .attr('dy','1em')
                .text('');

    split_labels.append('text')
                .attr('class','y')
                .attr('text-anchor','right')
                .attr('dx', '0.1em')
                .text('');
}

function updateSplitTextLabel(position, axis) {
  var format = d3.format('.3f');
    if (position === null) {
      label_surface.select('.split_labels .' + axis)
                      .text('');
      return;
    }
    var transform = {
                  "x" : axis === 'x' ? position : 0,
                  "y" : axis === 'y' ? position : 0
    };
    label_surface.select('.split_labels .' + axis)
                    .text(format(scales[axis].invert(position)))
                    .attr('transform','translate(' + transform.x + ',' + transform.y + ')');
}

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

function styleSplitSelector( split_selector ) {
      split_selector
              .style('fill', '#eee')
              .style('fill-opacity', 0.3)
              .style('stroke', '#888')
              .style('stroke-width', 2.0);
             
}

function defineCategoricalSplitShape ( selection, axis ) {
  var domain = scales[axis].domain(),
      extent = scales[axis].range(),
         band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length) - 10;

  if (axis === 'x') {
    selection
      .attr('transform', function(d) { return 'translate(' + (scales[axis](d) - band/2) + ',0)'; } )
      .attr('x', 0)
      .attr('width', band)
      .attr('y', -10 -2)
      .attr('height', 10 );
  } else {
    selection
      .attr('transform', function(d) { return 'translate(4,' + ( scales[axis](d) - band/2  + 10) + ')'; })
      .attr('x', 0 )
      .attr('width', 10)
      .attr('y', 0 )
      .attr('height', band);
  }
}

function drawCategoricalAxisSplits ( axis ) {
   
  var split_group = split_surface.select('.' + axis + '.split_group');
  if (axis === 'y') {
    split_group
      .attr('transform', function(d) { return 'translate(' + displayWidth() + ',0)'; } );
  }

  var domain = scales[axis].domain();

  var splits = split_group.selectAll('rect')
            .data( domain, String );

      splits.enter()
           .append('rect')
              .call(defineCategoricalSplitShape, axis )
              .call(styleSplitSelector )
              .on('mouseover', function() {
                d3.select(this)
                    .style('fill-opacity', 1.0);
              })
              .on('mouseout', function() {
                d3.select(this)
                    .style('fill-opacity', 0.3);
              })
              .on('click', function(val) {
                 if ( _.contains(selected[axis], val) ) {
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
              .attr('y', -1 * 10)
              .attr('height', 10);
  } else {
     selection
              .attr('x', 0)
              .attr('width', 10)
              .attr('y', 0)
              .attr('height', extent[0] - extent[1]);
  }
}

function drawNumericalAxisSplits ( axis ) {
    
    var split_group = split_surface.select('.' + axis + '.split_group');
    if (axis === 'y') {
      split_group
        .attr('transform', function(d) { return 'translate(' + (displayWidth() + 4) + ',10)'; } );
    }
    
    var splits = split_group.selectAll('rect')
                      .data(["ZZZ"], String);

    var mouse_position_index = (axis === 'y') + 0;

    splits.enter()
              .append('rect')
              .call(defineNumericalSplitShape, axis)
              .call( styleSplitSelector )
              .on('mouseover',function(){
                var position = d3.mouse(this)[mouse_position_index];
                if (selected[axis] === null) selectSplitValue(position, axis);
              })
              .on('mousemove',mousemove_fn(axis) )
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

function mousemove_fn(axis) {
    return function(){
                var position = d3.mouse(this)[axis === 'x' ? 0 : 1];
                if (selected[axis] === null) selectSplitValue(position, axis);
    };
  }

function appendNumericalSplitPointer(selection, axis, position) {
  if (axis ==='x') {
   selection.append('path')
                      .attr('class',axis + ' split_pointer')
                      .attr('transform','translate(' + position + ',0)')
                      .attr('d',function(d,i) {
                        return "M0,-" + 10 + "v"+ 10;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width',4.0)
                      .style('fill','#cc6432');
   } else {
      selection.append('path')
                      .attr('class', axis + ' split_pointer')
                      .attr('transform','translate(0,' + position + ')')
                      .attr('d',function(d,i) {
                        return "M0,0h"+ 10;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width', 4.0)
                      .style('fill','#cc6432');
   }

  }

function drawPartitionSpans() {

    var pad =0;
    var double_pad = pad *2;

    var partition_splits = [
                            [
                              pad,
                              pad,
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth(),
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [
                              split_data['x'].span ? split_data['x'].span : displayWidth(),
                              pad,
                              split_data['x'].span ? displayWidth() - split_data['x'].span + pad : 0,
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [
                              pad,
                              split_data['y'].span ? split_data['y'].span : displayHeight(),
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth(),
                              split_data['y'].span ? displayHeight() - split_data['y'].span + pad : 0,
                            ],
                            [
                              split_data['x'].span ? split_data['x'].span : displayWidth(),
                              split_data['y'].span ? split_data['y'].span : displayHeight(),
                              split_data['x'].span ? displayWidth() - split_data['x'].span + pad : 0,
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
                    .style('fill',function(d,i) { return __.partitionColors[i]; })
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
                        split_obj[__.axisKey.x] = {};
                        if ( __.dataType.x === 'n' ) {
                          var x = {low : scales.x.invert(dims[0]), high: scales.x.invert(dims[2] + dims[0])};
                          split_obj[__.axisKey.x] = _.clone(x);
                        } else {
                          var xExtent = scales.x.range(),
                              xSelectedVals = _.filter(xExtent, function(val) { return val >= dims[0] && val <= dims[0] + dims[2]; } );
                          split_obj[__.axisKey.x] = { values: xSelectedVals.map( scales.x.invert) };
                        }
                      }
                      if (!_.isNull(split_data['y'].span)) {
                        split_obj[__.axisKey.y] = {};
                        if ( __.dataType.y === 'n' ) {
                          var y = {low : scales.y.invert(dims[1] + dims[3]), high: scales.y.invert(dims[1])};
                          split_obj[__.axisKey.y] = _.clone(y);
                        } else {
                          var yExtent = scales.y.range(),
                              ySelectedVals = yExtent.filter( function(val) { return val >= dims[1] && val <= dims[1] + dims[3];} );
                          split_obj[__.axisKey.y] = { values : ySelectedVals.map( scales.y.invert) };
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
