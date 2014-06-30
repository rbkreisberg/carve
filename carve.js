(function(root, factory) {
  if (typeof exports === "object" && root.require) {
    module.exports = factory(require("underscore"), require("d3"));
  } else if (typeof define === "function" && define.amd) {
    define([ "underscore", "d3" ], function(_, d3) {
      return factory(_ || root._, d3 || root.d3);
    });
  } else {
    root.carve = factory(_, d3);
  }
})(this, function(_, d3) {
  function carve(configObj) {
    var config = configObj || {};
    var pointColors = [ "#71C560", "#9768C4", "#98B8B8", "#4F473D", "#C1B14C", "#B55381" ];
    var __ = {
      width: 500,
      height: 400,
      margin: {
        top: 15,
        bottom: 15,
        left: 30,
        right: 10
      },
      radius: 6,
      dataType: {
        x: "n",
        y: "n",
        mix: "nn"
      },
      data: {
        x: [],
        y: []
      },
      id: "id",
      axisDomain: {
        x: "",
        y: ""
      },
      axisLabel: {
        x: "X Axis",
        y: "Y Axis"
      },
      axisValueDictionary: {
        x: {},
        y: {}
      },
      axisKey: {
        x: null,
        y: null
      },
      axisInsistCategoricalValues: {
        x: [],
        y: []
      },
      highlight: null,
      colorFn: function(d) {
        return pointColors[0];
      },
      colorBy: {
        label: "",
        list: [],
        colors: pointColors
      },
      oneDim: false,
      clear: true,
      enableCarving: false,
      splitColor: "#C1573B",
      splits: {},
      partition: {},
      partitionColors: [ "#98B8B8", "#4F473D", "#C1B14C", "#B55381" ]
    };
    _.extend(__, config);
    var events = d3.dispatch.apply(this, [ "render", "resize", "highlight", "brush", "partitioncomplete" ].concat(d3.keys(__))), outerWidth = function() {
      return __.width - __.margin.right - __.margin.left;
    }, outerHeight = function() {
      return __.height - __.margin.top - __.margin.bottom;
    }, plotWidth = function() {
      return outerWidth() - padding.right - padding.left;
    }, plotHeight = function() {
      return outerHeight() - padding.top - padding.bottom;
    }, displayWidth = function() {
      return plotWidth() - 20;
    }, displayHeight = function() {
      return plotHeight() - 20;
    }, scales = {
      x: d3.scale.ordinal(),
      y: {}
    }, axisScales = {
      x: scales.x.copy(),
      y: {}
    }, kde = {
      x: null,
      y: null
    }, selected = {
      x: null,
      y: null
    }, min_uniq_points = 4, domainScalingFactor = 1.04, caseSplitsOpacityscale, padding = {
      top: 15,
      bottom: 15,
      left: 30,
      right: 20
    }, shapes = [ "circle", "square", "cross", "diamond", "triangle-down", "triangle-up" ], symbolSize = Math.pow(__.radius, 2), symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]), symbolMap = d3.scale.ordinal().domain([ 0, 5 ]).range(shapes), symbolFunction = _.compose(symbol.type, symbolMap), colorCategories = [], colorCategoryIsNumerical = false, strokeFunction = function(index) {
      return splitStrokeColors[index];
    }, data_array = [], axisFn = {
      x: d3.svg.axis().orient("bottom"),
      y: d3.svg.axis().orient("left")
    }, update_duration = 300, bottom_surface, label_surface, axis_surface, split_surface, data_surface, partition_surface;
    var canvas = {}, ctx = {};
    var splitStrokeColors = [ "red", "green", "black" ], split_data = {
      x: {},
      y: {}
    };
    var side_effects = d3.dispatch.apply(this, d3.keys(__)).on("radius", function() {
      symbolSize = Math.pow(__.radius, 2);
    }).on("data", function() {
      console.log("carve: data loaded");
    }).on("colorBy", setClassScales).on("splits", parseSplits).on("partition", setPartitions).on("axisLabel", updateAxisLabels).on("axisDomain", updateAxisDomains);
    var cv = function(selection) {
      selection = cv.selection = d3.select(selection);
      setAxes();
      cv.svg = selection.append("div").attr("class", "cv_wrapper").append("svg").attr("class", "cv").attr("width", __.width).attr("height", __.height);
      canvas["data"] = selection.select("div").append("canvas").attr("class", "cv").style("position", "absolute").attr("width", displayWidth()).attr("height", displayHeight()).style("left", padding.left + __.margin.left + "px").style("top", padding.top + __.margin.top + "px").style("z-index", -180)[0][0];
      ctx["data"] = canvas["data"].getContext("2d");
      var defs = cv.svg.append("defs");
      defs.append("svg:clipPath").attr("id", "plot_clip").append("svg:rect").attr("id", "clip-rect").attr("x", "0").attr("y", "0").attr("width", displayWidth()).attr("height", displayHeight());
      defs.append("svg:clipPath").attr("id", "viewbox_clip").append("svg:rect").attr("x", "0").attr("y", "0").attr("width", outerWidth()).attr("height", outerHeight());
      label_surface = cv.svg.append("g").attr("class", "label_surface").attr("transform", "translate(" + (padding.left + __.margin.left + 10) + "," + (padding.top + __.margin.top + 10) + ")");
      var plot_offset = cv.svg.append("svg").attr("clip", "url(#viewbox_clip)").attr("overflow", "hidden").attr("x", __.margin.left).attr("y", __.margin.top);
      axis_surface = cv.svg.append("g").attr("class", "axis_surface").attr("transform", "translate(" + (padding.left + __.margin.left + 10) + "," + (padding.top + __.margin.top + 10) + ")");
      bottom_surface = plot_offset.append("g").attr("transform", "translate(" + padding.left + "," + padding.top + ")");
      partition_surface = bottom_surface.append("g").attr("transform", "translate(10,10)").attr("class", "partition_surface");
      var top_surface = plot_offset.append("g").attr("transform", "translate(" + padding.left + "," + padding.top + ")");
      split_surface = top_surface.append("g").attr("transform", "translate(10,0)").attr("class", "split_surface");
      data_surface = top_surface.append("g").attr("transform", "translate(10,10)").attr("clip-path", "url(#plot_clip)");
      data_surface.append("g").attr("class", "kde_surface");
      data_surface.append("g").attr("class", "bar_surface");
      data_surface.append("g").attr("class", "data");
      data_surface.append("g").attr("class", "data_labels");
      setClassScales();
      return cv;
    };
    cv.toString = function() {
      return "cv: (" + d3.keys(__.data[0]).length + " total) , " + __.data.length + " rows";
    };
    cv.state = __;
    getset(cv, __, events);
    d3.rebind(cv, events, "on");
    function getset(obj, state, events) {
      d3.keys(state).forEach(function(key) {
        obj[key] = function(x) {
          if (!arguments.length) return state[key];
          var old = state[key];
          state[key] = x;
          side_effects[key].call(cv, {
            value: x,
            previous: old
          });
          events[key].call(cv, {
            value: x,
            previous: old
          });
          return obj;
        };
      });
    }
    cv.render = function(callback) {
      var err = parseData();
      if (err && err.error && err.error === true || data_array.length <= 0) {
        if (_.isFunction(callback)) {
          callback.call(this, err);
        }
        return this;
      }
      drawData();
      if (axisFn["y"].scale() !== undefined) drawAxes();
      if (_.isObject(split_data) && __.enableCarving) {
        clearAllSplitSelections();
        clearAllSplitPointers();
        drawSplits();
        drawSplitLabel();
      }
      __.clear = false;
      if (_.isFunction(callback)) {
        callback.call(this, err);
      }
      return this;
    };
    cv.resize = function() {
      cv.svg.attr("height", plotHeight()).attr("width", plotWidth()).attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
      return this;
    };
    function reRender() {
      updateAxes();
      drawData();
      if (__.enableCarving === false) {
        return;
      }
      drawSplits();
      drawPartitionSpans();
    }
    cv.clear = function() {
      clearDataPoints();
      clearBarPlots();
      clearDataLabels();
      clearKDE();
      clearAxes();
    };
    function drawAxes() {
      var axis_transform = {
        x: "translate(" + 0 + "," + displayHeight() + ")",
        y: "translate(0, 0)"
      }, label_transform = {
        x: function(d) {
          return "translate(" + displayWidth() / 2 + "," + outerHeight() + ")";
        },
        y: function(d) {
          return "translate(" + plotWidth() + "," + displayHeight() / 2 + ") rotate(90)";
        }
      };
      if (axis_surface.select(".axis").node() !== null) return updateAxes();
      [ "x", "y" ].forEach(function(axis) {
        var axisEl = axis_surface.append("g").attr("class", axis + "axis axis");
        adjustTicks(axis);
        axisEl.append("g").attr("class", "ticks").attr("transform", axis_transform[axis]).call(axisFn[axis]);
        axisEl.append("text").style("text-anchor", "middle").attr("class", "axis_label").attr("transform", label_transform[axis]).text(__.axisLabel[axis]);
      });
    }
    function adjustTicks(axis) {
      var tickSizes = {
        y: [ 0, 5 ],
        x: [ 0, 5 ]
      }, axisEl = axis_surface.select("." + axis + "axis.axis");
      axisEl.select(".categorical_ticks").remove();
      var decimalFormat = d3.format(".4r"), format = isNumerical(scales[axis].domain()) && !isInt(scales[axis].domain()) ? null : null;
      if (__.dataType[axis] === "c") {
        var ordinal = label_surface.append("g").attr("class", "categorical_ticks"), ticks = scales[axis].range();
        ticks = ticks.slice(0, ticks.length - 1);
        axisFn[axis].tickSize(tickSizes[axis][0]).tickPadding(8);
        var extent = scales[axis].range(), band = (scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length, halfBand = band / 2;
        var lines = ordinal.selectAll("line").data(ticks);
        if (axis == "y") {
          lines.enter().append("line").style("stroke", "#888").style("stroke-width", "1px").attr("x1", 0).attr("x2", displayWidth()).attr("y1", function(point) {
            return point - halfBand;
          }).attr("y2", function(point) {
            return point - halfBand;
          });
        } else {
          lines.enter().append("line").style("stroke", "#888").style("stroke-width", "1px").attr("x1", function(point) {
            return point + halfBand;
          }).attr("x2", function(point) {
            return point + halfBand;
          }).attr("y1", 0).attr("y2", displayHeight());
        }
      } else axisFn[axis].tickSize(tickSizes[axis][1]);
      axisFn[axis].tickFormat(format);
    }
    function updateAxes() {
      [ "y", "x" ].forEach(function(axis) {
        var axisEl = axis_surface.select("." + axis + "axis.axis");
        axisScales[axis] = scales[axis].copy();
        if (__.dataType[axis] === "c") {
          axisScales[axis].domain(scales[axis].domain().map(function(val) {
            return mapCategoricalValues(val, axis);
          }));
        }
        axisEl.select(".ticks").transition().duration(update_duration).call(axisFn[axis].scale(axisScales[axis]));
        adjustTicks(axis);
      });
    }
    function clearAxes() {
      [ "y", "x" ].forEach(function(axis) {
        var axisEl = axis_surface.select("." + axis + "axis");
        axisEl.selectAll(".tick text").remove();
        axisEl.selectAll(".categorical_ticks").remove();
        axisEl.selectAll(".axis_label").text("");
      });
    }
    function mapCategoricalValues(value, axis) {
      if (!(axis in __.axisValueDictionary)) return value;
      if (value in __.axisValueDictionary[axis]) {
        return __.axisValueDictionary[axis][value];
      }
      return value;
    }
    function updateAxisLabels() {
      var y_axis = axis_surface.select(".yaxis"), x_axis = axis_surface.select(".xaxis");
      y_axis.select(".axis_label").text(__.axisLabel.y);
      x_axis.select(".axis_label").text(__.axisLabel.x);
    }
    function updateAxisDomains() {
      __.axisDomain.y = _.isArray(__.axisDomain.y) ? __.axisDomain.y : "";
      __.axisDomain.x = _.isArray(__.axisDomain.x) ? __.axisDomain.x : "";
    }
    function drawScatterplot_canvas(data_points) {
      data_points.attr("d", symbolFunction(0).size(symbolSize)()).style("fill-opacity", function(point) {
        return _.isUndefined(point.splits_on_x) ? .8 : caseSplitsOpacityscale(point.splits_on_x);
      }).style("stroke-width", "0px").call(colorDataPoint).transition().duration(update_duration).attr("transform", function(point) {
        return "translate(" + scales.x(point[__.axisKey.x]) + "," + scales.y(point[__.axisKey.y]) + ")";
      });
      var data_text = data_surface.select(".data_labels").selectAll(".data_totals").data([], String);
      data_text.exit().remove();
    }
    function drawScatterplot(data_points) {
      data_points.attr("d", symbolFunction(0).size(symbolSize)()).style("fill-opacity", function(point) {
        return _.isUndefined(point.splits_on_x) ? .8 : caseSplitsOpacityscale(point.splits_on_x);
      }).style("stroke-width", "0px").call(colorDataPoint).transition().duration(update_duration).attr("transform", function(point) {
        return "translate(" + scales.x(point[__.axisKey.x]) + "," + scales.y(point[__.axisKey.y]) + ")";
      });
      var data_text = data_surface.select(".data_labels").selectAll(".data_totals").data([], String);
      data_text.exit().remove();
    }
    function drawMultipleBarchart(data_points) {
      data_points.transition().duration(update_duration).attr("fill-opacity", 0);
      var numCategories = colorCategories.length;
      var height_axis = "y", extent = scales[height_axis].range(), band = (scales[height_axis].rangeExtent()[1] - scales[height_axis].rangeExtent()[0]) / extent.length, halfBand = band / 2;
      var width_axis = "x", width_extent = scales[width_axis].range(), width_band = (scales[width_axis].rangeExtent()[1] - scales[width_axis].rangeExtent()[0]) / width_extent.length;
      var barWidth = width_band / 2 / numCategories, halfBarWidth = barWidth / 2, barSpacing = barWidth / numCategories, last_index = numCategories - 1;
      var d = {};
      var sums = {};
      scales.x.domain().forEach(function(label) {
        d[label] = {};
        scales.y.domain().forEach(function(ylabel) {
          d[label][ylabel] = {};
          colorCategories.forEach(function(cat) {
            d[label][ylabel][cat] = 0;
            sums[cat] = 0;
          });
        });
      });
      var colorBy = __.colorBy.label || "";
      if (numCategories >= 1) {
        data_array.forEach(function(point) {
          sums[point[colorBy]]++;
          d[point[__.axisKey.x]][point[__.axisKey.y]][String(point[colorBy])]++;
        });
      } else {
        sums = {
          undefined: data_array.length
        };
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
      var barscale = d3.scale.linear().domain([ 0, 1 ]).rangeRound([ 0, band ]);
      var bar_elements = data_surface.select(".bar_surface").selectAll(".bar").data(bars, function(bar) {
        return JSON.stringify(_.pick(bar, "x", "y", "colorBy"));
      });
      bar_elements.exit().remove();
      bar_elements.enter().append("path").attr("class", "bar").call(initBar);
      bar_elements.transition().duration(update_duration).call(transitionBar);
      function category_offset(label) {
        if (label === "undefined") {
          label = undefined;
        }
        var position = colorCategories.indexOf(label), midpoint = last_index / 2, offset = (position - midpoint) * (barWidth + barSpacing * last_index);
        return Math.round(offset);
      }
      function nullBarPath() {
        return "M 0 0 L " + halfBarWidth + " 0 L " + halfBarWidth + " 0 L -" + halfBarWidth + " 0 L -" + halfBarWidth + " 0 L 0 0";
      }
      function barPath(bar) {
        return "M 0 0 L " + halfBarWidth + " 0 L " + halfBarWidth + " -" + barscale(bar.count / sums[bar.colorBy] || 0) + " L -" + halfBarWidth + " -" + barscale(bar.count / sums[bar.colorBy]) + " L -" + halfBarWidth + " 0 L 0 0";
      }
      function initBar(selector) {
        selector.style("fill", function(bar) {
          return __.colorFn(bar["colorBy"]);
        }).attr("d", nullBarPath).attr("transform", function(bar) {
          return "translate(" + (scales.x(bar.x) + category_offset(String(bar.colorBy))) + "," + (scales.y(bar.y) + halfBand - 1) + ")";
        });
      }
      function transitionBar(selector) {
        selector.style("fill", function(bar) {
          return __.colorFn(bar["colorBy"]);
        }).attr("d", barPath).attr("transform", function(bar) {
          return "translate(" + (scales.x(bar.x) + category_offset(String(bar.colorBy))) + "," + (scales.y(bar.y) + halfBand) + ")";
        });
      }
      function vertical_offset(point) {
        return barscale(point[3]);
      }
      function text_fill(point) {
        return addOffset(point) ? "#fff" : "#000";
      }
      function text_stroke(point) {
        return addOffset(point) ? "#000" : "none";
      }
      function addOffset(point) {
        return vertical_offset(point) > halfBand;
      }
      function text_styling(selector, point) {
        selector.style("fill", text_fill).style("visibility", function(point) {
          return +point[3] <= 0 ? "hidden" : null;
        }).attr("transform", function(point) {
          return "translate(" + (scales.x(point[0]) + category_offset(point[2])) + "," + (scales.y(point[1]) + halfBand - vertical_offset(point) + addOffset(point) * 16 - 2) + ")";
        });
      }
      var top_3s = _.map(bars, function(bar) {
        return [ bar.x, bar.y, bar.colorBy, bar.count / sums[bar.colorBy] || 0 ];
      });
      var format = d3.format(".2f");
      var data_text = data_surface.select(".data_labels").selectAll(".data_totals").data(top_3s, function(bar) {
        return bar[0] + "_" + bar[1] + "_" + bar[2];
      });
      data_text.enter().append("text").style("text-anchor", "middle").attr("class", "data_totals").attr("transform", function(point) {
        return "translate(" + (scales.x(point[0]) + category_offset(point[2])) + "," + scales.y(point[1]) + ")";
      }).text(function(point) {
        return format(point[3]);
      });
      data_text.transition().duration(update_duration).call(text_styling).text(function(point) {
        return format(point[3]);
      });
      data_text.exit().remove();
    }
    function drawMultipleKDE() {
      var num_axis = __.dataType.x === "n" ? "x" : "y", num_domain = scales[num_axis].domain(), cat_axis = num_axis === "x" ? "y" : "x", cat_domain = scales[cat_axis].domain().map(String), cat_extent = scales[cat_axis].range(), cat_band = (scales[cat_axis].rangeExtent()[1] - scales[cat_axis].rangeExtent()[0]) / cat_extent.length, cat_scale = d3.scale.linear(), maxKDEValues, maxKDEValue;
      var data = {}, kde_categories = d3.keys(kde), color_categories = d3.keys(kde[kde_categories[0]]);
      if (kde_categories.length) {
        kde_categories.forEach(function(d) {
          data[d] = {};
          d3.keys(kde[d]).forEach(function(e) {
            data[d][e] = sampleEstimates(kde[d][e], num_domain);
          });
        });
        maxKDEValues = d3.values(data).map(function(d) {
          return d3.max(d3.values(d).map(function(e) {
            return d3.max(e, function(f) {
              return f[1];
            });
          }));
        });
        maxKDEValue = d3.max(maxKDEValues);
        cat_scale = d3.scale.linear().domain([ 0, maxKDEValue ]).range([ -1 * cat_band / 2, cat_band / 2 - 10 ]);
        if (cat_axis === "y") cat_scale.range([ cat_band / 2, -1 * cat_band / 2 + 10 ]);
      }
      var kde_category = data_surface.select(".kde_surface").selectAll(".kde_group").data(kde_categories, String);
      kde_category.enter().append("g").attr("class", "kde_group");
      kde_category.transition().duration(update_duration).attr("transform", function(c) {
        return "translate(" + (cat_axis === "y" ? "0, " : "") + scales[cat_axis](c) + (cat_axis === "x" ? ", 0" : "") + ")";
      });
      var kde_ensemble = kde_category.selectAll(".kde_ensemble").data(function(kde_cat) {
        return d3.entries(data[kde_cat]);
      }, function(d) {
        return d.key;
      });
      kde_ensemble.enter().append("g").attr("class", "kde_ensemble").style("fill", function(d) {
        return __.colorFn(d.key);
      }).style("fill-opacity", .3);
      var kde_plot = kde_ensemble.selectAll(".kde_plot").data(function(d) {
        return [ d.value ];
      }, function(d) {
        return d.key;
      });
      var g = kde_plot.enter().append("g").attr("class", "kde_plot");
      g.append("path").attr("class", "kde_line").style("fill", "none").style("stroke", "black");
      g.append("path").attr("class", "kde_area").style("stroke", "none");
      kde_ensemble.call(colorKDEArea);
      kde_plot.transition().select(".kde_line").duration(update_duration).attr("d", d3.svg.line()[cat_axis](function(p) {
        return cat_scale(p[1]);
      })[num_axis](function(p) {
        return scales[num_axis](p[0]);
      }).interpolate("basis"));
      kde_plot.transition().select(".kde_area").duration(update_duration).attr("d", d3.svg.area().interpolate("basis")[num_axis](function(p) {
        return scales[num_axis](p[0]);
      })[cat_axis + "0"](cat_scale(0))[cat_axis + "1"](function(p) {
        return cat_scale(p[1]);
      }));
      kde_plot.exit().remove();
      kde_ensemble.exit().remove();
      kde_category.exit().remove();
    }
    function colorDataPoint(selector) {
      selector.style("fill", function(point) {
        return __.colorFn(String(point[__.colorBy.label]));
      }).style("fill-opacity", function(point) {
        return __.highlight && __.highlight.length ? __.highlight === String(point[__.colorBy.label]) ? .9 : .3 : .9;
      }).style("stroke", null);
      return selector;
    }
    function colorKDEArea(selector) {
      selector.style("fill-opacity", function(obj) {
        return __.highlight && __.highlight.length ? __.highlight === obj.key ? .9 : .3 : .9;
      });
    }
    function clearDataPoints() {
      var data_points = data_surface.select(".data").selectAll(".data_point").data([], String);
      data_points.exit().remove();
    }
    function clearBarPlots() {
      data_surface.select(".bar_surface").selectAll(".bar").data([], String).exit().remove();
    }
    function clearDataLabels() {
      var data_text = data_surface.select(".data_labels").selectAll(".data_totals").data([], String);
      data_text.exit().remove();
    }
    function clearKDE() {
      var kde = data_surface.select(".kde_surface").selectAll("g").data([], String);
      kde.exit().remove();
    }
    function cleanDisplay() {
      if (__.dataType["mix"] !== "cc") {
        clearDataLabels();
        clearBarPlots();
      }
      if (__.dataType["mix"] !== "nc" && __.dataType["mix"] !== "cn") clearKDE();
      if (__.dataType["mix"] !== "nn" && __.dataType["mix"] !== "cc" && __.oneDim === false) clearDataPoints();
    }
    function drawData() {
      var data_points = data_surface.select(".data").selectAll(".data_point").data(data_array, function(d) {
        return d[__.id];
      });
      data_points.enter().append("path").attr("class", "data_point").style("fill", "#fff").style("stroke", "#fff");
      data_points.exit().transition().duration(update_duration / 2).style("fill-opacity", 0).style("stroke-opacity", 0).remove();
      cleanDisplay();
      if (__.dataType["mix"] === "nn" || __.oneDim === true) {
        drawScatterplot(data_points);
      } else if (__.dataType["x"] == "n" ^ __.dataType["y"] == "n") {
        drawMultipleKDE(data_points);
      } else if (__.dataType["mix"] === "cc") drawMultipleBarchart(data_points);
    }
    function isCategorical(vals) {
      if (!_.isArray(vals)) return false;
      if (vals.length <= min_uniq_points) return true;
      if (vals.some(_.isString)) return true;
      return false;
    }
    function isNumerical(array) {
      return array.every(_.isNumber);
    }
    function isInt(array) {
      return array.every(function(n) {
        return n % 1 === 0;
      });
    }
    function isFinite(array) {
      return _.every(array, _.isFinite);
    }
    function parseData() {
      if (__.data.length < 1) {
        console.log("Empty data array.  Nothing to plot.");
        return {
          error: true
        };
      }
      var element_properties = d3.keys(__.data[0]), xVals, yVals, xValFunction, yValFunction;
      __.oneDim = false;
      if (!_.contains(element_properties, __.id)) {
        console.log("carve: id attribute not detected in data. Specify the id property label in the carve configuration.");
        return;
      }
      if (!_.contains(element_properties, __.axisKey.x)) {
        __.axisKey.x = __.id;
        console.log("carve:  x axis attribute not detected in data. Automatically assigning it to id attribute.");
      }
      if (!_.contains(element_properties, __.axisKey.y)) {
        __.axisKey.y = __.id;
        console.log("carve:  y axis attribute not detected in data. Automatically assigning it to id attribute.");
      }
      if (_.contains(element_properties, __.axisKey.x) && _.contains(element_properties, __.axisKey.y)) {
        xVals = _.uniq(_.pluck(__.data, __.axisKey.x));
        yVals = _.uniq(_.pluck(__.data, __.axisKey.y));
        __.dataType.x = isCategorical(xVals) ? "c" : "n";
        __.dataType.y = isCategorical(yVals) ? "c" : "n";
        if (__.axisKey.x === __.id && xVals.length < 11 || __.axisKey.y === __.id && yVals.length < 11) {
          __.oneDim = true;
        } else if (__.axisKey.x === __.id) {
          __.axisKey.x = "x_dummy";
          _.forEach(__.data, function(el) {
            el[__.axisKey.x] = "";
          });
          xVals = [ "" ];
          __.axisLabel.x = "Density";
        } else if (__.axisKey.y === __.id) {
          __.axisKey.y = "y_dummy";
          _.forEach(__.data, function(el) {
            el[__.axisKey.y] = "";
          });
          yVals = [ "" ];
          __.axisLabel.y = "Density";
        }
        data_array = __.data;
      }
      setDataScales(xVals, yVals);
      return;
    }
    function scaleRangeValues(values, scale) {
      var low = values[0], high = values[1], width = high - low || 1, margin = width * (scale - 1);
      if (low - margin <= 0 && 0 <= low + margin) {
        return [ 0, high + margin ];
      } else if (high - margin <= 0 && 0 <= high + margin) {
        return [ low - margin, 0 ];
      }
      return [ low - margin, high + margin ];
    }
    function setDataScales(xVals, yVals) {
      var splits_on_x = _.pluck(data_array, "splits_on_x");
      caseSplitsOpacityscale = d3.scale.linear().domain(d3.extent(splits_on_x)).range([ .2, .9 ]);
      var range = {
        x: [ 0, displayWidth() ],
        y: [ displayHeight(), 0 ]
      }, vals = {
        x: _.union(xVals, __.axisInsistCategoricalValues.x).sort(),
        y: _.union(yVals, __.axisInsistCategoricalValues.y).sort().reverse()
      };
      [ "x", "y" ].forEach(function(axis, index) {
        if (__.dataType[axis] === "c") {
          scales[axis] = d3.scale.ordinal().domain(vals[axis]).rangePoints(range[axis], 1);
          scales[axis].invert = d3.scale.ordinal().domain(scales[axis].range()).range(vals[axis]);
          selected[axis] = [];
        } else {
          var extent = __.axisDomain[axis] || d3.extent(vals[axis]), scaledExtent = scaleRangeValues(extent, domainScalingFactor);
          scales[axis] = d3.scale.linear().domain(scaledExtent).rangeRound(range[axis]);
        }
      });
      __.dataType["mix"] = __.dataType["x"] + __.dataType["y"];
      if (__.dataType["mix"] === "nc" && !__.oneDim) createKDEdata("y", "x"); else if (__.dataType["mix"] === "cn") createKDEdata("x", "y");
      return updateAxes();
    }
    function createKDEdata(cat_axis, num_axis) {
      kde = {};
      var points = [], kde_points = [], obj = {}, num_axis_size = scales[num_axis].domain()[1] - scales[num_axis].domain()[0], min_bandwidth = num_axis_size / 100;
      var class_points = [], class_num_points = {};
      scales[cat_axis].domain().forEach(function(category) {
        obj = {};
        obj[__.axisKey[cat_axis]] = category;
        kde_points = _.where(__.data, obj);
        points = _.pluck(kde_points, __.axisKey[num_axis]);
        var d = {};
        kde[category] = {};
        colorCategories.forEach(function(c) {
          obj = {};
          obj[__.colorBy.label] = colorCategoryIsNumerical ? +c : c;
          class_points = _.where(kde_points, obj);
          class_num_points[c] = _.pluck(class_points, __.axisKey[num_axis]);
        });
        if (_.uniq(points).length <= min_uniq_points) {} else {
          var kde_temp = science.stats.kde().sample(points).kernel(science.stats.kernel.gaussian);
          var bw = kde_temp.bandwidth()(points);
          if (bw < min_bandwidth) {
            kde_temp.bandwidth(min_bandwidth);
            bw = min_bandwidth;
          }
          if (colorCategories.length <= 1) {
            kde[category]["all"] = kde_temp;
            return;
          }
          colorCategories.forEach(function(colorCat) {
            obj = {};
            obj[__.colorBy.label] = colorCat;
            if (class_num_points[colorCat].length < 1) return;
            kde_temp = science.stats.kde().sample(class_num_points[colorCat]).bandwidth(bw).kernel(science.stats.kernel.gaussian);
            kde[category][colorCat] = kde_temp;
          });
        }
      });
    }
    function setClassScales(obj) {
      colorCategories = __.colorBy.list && __.colorBy.list.length ? __.colorBy.list.map(String) : [ undefined ];
      if (isFinite(colorCategories)) {
        colorCategoryIsNumerical = true;
      } else {
        colorCategoryIsNumerical = false;
      }
      if (_.isArray(__.colorBy.colors) && __.colorBy.colors.length) {
        pointColors = __.colorBy.colors;
      }
      if (obj && obj.value.id && obj.value.label === undefined) {
        __.colorBy.label = obj.value.id;
        obj.value.label = obj.value.id;
      }
      if (obj && obj.value.label === obj.previous.label && _.difference(obj.value.list, obj.previous.list).length === 0) {
        return;
      }
      var numberOfCategories = colorCategories.length, colorArray = _.first(pointColors, numberOfCategories) || pointColors[0];
      __.colorFn = numberOfCategories ? d3.scale.ordinal().domain(colorCategories).range(colorArray) : function() {
        return colorArray;
      };
    }
    function setAxes() {
      axisFn["y"].scale(scales["y"]).tickSize(-1 * displayWidth()).ticks(5);
      axisFn["x"].scale(scales["x"]).tickSize(2).ticks(5);
      return cv;
    }
    function sampleEstimates(kde, range) {
      var newPoints = [];
      var data = kde.sample();
      if (_.isUndefined(range)) range = d3.extent(data);
      if (data === undefined) {
        return [];
      }
      var stepSize = kde.bandwidth()(data);
      newPoints = d3.range(range[0] - 2 * stepSize, range[1] + 2 * stepSize, stepSize);
      return kde(newPoints);
    }
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
      var remaining_values = _.difference(domain, selected[axis]), new_domain = _.union(selected[axis], remaining_values), band = (rangeExtent[1] - rangeExtent[0]) / new_domain.length;
      if (remaining_values.length <= 0) {
        split_data[axis].span = null;
        selected[axis] = [];
        return;
      }
      scales[axis].domain(new_domain);
      scales[axis].invert.range(new_domain);
      split_data[axis].span = scales[axis](value) - band / 2 * (axis === "x" ? -1 : 1);
    }
    function removeCategoricalSplitValue(value, axis) {
      if (!_.contains(selected[axis], value)) return;
      selected[axis] = _.difference(selected[axis], [ value ]);
      var len = selected[axis].length, remaining_values = len ? _.difference(scales[axis].domain(), selected[axis]) : scales[axis].domain(), domain = len ? _.union(selected[axis], remaining_values) : remaining_values, band = (scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / domain.length;
      scales[axis].domain(domain);
      scales[axis].invert.range(domain);
      split_data[axis].span = len ? scales[axis](selected[axis][len - 1]) - band / 2 * (axis === "x" ? -1 : 1) : null;
    }
    function clearAllSplitSelections() {
      [ "x", "y" ].forEach(function(axis) {
        selected[axis] = __.dataType[axis] === "n" ? null : [];
        clearSplitSelection(axis);
      });
    }
    function clearSplitSelection(axis) {
      if (_.isNull(split_data[axis].span)) return;
      split_data[axis].span = null;
      drawPartitionSpans();
      updateSplitTextLabel(null, axis);
    }
    function setPartitions(obj) {
      clearAllSplitSelections();
      var new_partition_obj = obj.value;
      new_partition_obj.forEach(function(obj, key) {
        var axis = __.axisKey.x === key ? "x" : __.axisKey.y === key ? "y" : "";
        if (_.isEmpty(axis)) return;
        if (_.isArray(obj.values)) obj.values.forEach(function(val) {
          selectCategoricalSplitValue(val, axis);
        }); else if (_.isFinite(obj.high) && _.isFinite(obj.low)) {
          var domain = scales[axis].domain();
          if (obj.high === domain[1]) selectSplitValue(obj.low, axis); else selectSplitValue(obj.high, axis);
        }
      });
      reRender();
    }
    function parseSplits() {
      var split_bin_start, split_bin_number, split_bin_end, s;
      [ "x", "y" ].forEach(function(axis) {
        if (__.splits[axis] !== undefined) {
          s = split_data[axis].data_array = __.splits[axis].bins;
          if (s.length < 1 || s[0] === undefined || s[0].length < 1) {
            console.error("invalid split bins in axis: " + axis);
            return;
          }
          split_bin_number = split_data[axis].data_array.length;
          split_bin_start = __.splits[axis].low + .5 * __.splits[axis].binsize;
          split_bin_end = split_bin_start + (split_bin_number - 1) * __.splits[axis].binsize;
          var bin_positions = s.map(function(d, i) {
            return split_bin_start + __.splits[axis].binsize * i;
          });
          var range = scales[axis].domain(), min = range[0], max = range[1];
          s = [];
          var idx = 0, bin_p = [];
          bin_positions.forEach(function(val, index) {
            if (val >= min && val <= max) {
              bin_p[idx] = val;
              s[idx] = split_data[axis].data_array[index];
              idx++;
            }
          });
          split_bin_number = bin_p.length;
          split_bin_start = bin_p[0];
          split_bin_end = bin_p[split_bin_number - 1];
          split_data[axis].data_array = split_bin_number > 0 ? s : undefined;
          split_data[axis].vis = {
            attr: axis === "x" ? "d" : "stroke",
            fn: axis === "x" ? symbolFunction : strokeFunction,
            "default": axis === "x" ? symbolFunction(0)() : "transparent"
          };
          if (!_.isUndefined(split_data[axis].data_array)) setSplitScales(axis, split_bin_number, split_bin_start, split_bin_end);
        }
      });
    }
    function setSplitScales(axis, split_bin_number, split_bin_start, split_bin_end) {
      var data = split_data[axis].data_array;
      split_data[axis].opacityScale = d3.scale.linear().domain(d3.extent(data)).rangeRound([ .3, .9 ]);
      split_data[axis].colorScale = d3.scale.linear().domain(d3.extent(data)).range([ "#FFEDA0", "#F03B20" ]);
      split_data[axis].binScale = d3.scale.linear().domain([ 0, split_bin_number - 1 ]).rangeRound([ scales[axis](split_bin_start), scales[axis](split_bin_end) ]);
    }
    function drawSplitLabel() {
      if (label_surface.select(".split_labels").node() !== null) {
        return;
      }
      var split_labels = label_surface.append("g").attr("class", "split_labels");
      split_labels.append("text").attr("class", "x").attr("text-anchor", "middle").attr("dy", "1em").text("");
      split_labels.append("text").attr("class", "y").attr("text-anchor", "right").attr("dx", "0.1em").text("");
    }
    function updateSplitTextLabel(position, axis) {
      var format = d3.format(".3f");
      if (position === null) {
        label_surface.select(".split_labels ." + axis).text("");
        return;
      }
      var transform = {
        x: axis === "x" ? position : 0,
        y: axis === "y" ? position : 0
      };
      label_surface.select(".split_labels ." + axis).text(format(scales[axis].invert(position))).attr("transform", "translate(" + transform.x + "," + transform.y + ")");
    }
    function drawSplits() {
      [ "x", "y" ].forEach(function(axis) {
        var split_group = d3.select("." + axis + ".split_group").node();
        if (_.isNull(split_group)) split_surface.append("g").attr("class", "" + axis + " split_group");
        if (__.dataType[axis] === "n") {
          drawNumericalAxisSplits(axis);
        } else {
          drawCategoricalAxisSplits(axis);
        }
      });
    }
    function clearAllSplitPointers() {
      [ "x", "y" ].forEach(clearSplitPointer);
    }
    function clearSplitPointer(axis) {
      d3.select("." + axis + ".split_group").selectAll("." + axis + ".split_pointer").transition().duration(update_duration).style("stroke-opacity", 0).remove();
    }
    function styleSplitSelector(split_selector) {
      split_selector.style("fill", "#eee").style("fill-opacity", .3).style("stroke", "#888").style("stroke-width", 2);
    }
    function defineCategoricalSplitShape(selection, axis) {
      var domain = scales[axis].domain(), extent = scales[axis].range(), band = (scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length - 10;
      if (axis === "x") {
        selection.attr("transform", function(d) {
          return "translate(" + (scales[axis](d) - band / 2) + ",0)";
        }).attr("x", 0).attr("width", band).attr("y", -10 - 2).attr("height", 10);
      } else {
        selection.attr("transform", function(d) {
          return "translate(4," + (scales[axis](d) - band / 2 + 10) + ")";
        }).attr("x", 0).attr("width", 10).attr("y", 0).attr("height", band);
      }
    }
    function drawCategoricalAxisSplits(axis) {
      var split_group = split_surface.select("." + axis + ".split_group");
      if (axis === "y") {
        split_group.attr("transform", function(d) {
          return "translate(" + displayWidth() + ",0)";
        });
      }
      var domain = scales[axis].domain();
      var splits = split_group.selectAll("rect").data(domain, String);
      splits.enter().append("rect").call(defineCategoricalSplitShape, axis).call(styleSplitSelector).on("mouseover", function() {
        d3.select(this).style("fill-opacity", 1);
      }).on("mouseout", function() {
        d3.select(this).style("fill-opacity", .3);
      }).on("click", function(val) {
        if (_.contains(selected[axis], val)) {
          removeCategoricalSplitValue(val, axis);
        } else {
          selectCategoricalSplitValue(val, axis);
        }
        reRender();
      });
      splits.transition().duration(update_duration).call(defineCategoricalSplitShape, axis);
      splits.exit().remove();
    }
    function defineNumericalSplitShape(selection, axis) {
      var extent = scales[axis].range();
      if (axis === "x") {
        selection.attr("x", extent[0]).attr("width", extent[1] - extent[0]).attr("y", -1 * 10).attr("height", 10);
      } else {
        selection.attr("x", 0).attr("width", 10).attr("y", 0).attr("height", extent[0] - extent[1]);
      }
    }
    function drawNumericalAxisSplits(axis) {
      var split_group = split_surface.select("." + axis + ".split_group");
      if (axis === "y") {
        split_group.attr("transform", function(d) {
          return "translate(" + (displayWidth() + 4) + ",10)";
        });
      }
      var splits = split_group.selectAll("rect").data([ "ZZZ" ], String);
      var mouse_position_index = (axis === "y") + 0;
      splits.enter().append("rect").call(defineNumericalSplitShape, axis).call(styleSplitSelector).on("mouseover", function() {
        var position = d3.mouse(this)[mouse_position_index];
        if (selected[axis] === null) selectSplitValue(position, axis);
      }).on("mousemove", mousemove_fn(axis)).on("mouseout", function() {
        if (selected[axis] === null) clearSplitSelection(axis);
      }).on("click", function() {
        var position = d3.mouse(this)[mouse_position_index];
        selectSplitValue(position, axis);
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
      return function() {
        var position = d3.mouse(this)[axis === "x" ? 0 : 1];
        if (selected[axis] === null) selectSplitValue(position, axis);
      };
    }
    function appendNumericalSplitPointer(selection, axis, position) {
      if (axis === "x") {
        selection.append("path").attr("class", axis + " split_pointer").attr("transform", "translate(" + position + ",0)").attr("d", function(d, i) {
          return "M0,-" + 10 + "v" + 10;
        }).style("stroke", "#cc6432").style("stroke-width", 4).style("fill", "#cc6432");
      } else {
        selection.append("path").attr("class", axis + " split_pointer").attr("transform", "translate(0," + position + ")").attr("d", function(d, i) {
          return "M0,0h" + 10;
        }).style("stroke", "#cc6432").style("stroke-width", 4).style("fill", "#cc6432");
      }
    }
    function drawPartitionSpans() {
      var pad = 0;
      var double_pad = pad * 2;
      var partition_splits = [ [ pad, pad, split_data["x"].span ? split_data["x"].span - pad : displayWidth(), split_data["y"].span ? split_data["y"].span - pad : displayHeight() ], [ split_data["x"].span ? split_data["x"].span : displayWidth(), pad, split_data["x"].span ? displayWidth() - split_data["x"].span + pad : 0, split_data["y"].span ? split_data["y"].span - pad : displayHeight() ], [ pad, split_data["y"].span ? split_data["y"].span : displayHeight(), split_data["x"].span ? split_data["x"].span - pad : displayWidth(), split_data["y"].span ? displayHeight() - split_data["y"].span + pad : 0 ], [ split_data["x"].span ? split_data["x"].span : displayWidth(), split_data["y"].span ? split_data["y"].span : displayHeight(), split_data["x"].span ? displayWidth() - split_data["x"].span + pad : 0, split_data["y"].span ? displayHeight() - split_data["y"].span + pad : 0 ] ];
      if (_.isNull(split_data["x"].span) && _.isNull(split_data["y"].span)) {
        partition_splits = [];
      }
      var partitions = partition_surface.selectAll(".partition").data(partition_splits);
      partitions.enter().append("rect").attr("class", "partition").attr("x", function(val) {
        return val[0];
      }).attr("y", function(val) {
        return val[1];
      }).attr("width", function(val) {
        return val[2];
      }).attr("height", function(val) {
        return val[3];
      }).style("fill", function(d, i) {
        return __.partitionColors[i];
      }).style("fill-opacity", .3).style("stroke", "none").style("stroke-opacity", "0.6").style("stroke-width", 4).on("mouseover", function() {
        d3.selectAll(".partition").style("stroke", "none");
        d3.select(this).style("stroke", "#22D");
      }).on("mouseout", function() {
        var el = d3.event.relatedTarget;
        if (d3.select(el).classed("data_point") || el.nodeName == "line") {
          return;
        }
        d3.select(this).style("stroke", "none");
      }).on("click", function(dims) {
        var split_obj = {};
        if (!_.isNull(split_data["x"].span)) {
          split_obj[__.axisKey.x] = {};
          if (__.dataType.x === "n") {
            var x = {
              low: scales.x.invert(dims[0]),
              high: scales.x.invert(dims[2] + dims[0])
            };
            split_obj[__.axisKey.x] = _.clone(x);
          } else {
            var xExtent = scales.x.range(), xSelectedVals = _.filter(xExtent, function(val) {
              return val >= dims[0] && val <= dims[0] + dims[2];
            });
            split_obj[__.axisKey.x] = {
              values: xSelectedVals.map(scales.x.invert)
            };
          }
        }
        if (!_.isNull(split_data["y"].span)) {
          split_obj[__.axisKey.y] = {};
          if (__.dataType.y === "n") {
            var y = {
              low: scales.y.invert(dims[1] + dims[3]),
              high: scales.y.invert(dims[1])
            };
            split_obj[__.axisKey.y] = _.clone(y);
          } else {
            var yExtent = scales.y.range(), ySelectedVals = yExtent.filter(function(val) {
              return val >= dims[1] && val <= dims[1] + dims[3];
            });
            split_obj[__.axisKey.y] = {
              values: ySelectedVals.map(scales.y.invert)
            };
          }
        }
        events.partitioncomplete(split_obj);
      });
      partitions.attr("x", function(val) {
        return val[0];
      }).attr("y", function(val) {
        return val[1];
      }).attr("width", function(val) {
        return val[2];
      }).attr("height", function(val) {
        return val[3];
      });
      partitions.exit().transition().duration(100).attr("fill-opacity", 0).remove();
    }
    return cv;
  }
  var science = {
    stats: {}
  };
  science.ascending = function(a, b) {
    return a - b;
  };
  science.EULER = .5772156649015329;
  science.expm1 = function(x) {
    return x < 1e-5 && x > -1e-5 ? x + .5 * x * x : Math.exp(x) - 1;
  };
  science.functor = function(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  };
  science.stats.kernel = {
    uniform: function(u) {
      if (u <= 1 && u >= -1) return .5;
      return 0;
    },
    triangular: function(u) {
      if (u <= 1 && u >= -1) return 1 - Math.abs(u);
      return 0;
    },
    epanechnikov: function(u) {
      if (u <= 1 && u >= -1) return .75 * (1 - u * u);
      return 0;
    },
    quartic: function(u) {
      if (u <= 1 && u >= -1) {
        var tmp = 1 - u * u;
        return 15 / 16 * tmp * tmp;
      }
      return 0;
    },
    triweight: function(u) {
      if (u <= 1 && u >= -1) {
        var tmp = 1 - u * u;
        return 35 / 32 * tmp * tmp * tmp;
      }
      return 0;
    },
    gaussian: function(u) {
      return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-.5 * u * u);
    },
    cosine: function(u) {
      if (u <= 1 && u >= -1) return Math.PI / 4 * Math.cos(Math.PI / 2 * u);
      return 0;
    }
  };
  science.stats.mean = function(x) {
    var n = x.length;
    if (n === 0) return NaN;
    var m = 0, i = -1;
    while (++i < n) m += (x[i] - m) / (i + 1);
    return m;
  };
  science.stats.variance = function(x) {
    var n = x.length;
    if (n < 1) return NaN;
    if (n === 1) return 0;
    var mean = science.stats.mean(x), i = -1, s = 0;
    while (++i < n) {
      var v = x[i] - mean;
      s += v * v;
    }
    return s / (n - 1);
  };
  science.stats.quantiles = function(d, quantiles) {
    d = d.slice().sort(science.ascending);
    var n_1 = d.length - 1;
    return quantiles.map(function(q) {
      if (q === 0) return d[0]; else if (q === 1) return d[n_1];
      var index = 1 + q * n_1, lo = Math.floor(index), h = index - lo, a = d[lo - 1];
      return h === 0 ? a : a + h * (d[lo] - a);
    });
  };
  science.stats.iqr = function(x) {
    var quartiles = science.stats.quantiles(x, [ .25, .75 ]);
    return quartiles[1] - quartiles[0];
  };
  science.stats.bandwidth = {
    nrd0: function(x) {
      var hi = Math.sqrt(science.stats.variance(x));
      var lo;
      if (!(lo = Math.min(hi, science.stats.iqr(x) / 1.34))) (lo = hi) || (lo = Math.abs(x[1])) || (lo = 1);
      return .9 * lo * Math.pow(x.length, -.2);
    },
    nrd: function(x) {
      var h = science.stats.iqr(x) / 1.34;
      return 1.06 * Math.min(Math.sqrt(science.stats.variance(x)), h) * Math.pow(x.length, -1 / 5);
    }
  };
  science.stats.kde = function() {
    var kernel = science.stats.kernel.gaussian, sample = [], bandwidth = science.stats.bandwidth.nrd;
    function kde(points, i) {
      var bw = bandwidth.call(this, sample);
      return points.map(function(x) {
        var i = -1, y = 0, n = sample.length;
        while (++i < n) {
          y += kernel((x - sample[i]) / bw);
        }
        return [ x, y / bw / n ];
      });
    }
    kde.kernel = function(x) {
      if (!arguments.length) return kernel;
      kernel = x;
      return kde;
    };
    kde.sample = function(x) {
      if (!arguments.length) return sample;
      sample = x;
      return kde;
    };
    kde.bandwidth = function(x) {
      if (!arguments.length) return bandwidth;
      bandwidth = science.functor(x);
      return kde;
    };
    return kde;
  };
  carve.version = "0.1.7";
  return carve;
});