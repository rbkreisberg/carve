function carve(configObj) {

var config = configObj || {};

// useful defaults
var pointColors = [
                  "#71C560",
                  "#9768C4",
                  "#98B8B8",
                  "#4F473D",
                  "#C1B14C",
                  "#B55381"
            ];

//external accessible values
var __ = {
    width : 500,
    height : 400,
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
    id : 'id',
    axisDomain : {
        "x" : "",
        "y" : ""
    },
    axisLabel : {
             "x" : "X Axis",
             "y" : "Y Axis"
           },
    axisValueDictionary : {
            "x" : {},
            "y" : {}
        },
    axisKey : {
            "x" : "x",
            "y" : "y"
        },
    axisInsistCategoricalValues : {
          "x" : [],
          "y" : []
        },
    highlight : null,
    colorFn : function(d) { return pointColors[0]; },
    colorBy : {
                label:"",
                list:[],
                colors: pointColors
              },
    clear : true,

    //Splitting related parameters
    enableCarving : false,
    splitColor : "#C1573B",
    splits : {},
    partition : {},
    partitionColors : [
                "#98B8B8",
                "#4F473D",
                "#C1B14C",
                "#B55381"
            ]
 };

  _.extend(__, config);

  var events = d3.dispatch.apply(this,["render", "resize", "highlight", "brush", "partitioncomplete"].concat(d3.keys(__))),
      outerWidth = function() { return __.width - __.margin.right - __.margin.left; },
      outerHeight = function() { return __.height - __.margin.top - __.margin.bottom; },
      plotWidth = function() { return outerWidth() - padding.right - padding.left; },
      plotHeight = function() { return outerHeight() - padding.top - padding.bottom; },
      displayWidth = function() { return plotWidth() - 20; },
      displayHeight = function() { return plotHeight() - 20; },

      scales = { x: d3.scale.ordinal(),
                y : {}
              },
      axisScales = { x: scales.x.copy(),
                  y: {}
                },
      kde = { x: null,
                y : null
              },

      selected = {x: null, y: null},
      min_uniq_points = 0,
      domainScalingFactor = 1.04,
      caseSplitsOpacityscale,
      padding = { top: 24, bottom: 24, left: 30, right: 24 },
      shapes = ['square','circle','cross','diamond','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      colorCategories = [],
      colorCategoryIsNumerical = false,
      strokeFunction = function(index) { return splitStrokeColors[index];},
      data_array = [],
      axisFn = {
          "x" :  d3.svg.axis().orient("bottom"),
          "y" : d3.svg.axis().orient("left")
        },
      update_duration = 300,
      bottom_surface, label_surface, split_surface, data_surface, partition_surface; // groups for axes, brushes

      // Splitting-related variables
  var splitStrokeColors = ['red','green','black'],
      split_data = {x: {}, y: {}};

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    .on("radius", function( ) { symbolSize = Math.pow(__.radius,2);})
    .on("data", function( ) { console.log('carve: data loaded');})
    .on("colorBy", setClassScales )
    .on("splits", parseSplits )
    .on("partition", setPartitions )
    .on("axisLabel", updateAxisLabels )
    .on("axisDomain", updateAxisDomains );
   
  var cv = function(selection) {
    selection = cv.selection = d3.select(selection);

    __.width = 800; //selection[0][0].clientWidth;
    __.height = 600; //selection[0][0].clientHeight;

    setAxes();

    //draw chart
    cv.svg = selection
                    .append('div')
                      .attr('class','cv_wrapper')
                    .append('svg')
                      .attr('class','cv')
                      .attr('viewBox','0 0 ' + __.width + ' ' + __.height)
                      .attr('preserveAspectRatio','xMinYMin meet');

    var defs = cv.svg.append("defs");

                  defs.append("svg:clipPath")
                    .attr("id", "plot_clip")
                    .append("svg:rect")
                    .attr("id", "clip-rect")
                    .attr("x", "10")
                    .attr("y", "10")
                    .attr("width", plotWidth()-10)
                    .attr("height", plotHeight() - 20);
            defs.append("svg:clipPath")
                    .attr("id", "viewbox_clip")
                    .append("svg:rect")
                    .attr("x", "0")
                    .attr("y", "0")
                    .attr("width", outerWidth())
                    .attr("height", outerHeight());

    var plot_offset = cv.svg.append('svg')
                        .attr('clip','url(#viewbox_clip)')
                        .attr('overflow','hidden')
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
    label_surface = top_surface.append('g')
                    .attr('class','label_surface')
                    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');
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
  }

cv.render = function() {

  parseData();

  if (axisFn["y"].scale() !== undefined) drawAxes();

  if (data_array.length)  drawData();

  if (_.isObject(split_data) && __.enableCarving ) {
    clearAllSplitSelections();
    clearAllSplitPointers();
    drawSplits();
    drawSplitLabel();
  }

  __.clear = false;

  return this;
};

cv.resize = function() {

    cv.svg
            .attr('height',plotHeight())
            .attr('width',plotWidth())
            .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
  return this;
};

function reRender() {
  updateAxes();
  drawData();
  if (__.enableCarving === false) { return; }
  drawSplits();
  drawPartitionSpans();
}