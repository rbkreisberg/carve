// data analysis

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
  return _.every(array, _.isFinite);
}

function parseData() {
  if (__.data.length < 1) {
      console.log('Empty data array.  Nothing to plot.');
      return;
  }

  var element_properties = d3.keys(__.data[0]);
  if ( _.contains(element_properties,  __.axisKey.x ) && _.contains(element_properties,  __.axisKey.y ) ) {
    var xVals = _.uniq(_.pluck(__.data, __.axisKey.x ) ),
        yVals = _.uniq(_.pluck(__.data,  __.axisKey.y ) );
        
    __.dataType.x =  isCategorical( xVals ) ? 'c' : 'n';
    __.dataType.y =  isCategorical( yVals ) ? 'c' : 'n';

    data_array = __.data;

    setDataScales(xVals, yVals);
    
  } else {
    console.error('x or y coordinates not packaged in data');
  }

  return;
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
              "x" : [ 0, displayWidth() ],
              "y" : [ displayHeight(), 0 ]
              },
      vals = {
              "x" : _.union(xVals,__.axisInsistCategoricalValues.x).sort(),
              "y" : _.union(yVals,__.axisInsistCategoricalValues.y).sort().reverse()
            };

  ['x','y'].forEach( function( axis, index ) {
      if ( __.dataType[axis] === 'c' ) {
        scales[axis] = d3.scale.ordinal().domain(vals[axis]).rangePoints(range[axis],1.0);
        scales[axis].invert = d3.scale.ordinal().domain(scales[axis].range()).range(vals[axis]);
        selected[axis] = [];
      }
      else {
        var extent = __.axisDomain[axis] || d3.extent(vals[axis]),
        scaledExtent = scaleRangeValues(extent, domainScalingFactor);
        scales[axis] =d3.scale.linear().domain(scaledExtent).rangeRound(range[axis]);
     }
  });
    __.dataType['mix'] = __.dataType['x'] + __.dataType['y'];
    if ( __.dataType['mix'] ==='nc' ) createKDEdata('y', 'x');
    else if ( __.dataType['mix'] ==='cn' ) createKDEdata('x', 'y');

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
    obj[__.axisKey[cat_axis]] = category;
    kde_points = _.where(__.data, obj );
    points = _.pluck( kde_points, __.axisKey[num_axis]);
    
    //initialize d hash to count totals for num_axis value for each color category
    var d = {};
    kde[category] = {};

    colorCategories.forEach( function(c) {
        obj = {};
        obj[__.colorBy.label] = colorCategoryIsNumerical ? +c : c;
        class_points = _.where(kde_points,obj);
        class_num_points[c] = _.pluck( class_points, __.axisKey[num_axis]);
      });

    
    if ( _.uniq(points).length <= min_uniq_points ) {

    }
    else {
      var kde_temp = science.stats.kde().sample(points).kernel(science.stats.kernel.gaussian);
      var bw = kde_temp.bandwidth()(points);
      if ( bw < min_bandwidth ) {
        kde_temp.bandwidth(min_bandwidth);
        bw = min_bandwidth;
      }

      if ( colorCategories.length <= 1 ) {
        kde[category]['all'] = kde_temp;
        return;
      }

      colorCategories.forEach( function(colorCat) {
         obj = {}; obj[__.colorBy.label] = colorCat;
         if (class_num_points[colorCat].length < 1) return;
         kde_temp = science.stats.kde().sample(class_num_points[colorCat]).bandwidth(bw).kernel(science.stats.kernel.gaussian);
         kde[category][colorCat] = kde_temp;
      });
    }
  });

}

function setClassScales(obj) {
  
  colorCategories = __.colorBy.list && __.colorBy.list.length ?  __.colorBy.list.map(String) : [undefined];
  if ( isFinite(colorCategories) ) { colorCategoryIsNumerical = true; }
  else { colorCategoryIsNumerical = false; }

  if ( _.isArray(__.colorBy.colors) && __.colorBy.colors.length ) { pointColors = __.colorBy.colors; }
 
  if (obj && obj.value.id && obj.value.label === undefined) {
        __.colorBy.label = obj.value.id;
        obj.value.label = obj.value.id;
  }
  
  //if the class hasn't changed, don't modify it. 
  if ( obj && 
    obj.value.label === obj.previous.label && 
    _.difference(obj.value.list,obj.previous.list).length === 0 ) {
    return;
  }

  var numberOfCategories = colorCategories.length,
      colorArray = _.first(pointColors, numberOfCategories) || pointColors[0];

  __.colorFn = numberOfCategories ? d3.scale.ordinal().domain(colorCategories).range(colorArray) : function() { return colorArray;};

}

function setAxes() {
  
  axisFn["y"].scale(scales['y']).tickSize(-1*displayWidth()).ticks(5);
  axisFn["x"].scale(scales['x']).tickSize(2).ticks(5);

  return cv;
}

//returns an empty array if kde cannot be calculated
function sampleEstimates(kde, range) {
    var newPoints = [];
    var data= kde.sample();
    if ( _.isUndefined(range) ) range = d3.extent(data);
    if (data === undefined) { return [];}
   
    var stepSize = kde.bandwidth()(data);
    //Filters the data down to relevant points
    //20 points over two variances
    newPoints = d3.range(range[0] - (2 * stepSize),range[1] + (2 * stepSize),stepSize);
    return kde(newPoints);
  }
