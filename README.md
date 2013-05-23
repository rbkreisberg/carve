carve
=====

A flexible 2.5 dimension distribution plot.  Let users carve the data!

# What is carve? 

Carve is a web-based visualization for diving into high dimensional data.  It is built on top of [d3](http://d3js.org/), [underscore](http://underscorejs.org/) and [sciencejs](https://github.com/jasondavies/science.js/). Applications can leverage [crossfilter](https://github.com/square/crossfilter) to quickly filter, sort, and group datasets based on events from carve, along with other interfaces.

Carve accepts numerical and categorical data.  Based on the types of data, it displays the distribution of data in one of three ways:

*Numerical vs. Numerical Scatterplot*



*Numerical vs Categorical*

A one dimensional Kernel Density Estimate (KDE) is displayed for each categorical value.

*Categorical vs. Categorical*

A table of bar charts displays the relative distribution of the pairs of categorical values.

# What Else?

*Color* There is also the ability to color the data by a third dimension of the dataset.  The dimension must be a categorical feature (right now).  

*Highlight* The visualization can be told to highlight one of the values of the colored dimension (useful for external interfaces).

*Carving tools* Those panels above and to the left of the data plot allow the user to make precise cuts in one or two dimensions.  Cutting numerical data simply means locking a split in at a precision position by clicking on the panel.  Cutting categorical data is done by toggling values to create the desired split.

# Say What?

Check out a demonstration of carve: [Splitiscope](https://github.com/rbkreisberg/splitiscope)

# Use It!

Carve can be used as a global variable called 'carve' or as an AMD module using requirejs.  You can use multiple carves in the same page.

```javascript
var data = [

            { id: "Sparky", height : 10, weight : 14,  breed : "dachsund" },
            { id: "Lucy", height : 24, weight : 64,  breed : "retriever" },
            { id: "Chewbaca", height : 33, weight : 180, breed : "great dane" },
            { id: "Belle", height : 20, weight : 27,  breed : "whippet" },
            { id: "Crowe", height : 28, weight : 95,  breed : "ridgeback" },
            { id: "Chico", height : 7,  weight : 6,  breed : "chihuahua" },
            { id: "Katie", height : 32,  weight : 225,  breed : "mastiff" },
            { id: "Hamish", height : 27,  weight : 50,  breed : "saluki" }
]

var carve_obj = carve({
            radius : 20,
            margin : { top: 15, bottom: 20, left: 15, right: 50 }
        });
var carve_vis = carve_obj("#plot");

 carve_vis
        .colorBy({
            label : "breed",
            list : _.pluck(data, "breed")
        })
        .axisLabel({ x : "Weight (lbs)", y : "Height (in)" })
        .axisKey({ x : "weight", y : "height" })
        .data(data)
        .render();
```
<!-- 
    resources:
https://dl.dropboxusercontent.com/s/z0hyis11d003z80/carve.js
https://dl.dropboxusercontent.com/s/mjqt4svrh5mjbwv/carve.css
https://dl.dropboxusercontent.com/s/4xocll72aguws99/d3.js
https://dl.dropboxusercontent.com/s/hj6nj1d25ltax2m/science.v1.js -->

Check this out on JSFiddle: [demo](http://jsfiddle.net/rbkreisberg/bJnGL/)