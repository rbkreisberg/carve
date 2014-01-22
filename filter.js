//filter.js  a wrapper for crossfilter to work with carve.  requires crossfilter

var filter = (function() {

return function() {
        'use strict';

    if (window.crossfilter === undefined) {
        console.error("crossfilter.js is not detected")
        return;
    }

    var cf_obj,
           all,
         filter = {},
         group = {};

    var crossfilter = window.crossfilter;

//class values that should be sorted to the bottom of a list.
    var NA = ['NA','N/A'],
        Other = ['OTHER'],
        //trueV = ['TRUE','T'],  //only added for readability
        falseV = ['FALSE','F'];

    function classSort(a,b) {
        var A = String(a).toUpperCase(),
            B = String(b).toUpperCase();

            if ( !!~NA.indexOf(A) ) return 1;
            else if ( !!~NA.indexOf(B) ) return -1;
            else if ( !!~Other.indexOf(A) ) return 1;
            else if ( !!~Other.indexOf(B) ) return -1;
            else if ( !!~falseV.indexOf(A) ) return 1;
            else if ( !!~falseV.indexOf(B) ) return -1;

            return A >= B;
    }

    function sortOnAttr(key) {
        return function(a,b) {
            var A = a[key],
                B = b[key];
                return classSort(A,B);
        };
    }

    //crossfilter unfortunately kicks out an attribute with the name "key"
    var sortKey = sortOnAttr('key');

        var Filter = function(data) {
             cf_obj = crossfilter(data);
                all = cf_obj.groupAll();
                return Filter;
            };

            Filter.currentSize = function() {
                return cf_obj.size();
            };

            Filter.totalSize = function() {
                return all.value();
            };

            Filter.columns = function() {
                return Object.keys(filter);
            };

            Filter.has = function(label) {
                if ( filter[ label ] === undefined ) return false;
                return true;
            };

            Filter.addColumn = function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                if (Filter.has(label)) return Filter;
                filter[label] = cf_obj.dimension( function (d) { return d[property]; });
                return Filter;
            };

            Filter.addGroup = function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                if ( !Filter.has( label ) ) Filter.addColumn(label, property);
                if ( group[label] !== undefined ) return Filter;
                group[label] = filter[label].group().reduceCount();
                return Filter;
            };

            Filter.filterColumn = function( label , range ) {
                if ( !Filter.has(label) ) Filter.addColumn( label );
                if ( range.length != 2 || !(_.all(range,_.isNumber))  ) { 
                    // a set of categorical values
                    filter[label].filterFunction( function (val) { return _.contains(range, val ); } );
                } else { 
                    // a low, high pair
                     filter[label].filterRange( _.map([range[0], range[1]], parseFloat) );
                }
                return Filter;
            };

            Filter.resetFilter = function ( label ) {
                filter[label].filter(null);
                return Filter;
            };

            Filter.getGroupEntries = function( label, sorted) {
                if ( group[label] === undefined ) return [];
                sorted = ( sorted === undefined ) ? true : sorted;
                if ( sorted ) return group[label].top( Infinity ).sort(sortKey);
                return group[label].top( Infinity ).sort(sortKey);
            };

            Filter.getGroupLabels = function( label, sorted) {
                if ( group[label] === undefined ) return [];
                sorted = ( sorted === undefined ) ? true : sorted;
                if ( sorted ) return _.pluck( group[label].top( Infinity ), 'key' ).sort(classSort);
                return _.pluck( group[label].top( Infinity ), 'key' );
            };

            Filter.getNormalizedGroupEntries = function(label, sorted) {
                var entries = Filter.getGroupEntries.apply(this, arguments);
                if ( entries.length === 0 ) { return []; }
                
            };

            Filter.getRows = function( label, num ) {
                if (arguments.length < 2) num = Infinity;
                if (arguments.length < 1) label = Object.keys(filter)[0];
                return filter[label].top(num);
            };

        return Filter;
        };
})();