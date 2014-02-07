// Split logic and events
 
function selectSplitValue(position, axis) {
  var value = scales[axis].invert(position);
  split_data[axis].span = position;
  drawPartitionSpans();
  updateSplitTextLabel(position, axis);
}

function selectCategoricalSplitValue(value, axis) {
  var domain = scales[axis].domain();
  var rangeExtent = scales[axis].rangeExtent();
  if (!_.contains(selected[axis], value)) selected[axis].push(value);

  var remaining_values = _.difference( domain, selected[axis] ),
      new_domain = _.union(selected[axis],remaining_values),
      band = ((rangeExtent[1] - rangeExtent[0]) / new_domain.length) ;

  if ( remaining_values.length <= 0 ) {
    split_data[axis].span = null;
    selected[axis] = [];
    return;
  }

    scales[axis].domain(new_domain);
    scales[axis].invert.range(new_domain);
    split_data[axis].span  = scales[axis](value) - ( band/2 * (axis === 'x' ? -1 : 1) );
  
}

function removeCategoricalSplitValue(value, axis) {
  if (!_.contains(selected[axis], value)) return;
  
  selected[axis] = _.difference( selected[axis], [ value ] );
  var len = selected[axis].length,
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
    clearSplitSelection(axis);
    });
}

function clearSplitSelection(axis){
    if ( _.isNull(split_data[axis].span) ) return;
    split_data[axis].span = null;
    drawPartitionSpans();
    updateSplitTextLabel(null, axis);
}

function setPartitions(obj ) {
  clearAllSplitSelections();
  var new_partition_obj = obj.value;
  new_partition_obj.forEach( function(obj, key){
    var axis = __.axisKey.x === key ? 'x' : (__.axisKey.y === key ? 'y' : '');
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
      split_bin_start = __.splits[axis].low + ( 0.5 * __.splits[axis].binsize );
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

  }