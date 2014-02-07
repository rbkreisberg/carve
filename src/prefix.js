/*
Carve.js
Dick Kreisberg 
March 2013
MIT License

some code taken from 
https://github.com/syntagmatic/parallel-coordinates
Copyright (c) 2012, Kai Chang
*/

(function (root, factory) {
   if (typeof exports === 'object' && root.require) {
     module.exports = factory(require("underscore"), require("d3"));
   } else if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(["underscore","d3"], function(_, d3) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, d3 || root.d3);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and d3 are loaded in <script> tags
      factory(_, d3);
   }
}(this, function(_, d3) {