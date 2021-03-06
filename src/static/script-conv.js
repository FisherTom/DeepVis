function gen_graph(data) {

  var weightType = "abs"; // abs or raw

  function reset() {
    d3.selectAll("svg").remove();
  }

  reset();

  d3.select("#weightThreshold").on("input", function() {
    update(document.getElementById("weightThreshold").value);
    document.getElementById("weightThresholdValue").innerHTML = " " +
      document.getElementById(
        "weightThreshold").value;
  });

  var width = 1275,
    height = 660;

  var svg = d3.select(".canvas").append("svg")
    .attr("width", width)
    .attr("height", height);

  var force = d3.layout.force()
    .charge(function(d) {
      var charge = -100;
      if (d.index === 0) charge = 10 * charge;
      return charge;
    })
    .linkDistance(30)
    .size([width, height]);

  var color = d3.scale.category20();

  graph = JSON.parse(data.struct)

  force.nodes(graph.nodes)
    .links(graph.links)
    .start();

  var classopacity = d3.scale.linear().domain([Math.min.apply(null, data.convdata
      .log_certainty), Math.max.apply(null, data.convdata
      .log_certainty)])
    .range([0.0, 1.0]);

  function getOpacity(value, min, max) {
    return d3.scale.linear().domain([min, max])
      .range([0.00, 1.00])(value);
  }

  var link = svg.selectAll(".link")
    .data(graph.links)
    .enter().append("line")
    .attr("class", "link")
    .attr("stroke-width", function(d) {
      return 5;
    })
    .attr("stroke", "orangered");

  var node = svg.selectAll(".node")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", function(d) {
      var image_ref = d.name.split("_");
      if (image_ref[0] < 5) {
        return "node-image";
      } else {
        return "node-decision";
      }
    })
    .call(force.drag)
    .on('click', nodeClick)
    .on('dblclick', connectedNodes);

  function thresholdValue(value, threshold) {
    if (threshold <= value) {
      return value;
    } else {
      return 0.1;
    }
  }

  function assignValues() {
    var allPaths = [];
    var path = [];
    var currentPath = new Set();

    function get_adj_vert(links, link) {
      var adjacent = []
      for (var i = 0; i < links.length; i++) {
        if (links[i].source == link) {
          adjacent.push(links[i].target);
        }
      }
      return adjacent;
    }

    function getPaths(links, startIndex, endIndex) {
      path.push(startIndex);
      currentPath.add(startIndex);
      if (startIndex === endIndex) {
        var array_copy = path.slice();
        allPaths.push(array_copy);
      } else {
        var adjacent = get_adj_vert(links, startIndex);
        for (var i = 0; i < adjacent.length; i++) {
          var temp_node = adjacent[i];
          if (!currentPath.has(temp_node)) {
            getPaths(links, temp_node, endIndex);
          }
        }
      }
      path.pop();
      currentPath.delete(startIndex);
    }

    var all_links = svg.selectAll(".link")[0];

    getPaths(JSON.parse(data.struct).links, 0, 193);

    var weights = data.weightdata.fc1[weightType];
    var pathValue = [];

    for (var i = 0; i < allPaths.length; i++) {
      pathValue.push(weights[all_links[allPaths[i][4]].__data__.source.name.split(
        "_")[1]]);
    }

    function getOtherWalks(index) {
      var indexes = [];
      for (var i = 0; i < allPaths.length; i++) {
        if (allPaths[i].includes(index)) {
          indexes.push(i);
        }
      }
      return indexes;
    }

    console.log(pathValue);

    svg.selectAll(".link").attr("weight", function(d) {
      var sourceName = d.source.name;
      var sourceIndex = d.source.index;
      var targetName = d.target.name;
      var targetIndex = d.target.index;
      if (sourceName.split("_")[0] == 4) {
        return getOpacity(weights[sourceName.split("_")[1]],
          Math.min.apply(null, weights), Math.max.apply(null, weights)
        );
      } else if (targetName.split("_")[0] == 6) {
        return 1;
      } else if (targetName.split("_")[0] == 7) {
        return classopacity(data.convdata.log_certainty[
          parseInt(targetName.split("_")[1])]);
      }
    });
  }

  function assignValues1() {
    var weights = data.weightdata.fc1[weightType];
    links = svg.selectAll(".link")[0];
    var magic_array_values = [];
    var magic_array_indices = [];
    for (i = 0; i < links.length; i++) {
      d = links[i];
      var d_data = links[i].__data__;
      var source = d_data.source.name.split("_");
      var target = d_data.target.name.split("_");
      if (parseInt(source[0]) == 2) {
        var op = getOpacity(weights[parseInt(target[1])],
          Math.min.apply(null, weights), Math.max.apply(null, weights)
        );
        magic_array_values.push(op);
        magic_array_indices.push(source[1]);
        d.setAttribute("weight", op);
      }
    }
    more_links = svg.selectAll(".link")[0];
    for (i = 0; i < links.length; i++) {
      d = links[i];
      var d_data = links[i].__data__;
      var source = d_data.source.name.split("_");
      var target = d_data.target.name.split("_");
      if (source[0] == 0) {
        var largest = 0;
        for (j = 0; j < magic_array_values.length; j++) {
          if (parseInt(magic_array_indices[j]) == parseInt(target[1])) {
            if (parseFloat(magic_array_values[j]) > parseFloat(largest)) {
              largest = parseFloat(magic_array_values[j]);
            }
          }
        }
        d.setAttribute("weight", largest);
      } else if (source[0] == 1) {
        var largest = 0;
        for (j = 0; j < magic_array_values.length; j++) {
          if (parseInt(magic_array_indices[j]) == parseInt(source[1])) {
            if (parseFloat(magic_array_values[j]) > parseFloat(largest)) {
              largest = parseFloat(magic_array_values[j]);
            }
          }
        }
        d.setAttribute("weight", largest);
      } else if (parseInt(source[0]) == 3) {
        d.setAttribute("weight", getOpacity(weights[parseInt(source[1])],
          Math.min.apply(null, weights), Math.max.apply(null, weights)
        ));
      } else if (source[0] == 4) {
        d.setAttribute("weight", getOpacity(weights[parseInt(source[1])],
          Math.min.apply(null, weights), Math.max.apply(null, weights)
        ));
      } else if (source[0] == 5) {
        d.setAttribute("weight", 1);
      } else if (target[0] == 7) {
        d.setAttribute("weight", classopacity(data.convdata.log_certainty[
          parseInt(target[1])]));
      }
    }
  }

  assignValues1();
  update(0.5);

  // fully connected layer should flow back to conv layer

  function update(val) {
    d3.select("#weightThresholdValue").text(" " + val);
    d3.select("#weightThreshold").property("value", val);
    d3.selectAll(".link").attr("opacity", function(d) {
      return thresholdValue(parseFloat(d3.select(this).attr("weight")),
        val)
    });
  }

  function getIndexesAndValues(data) {
    var images = [];
    for (i = 0; i < data.length; i++) {
      var indexes = [];
      var values = [];
      for (j = 0; j < data[i].length; j++) {
        read_index = data[i][j][1];
        read_value = data[i][j][0];
        indexes.push(read_index);
        values.push(read_value);
      }
      images.push([indexes, values]);
    }
    return images;
  }

  var image = d3.selectAll(".node-image")
    .append("image")
    .attr("x", -8)
    .attr("y", -8)
    .attr("id", function(d) {
      return "image_" + d.name;
    })
    .call(populateNodes);

  var decisionNode = d3.selectAll(".node-decision")
    .append("circle")
    .attr("class", "circle-node")
    .attr("r", function(d) {
      var image_ref = d.name.split("_");
      if (parseInt(image_ref[0]) < 7) {
        return 2;
      } else {
        var val = data.convdata.log_certainty[parseInt(image_ref[1])] *
          25
        if (val < 2) {
          return 2;
        } else {
          return val;
        }
      }
    })
    .attr("fill", function(d) {
      var image_ref = d.name.split("_");
      if (image_ref[1] == data.convdata.prediction) {
        return 'yellow';
      } else {
        return 'orange';
      }
    })
    .style("stroke", function(d) {
      var image_ref = d.name.split("_");
      if (image_ref[1] == data.label) {
        return 'MediumVioletRed ';
      } else {
        return 'orangered';
      }
    });

  var decisionLabel = d3.selectAll(".node-decision")
    .append("text")
    .attr("dx", 20)
    .attr("dy", ".35em")
    .text(function(d) {
      var name = d.name.split("_");
      if (name[0] == "7") {
        return data.actual_class_labels[name[1]];
      }
    })
    .style("text-decoration", function(d) {
      var name = d.name.split("_");
      if (name[1] == data.label) {
        return "underline";
      }
    });

  force.on("tick", function() {
    link.attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    node.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
  });

  var toggle = 0;

  var linkedByIndex = {};
  for (i = 0; i < graph.nodes.length; i++) {
    linkedByIndex[i + "," + i] = 1;
  };
  graph.links.forEach(function(d) {
    linkedByIndex[d.source.index + "," + d.target.index] = 1;
  });


  function toImage(data, node) {
    var buffer = new Uint8ClampedArray(data);

    var width = Math.sqrt(data.length / 4),
      height = Math.sqrt(data.length / 4);

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    var idata = ctx.createImageData(width, height);
    idata.data.set(buffer);
    ctx.putImageData(idata, 0, 0);

    //set image created by canvas to image element.
    var image = document.getElementById("image_" + node.__data__.name);
    image.width.baseVal.value = width;
    image.height.baseVal.value = height;
    image.href.baseVal = canvas.toDataURL();
  }

  function populateNodes() {
    var nodes = d3.selectAll("image")[0];
    for (i = 0; i < nodes.length; i++) {
      var image_ref = nodes[i].__data__.name.split("_");
      if (parseInt(image_ref[0]) < 5) {
        var raw = data.convdata.features[(parseInt(image_ref[0]) + 1)][
          image_ref[1]
        ]["feature_" + parseInt(image_ref[1])];
        toImage(raw, nodes[i]);
      }
    }
  }

  function neighboring(a, b) {
    return linkedByIndex[a.index + "," + b.index];
  }

  function connectedNodes() {
    if (toggle == 0) {
      d3.select(this).fixed = true;
      d = d3.select(this).node().__data__;
      node.attr("opacity", function(o) {
        return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
      });
      link.attr("opacity", function(o) {
        return d.index == o.source.index | d.index == o.target.index ?
          1 :
          0.1;
      });
      toggle = 1;
    } else {
      node.attr("opacity", 1);
      update(document.getElementById("weightThreshold").value);
      toggle = 0;
    }
  }

  function nodeClick() {

    var image_ref = d3.select(this)[0][0].__data__.name.split("_");

    var raw = data.convdata.features[(parseInt(image_ref[0]) + 1)][
        image_ref[
          1]
      ]
      ["feature_" + parseInt(image_ref[1])];

    var buffer = new Uint8ClampedArray(raw);

    var width = Math.sqrt(raw.length / 4),
      height = Math.sqrt(raw.length / 4);

    var canvas = document.getElementById('image'),
      ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    var idata = ctx.createImageData(width, height);
    idata.data.set(buffer);
    ctx.putImageData(idata, 0, 0);

    document.getElementById("image-dimensions").innerHTML = height + "x" +
      width;

  }

  force.start();


}
