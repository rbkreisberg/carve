2/7/2014
v0.1.0

Updates:
- width and height must be specified when carve is initialized as of now.
- simplied svg layout.  next version will have optional canvas element rendering for large datasets
- axis labels and split panels fit within padding + margin of plot
- y-axis tick labels are on the left side.  margin.left must accomodate the max length of these labels.
- split value labels now draw inside of the plot lightly.
- split panels/bars are thinner and hug the plot.

Todo:
- canvas rendering of large datasets
- 2d KDE plot of data when there is a lot of overdraw
- smarter tick formatting logic (no decimal points, fewest significant digits, etc)
- specify data point shape (circle, square, triangle..)
- autodetect parent element's height/width when possible.
- document API, events, css styling

v0.1.3
Updates:
- Bar charts render as a single rectangle

3/3/2014
v0.1.4
Updates:
- (carve).clear() wipes the plot away
- (carve).render() takes an optional callback function as a parameter.  the function is passed an <error> object that takes the form {error: true/false}

Todo
- canvas rendering of large datasets
- 2d KDE plot of data when there is a lot of overdraw
- smarter tick formatting logic (no decimal points, fewest significant digits, etc)
- specify data point shape (circle, square, triangle..)
- autodetect parent element's height/width when possible.
- document API, events, css styling
